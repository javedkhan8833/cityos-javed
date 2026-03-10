import frappe
import json
import os
import requests
import threading
from frappe.utils import now_datetime

from cityos.integrations.temporal_sync import get_temporal_config, WORKFLOW_METADATA


def _get_registry_url():
    config = get_temporal_config()
    base_url = config.get("registry_base_url", "")
    if not base_url:
        base_url = os.environ.get("WORKFLOW_REGISTRY_BASE_URL") or frappe.conf.get("workflow_registry_base_url", "")
    return base_url.rstrip("/") if base_url else ""


def discover_workflows(system_id=None):
    base_url = _get_registry_url()
    if not base_url:
        frappe.logger("cityos").info("Workflow registry URL not configured, skipping discovery")
        return []

    config = get_temporal_config()
    sid = system_id or config["system_id"]

    try:
        response = requests.get(
            f"{base_url}/api/workflow-registry",
            params={"system": sid},
            headers={"Content-Type": "application/json"},
            timeout=30,
        )

        if response.status_code != 200:
            frappe.log_error(
                f"Workflow registry discovery failed: HTTP {response.status_code} - {response.text[:500]}",
                "CityOS Workflow Discovery",
            )
            return []

        workflows = response.json()

        _cache_discovered_workflows(workflows)

        frappe.logger("cityos").info(
            f"Discovered {len(workflows)} workflow(s) for system '{sid}'"
        )
        return workflows

    except requests.exceptions.ConnectionError:
        frappe.logger("cityos").warning(
            f"Workflow registry unreachable at {base_url}, will retry later"
        )
        return []
    except requests.exceptions.Timeout:
        frappe.logger("cityos").warning("Workflow registry request timed out")
        return []
    except Exception as e:
        frappe.log_error(
            f"Workflow discovery error: {str(e)}",
            "CityOS Workflow Discovery",
        )
        return []


def register_workflows():
    base_url = _get_registry_url()
    if not base_url:
        frappe.logger("cityos").info("Workflow registry URL not configured, skipping registration")
        return {"registered": 0, "failed": 0, "skipped": 0}

    config = get_temporal_config()
    results = {"registered": 0, "failed": 0, "skipped": 0}

    for workflow_type, metadata in WORKFLOW_METADATA.items():
        try:
            registration_payload = {
                "workflowType": workflow_type,
                "displayName": metadata["displayName"],
                "description": metadata["description"],
                "domainPack": metadata["domainPack"],
                "sourceSystem": config["system_id"],
                "taskQueues": metadata["taskQueues"],
                "tags": metadata["tags"],
            }

            response = requests.post(
                f"{base_url}/api/workflow-registry",
                json=registration_payload,
                headers={"Content-Type": "application/json"},
                timeout=30,
            )

            if response.status_code in (200, 201):
                results["registered"] += 1
                frappe.logger("cityos").info(
                    f"Registered workflow '{workflow_type}' in registry"
                )
            elif response.status_code == 409:
                results["skipped"] += 1
                frappe.logger("cityos").info(
                    f"Workflow '{workflow_type}' already registered (409 conflict)"
                )
            else:
                results["failed"] += 1
                frappe.log_error(
                    f"Failed to register workflow '{workflow_type}': HTTP {response.status_code} - {response.text[:500]}",
                    "CityOS Workflow Registration",
                )
        except requests.exceptions.ConnectionError:
            results["failed"] += 1
            frappe.logger("cityos").warning(
                f"Registry unreachable when registering '{workflow_type}'"
            )
        except Exception as e:
            results["failed"] += 1
            frappe.log_error(
                f"Registration error for '{workflow_type}': {str(e)}",
                "CityOS Workflow Registration",
            )

    frappe.logger("cityos").info(
        f"Workflow registration complete: {results['registered']} registered, "
        f"{results['skipped']} skipped, {results['failed']} failed"
    )
    return results


def fetch_queue_system_map():
    base_url = _get_registry_url()
    if not base_url:
        return None

    try:
        response = requests.get(
            f"{base_url}/api/queue-system-map",
            headers={"Content-Type": "application/json"},
            timeout=30,
        )

        if response.status_code == 200:
            data = response.json()
            frappe.cache.set_value("cityos_queue_system_map", json.dumps(data), expires_in_sec=3600)
            return data
        return None
    except Exception as e:
        frappe.log_error(f"Queue system map fetch error: {str(e)}", "CityOS Workflow Discovery")
        return None


def _cache_discovered_workflows(workflows):
    try:
        cache_data = {
            "workflows": workflows,
            "discovered_at": now_datetime().isoformat(),
            "count": len(workflows),
        }
        frappe.cache.set_value(
            "cityos_discovered_workflows",
            json.dumps(cache_data, default=str),
            expires_in_sec=3600,
        )
    except Exception:
        pass


def get_cached_workflows():
    try:
        cached = frappe.cache.get_value("cityos_discovered_workflows")
        if cached:
            return json.loads(cached)
    except Exception:
        pass
    return None


def run_discovery_and_registration():
    config = get_temporal_config()
    base_url = config.get("registry_base_url", "")

    if not base_url:
        frappe.logger("cityos").info(
            "Workflow registry URL not configured. "
            "Set 'workflow_registry_base_url' in site_config.json to enable workflow discovery."
        )
        return

    frappe.logger("cityos").info("Starting workflow discovery and registration cycle")

    discovered = discover_workflows()
    frappe.logger("cityos").info(f"Discovery found {len(discovered)} workflows")

    registration_result = register_workflows()
    frappe.logger("cityos").info(f"Registration result: {registration_result}")

    queue_map = fetch_queue_system_map()
    if queue_map:
        frappe.logger("cityos").info("Queue-system map refreshed")

    _log_cross_system_dependencies(discovered)


def _log_cross_system_dependencies(workflows):
    if not workflows:
        return

    config = get_temporal_config()
    system_id = config["system_id"]

    for wf in workflows:
        tags = wf.get("tags", [])
        connected_systems = [
            tag.replace("system:", "")
            for tag in tags
            if tag.startswith("system:") and tag != f"system:{system_id}"
        ]

        if connected_systems:
            frappe.logger("cityos").info(
                f"Workflow '{wf.get('workflowType', 'unknown')}' spans systems: "
                f"{', '.join(connected_systems)}"
            )


_sse_thread = None
_sse_stop_event = threading.Event()


def start_sse_listener():
    global _sse_thread, _sse_stop_event

    base_url = _get_registry_url()
    if not base_url:
        return

    if _sse_thread and _sse_thread.is_alive():
        return

    _sse_stop_event.clear()
    _sse_thread = threading.Thread(
        target=_sse_listener_loop,
        args=(base_url, _sse_stop_event),
        daemon=True,
        name="cityos-registry-sse",
    )
    _sse_thread.start()
    frappe.logger("cityos").info("SSE registry listener started")


def stop_sse_listener():
    global _sse_stop_event
    _sse_stop_event.set()
    frappe.logger("cityos").info("SSE registry listener stop requested")


def _sse_listener_loop(base_url, stop_event):
    import time

    backoff = 5
    max_backoff = 300

    while not stop_event.is_set():
        try:
            response = requests.get(
                f"{base_url}/api/sse",
                headers={"Accept": "text/event-stream", "Cache-Control": "no-cache"},
                stream=True,
                timeout=(10, None),
            )

            if response.status_code != 200:
                frappe.logger("cityos").warning(
                    f"SSE connection failed: HTTP {response.status_code}"
                )
                time.sleep(backoff)
                backoff = min(backoff * 2, max_backoff)
                continue

            backoff = 5
            frappe.logger("cityos").info("SSE connection established")

            event_type = None
            event_data = []

            for line in response.iter_lines(decode_unicode=True):
                if stop_event.is_set():
                    break

                if line is None:
                    continue

                line = line.strip() if isinstance(line, str) else line.decode("utf-8").strip()

                if not line:
                    if event_type == "workflow-registry-update" and event_data:
                        _handle_sse_registry_update("\n".join(event_data))
                    event_type = None
                    event_data = []
                    continue

                if line.startswith("event:"):
                    event_type = line[6:].strip()
                elif line.startswith("data:"):
                    event_data.append(line[5:].strip())

        except requests.exceptions.ConnectionError:
            frappe.logger("cityos").warning(
                f"SSE connection lost, reconnecting in {backoff}s"
            )
        except requests.exceptions.Timeout:
            frappe.logger("cityos").warning("SSE connection timed out, reconnecting")
        except Exception as e:
            frappe.logger("cityos").error(f"SSE listener error: {str(e)}")

        if not stop_event.is_set():
            stop_event.wait(timeout=backoff)
            backoff = min(backoff * 2, max_backoff)


def _handle_sse_registry_update(data_str):
    try:
        data = json.loads(data_str)
        frappe.logger("cityos").info(f"SSE registry update received: {data}")

        frappe.enqueue(
            "cityos.integrations.workflow_registry.discover_workflows",
            queue="short",
            is_async=True,
        )
    except json.JSONDecodeError:
        frappe.logger("cityos").warning(f"Invalid SSE data: {data_str[:200]}")
    except Exception as e:
        frappe.logger("cityos").error(f"SSE update handler error: {str(e)}")


def poll_registry_updates():
    base_url = _get_registry_url()
    if not base_url:
        return

    frappe.logger("cityos").info("Polling workflow registry for updates")
    discover_workflows()


def on_boot_discovery(login_manager=None, **kwargs):
    base_url = _get_registry_url()
    if not base_url:
        return

    try:
        frappe.enqueue(
            "cityos.integrations.workflow_registry.run_discovery_and_registration",
            queue="short",
            is_async=True,
            at_front=False,
        )
    except Exception:
        pass


@frappe.whitelist()
def get_workflow_registry_status():
    config = get_temporal_config()
    base_url = _get_registry_url()

    cached = get_cached_workflows()

    result = {
        "system_id": config["system_id"],
        "domain": config["domain"],
        "task_queues": config["task_queues"],
        "registry_url": base_url or "(not configured)",
        "registered_workflow_types": list(WORKFLOW_METADATA.keys()),
        "cached_discovery": {
            "available": cached is not None,
            "workflow_count": cached.get("count", 0) if cached else 0,
            "discovered_at": cached.get("discovered_at") if cached else None,
        },
        "sse_listener_active": _sse_thread is not None and _sse_thread.is_alive() if _sse_thread else False,
    }

    return result


@frappe.whitelist()
def trigger_discovery():
    frappe.enqueue(
        "cityos.integrations.workflow_registry.run_discovery_and_registration",
        queue="short",
        is_async=True,
    )
    return {"status": "enqueued", "message": "Workflow discovery and registration triggered"}
