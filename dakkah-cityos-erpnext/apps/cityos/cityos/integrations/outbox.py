import frappe
import json
import os
import requests
from frappe.utils import now_datetime, add_to_date


def publish_pending_events():
    now = now_datetime()

    pending_events = frappe.get_all(
        "Integration Outbox Event",
        filters={
            "status": "Pending",
            "retry_count": ["<", 5],
        },
        fields=["name", "event_type", "target_system", "event_payload", "retry_count", "priority"],
        order_by="priority desc, creation asc",
        limit=50,
    )

    failed_ready = frappe.get_all(
        "Integration Outbox Event",
        filters={
            "status": "Failed",
            "retry_count": ["<", 5],
            "next_retry_at": ["<=", now],
        },
        fields=["name", "event_type", "target_system", "event_payload", "retry_count", "priority"],
        order_by="priority desc, creation asc",
        limit=50,
    )

    seen = {e.name for e in pending_events}
    events = list(pending_events)
    for e in failed_ready:
        if e.name not in seen:
            events.append(e)

    for event in events:
        try:
            frappe.db.set_value(
                "Integration Outbox Event", event.name,
                {"status": "Processing", "last_attempt": now_datetime()},
            )
            frappe.db.commit()

            _dispatch_event(event)

            frappe.db.set_value(
                "Integration Outbox Event", event.name,
                {"status": "Published"},
            )
            frappe.db.commit()

        except Exception as e:
            retry_count = event.retry_count + 1
            new_status = "Dead Letter" if retry_count >= 5 else "Failed"
            next_retry = add_to_date(now_datetime(), minutes=2 ** retry_count)

            frappe.db.set_value(
                "Integration Outbox Event", event.name,
                {
                    "status": new_status,
                    "retry_count": retry_count,
                    "error_message": str(e),
                    "next_retry_at": next_retry,
                },
            )
            frappe.db.commit()
            frappe.log_error(f"Outbox Event {event.name} failed: {str(e)}")


def _dispatch_event(event):
    target = event.target_system
    payload = event.event_payload

    if isinstance(payload, str):
        try:
            payload = json.loads(payload)
        except (json.JSONDecodeError, TypeError):
            payload = {"raw": payload}

    dispatchers = {
        "Medusa Commerce": _dispatch_to_medusa,
        "Payload CMS": _dispatch_to_payload,
        "Temporal Workflow": _dispatch_to_temporal,
    }

    dispatcher = dispatchers.get(target)
    if dispatcher:
        dispatcher(event.event_type, payload)
    elif target == "All":
        for dispatch_fn in dispatchers.values():
            try:
                dispatch_fn(event.event_type, payload)
            except Exception as e:
                frappe.log_error(f"Dispatch to {target} failed: {str(e)}")


def _dispatch_to_medusa(event_type, payload):
    api_url = os.environ.get("MEDUSA_BACKEND_URL_DEV") or os.environ.get("MEDUSA_BACKEND_URL_LOCAL") or frappe.conf.get("medusa_api_url", "")
    api_key = os.environ.get("MEDUSA_API_KEY") or frappe.conf.get("medusa_api_key", "")

    if not api_url:
        return

    endpoint = f"{api_url}/admin/webhooks/erpnext"

    response = requests.post(
        endpoint,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "event": event_type,
            "data": payload,
            "source": "erpnext",
            "timestamp": now_datetime().isoformat(),
        },
        timeout=30,
    )

    if response.status_code not in (200, 201, 202):
        raise Exception(f"Medusa dispatch failed: {response.status_code} {response.text[:200]}")


def _dispatch_to_payload(event_type, payload):
    api_url = os.environ.get("PAYLOAD_CMS_URL_DEV") or os.environ.get("PAYLOAD_CMS_URL_LOCAL") or frappe.conf.get("payload_api_url", "")
    api_key = os.environ.get("CITYOS_CMS_API_KEY") or frappe.conf.get("payload_api_key", "")

    if not api_url:
        return

    endpoint = f"{api_url}/api/webhooks/erpnext"

    response = requests.post(
        endpoint,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "event": event_type,
            "data": payload,
            "source": "erpnext",
            "timestamp": now_datetime().isoformat(),
        },
        timeout=30,
    )

    if response.status_code not in (200, 201, 202):
        raise Exception(f"Payload dispatch failed: {response.status_code} {response.text[:200]}")


def _dispatch_to_temporal(event_type, payload):
    temporal_url = os.environ.get("TEMPORAL_ENDPOINT") or frappe.conf.get("temporal_api_url", "")

    if not temporal_url:
        return

    endpoint = f"{temporal_url}/api/v1/workflows"

    response = requests.post(
        endpoint,
        headers={
            "Content-Type": "application/json",
        },
        json={
            "workflow_type": payload.get("workflow_type", event_type),
            "task_queue": payload.get("task_queue", "cityos-erp"),
            "input": payload,
            "source": "erpnext",
        },
        timeout=30,
    )

    if response.status_code not in (200, 201, 202):
        raise Exception(f"Temporal dispatch failed: {response.status_code} {response.text[:200]}")
