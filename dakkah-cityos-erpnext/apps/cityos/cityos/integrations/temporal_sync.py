import frappe
import json
import os
from frappe.utils import now_datetime


WORKFLOW_METADATA = {
    "approval_chain": {
        "displayName": "Approval Chain",
        "description": "General document approval/rejection workflow for CityOS governance",
        "domainPack": "xsystem",
        "taskQueues": ["xsystem-platform-queue"],
        "tags": ["system:erpnext", "domain:xsystem", "verification"],
    },
    "procurement_approval": {
        "displayName": "Procurement Approval",
        "description": "Procurement-specific approval workflow for purchase requests and orders",
        "domainPack": "xsystem",
        "taskQueues": ["xsystem-platform-queue"],
        "tags": ["system:erpnext", "domain:xsystem", "verification", "fulfillment"],
    },
    "invoice_settlement": {
        "displayName": "Invoice Settlement",
        "description": "Invoice settlement and payment reconciliation workflow",
        "domainPack": "xsystem",
        "taskQueues": ["xsystem-vertical-queue"],
        "tags": ["system:erpnext", "domain:xsystem", "sync"],
    },
    "vendor_onboarding": {
        "displayName": "Vendor Onboarding",
        "description": "End-to-end vendor onboarding and compliance verification workflow",
        "domainPack": "xsystem",
        "taskQueues": ["xsystem-platform-queue"],
        "tags": ["system:erpnext", "domain:xsystem", "onboarding", "verification"],
    },
    "budget_approval": {
        "displayName": "Budget Approval",
        "description": "Budget program authorization and fiscal allocation workflow",
        "domainPack": "xsystem",
        "taskQueues": ["xsystem-vertical-queue"],
        "tags": ["system:erpnext", "domain:xsystem", "verification"],
    },
}


def get_temporal_config():
    task_queue_str = os.environ.get("TEMPORAL_TASK_QUEUES", "")
    if task_queue_str:
        task_queues = [q.strip() for q in task_queue_str.split(",") if q.strip()]
    else:
        task_queues = frappe.conf.get("temporal_task_queues", ["xsystem-platform-queue", "xsystem-vertical-queue"])
    default_queue = os.environ.get("TEMPORAL_DEFAULT_TASK_QUEUE") or frappe.conf.get("temporal_default_task_queue", task_queues[0] if task_queues else "xsystem-platform-queue")

    if isinstance(task_queues, str):
        task_queues = [task_queues]

    return {
        "endpoint": os.environ.get("TEMPORAL_ENDPOINT") or frappe.conf.get("temporal_endpoint", "ap-northeast-1.aws.api.temporal.io:7233"),
        "namespace": os.environ.get("TEMPORAL_NAMESPACE") or frappe.conf.get("temporal_namespace", "quickstart-dakkah-cityos.djvai"),
        "task_queues": task_queues,
        "default_task_queue": default_queue,
        "task_queue": default_queue,
        "api_key": os.environ.get("TEMPORAL_API_KEY") or frappe.conf.get("temporal_api_key", ""),
        "system_id": os.environ.get("TEMPORAL_SYSTEM_ID") or frappe.conf.get("temporal_system_id", "erpnext"),
        "domain": os.environ.get("TEMPORAL_DOMAIN") or frappe.conf.get("temporal_domain", "xsystem"),
        "registry_base_url": os.environ.get("WORKFLOW_REGISTRY_BASE_URL") or frappe.conf.get("workflow_registry_base_url", ""),
    }


def get_queue_for_workflow(workflow_type):
    metadata = WORKFLOW_METADATA.get(workflow_type)
    if metadata and metadata.get("taskQueues"):
        return metadata["taskQueues"][0]
    config = get_temporal_config()
    return config["default_task_queue"]


async def get_temporal_client():
    try:
        from temporalio.client import Client
        from temporalio.service import TLSConfig
        config = get_temporal_config()

        if not config["api_key"]:
            frappe.log_error("TEMPORAL_API_KEY not set", "Temporal Connection")
            return None

        client = await Client.connect(
            config["endpoint"],
            namespace=config["namespace"],
            tls=TLSConfig(),
            rpc_metadata={"temporal-namespace": config["namespace"]},
            api_key=config["api_key"],
        )
        return client
    except ImportError:
        frappe.log_error("temporalio SDK not installed", "Temporal Connection")
        return None
    except Exception as e:
        frappe.log_error(f"Temporal connection failed: {str(e)}", "Temporal Connection")
        return None


async def start_temporal_workflow(workflow_type, workflow_id, task_queue=None, args=None):
    client = await get_temporal_client()
    if not client:
        return None

    queue = task_queue or get_queue_for_workflow(workflow_type)

    try:
        handle = await client.start_workflow(
            workflow_type,
            args or {},
            id=workflow_id,
            task_queue=queue,
        )
        return {
            "workflow_id": handle.id,
            "run_id": handle.result_run_id,
            "status": "started",
        }
    except Exception as e:
        frappe.log_error(f"Failed to start Temporal workflow: {str(e)}", "Temporal Workflow")
        return None


async def query_temporal_workflow(workflow_id, query_type="status"):
    client = await get_temporal_client()
    if not client:
        return None

    try:
        handle = client.get_workflow_handle(workflow_id)
        result = await handle.query(query_type)
        return result
    except Exception as e:
        frappe.log_error(f"Temporal query failed: {str(e)}", "Temporal Workflow")
        return None


async def signal_temporal_workflow(workflow_id, signal_name, data=None):
    client = await get_temporal_client()
    if not client:
        return None

    try:
        handle = client.get_workflow_handle(workflow_id)
        await handle.signal(signal_name, data)
        return {"status": "signaled", "workflow_id": workflow_id}
    except Exception as e:
        frappe.log_error(f"Temporal signal failed: {str(e)}", "Temporal Workflow")
        return None


async def cancel_temporal_workflow(workflow_id):
    client = await get_temporal_client()
    if not client:
        return None

    try:
        handle = client.get_workflow_handle(workflow_id)
        await handle.cancel()
        return {"status": "cancelled", "workflow_id": workflow_id}
    except Exception as e:
        frappe.log_error(f"Temporal cancel failed: {str(e)}", "Temporal Workflow")
        return None


async def describe_temporal_workflow(workflow_id):
    client = await get_temporal_client()
    if not client:
        return None

    try:
        handle = client.get_workflow_handle(workflow_id)
        desc = await handle.describe()
        return {
            "workflow_id": desc.id,
            "run_id": desc.run_id,
            "status": str(desc.status),
            "workflow_type": desc.workflow_type,
            "start_time": str(desc.start_time) if desc.start_time else None,
            "close_time": str(desc.close_time) if desc.close_time else None,
            "task_queue": desc.task_queue,
        }
    except Exception as e:
        frappe.log_error(f"Temporal describe failed: {str(e)}", "Temporal Workflow")
        return None


async def list_temporal_workflows(query=None, page_size=20):
    client = await get_temporal_client()
    if not client:
        return []

    try:
        workflows = []
        config = get_temporal_config()

        if not query:
            queue_filters = " OR ".join(
                f'TaskQueue="{q}"' for q in config["task_queues"]
            )
            q = f"({queue_filters})"
        else:
            q = query

        async for wf in client.list_workflows(query=q, page_size=page_size):
            workflows.append({
                "workflow_id": wf.id,
                "run_id": wf.run_id,
                "status": str(wf.status),
                "workflow_type": wf.workflow_type,
                "start_time": str(wf.start_time) if wf.start_time else None,
                "close_time": str(wf.close_time) if wf.close_time else None,
            })
            if len(workflows) >= page_size:
                break

        return workflows
    except Exception as e:
        frappe.log_error(f"Temporal list workflows failed: {str(e)}", "Temporal Workflow")
        return []


@frappe.whitelist()
def test_temporal_connection():
    import asyncio

    config = get_temporal_config()
    result = {
        "endpoint": config["endpoint"],
        "namespace": config["namespace"],
        "task_queues": config["task_queues"],
        "default_task_queue": config["default_task_queue"],
        "system_id": config["system_id"],
        "domain": config["domain"],
        "api_key_set": bool(config["api_key"]),
        "registry_configured": bool(config["registry_base_url"]),
    }

    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        async def _test():
            client = await get_temporal_client()
            if client:
                workflows = await list_temporal_workflows(page_size=5)
                return {
                    **result,
                    "status": "connected",
                    "recent_workflows": len(workflows),
                    "workflows": workflows[:5],
                    "registered_workflow_types": list(WORKFLOW_METADATA.keys()),
                }
            return {**result, "status": "disconnected"}

        return loop.run_until_complete(_test())
    except Exception as e:
        return {**result, "status": "error", "error": str(e)}


def handle_temporal_webhook(data):
    workflow_id = data.get("workflow_id", "")
    workflow_type = data.get("workflow_type", "")
    status = data.get("status", "")
    result = data.get("result", {})

    handlers = {
        "approval_chain": _handle_approval_result,
        "procurement_approval": _handle_procurement_approval,
        "invoice_settlement": _handle_invoice_settlement,
        "vendor_onboarding": _handle_vendor_onboarding,
        "budget_approval": _handle_budget_approval,
    }

    handler = handlers.get(workflow_type)
    if handler:
        handler(workflow_id, status, result)
    else:
        _create_workflow_audit(workflow_id, workflow_type, status, result)


def _handle_approval_result(workflow_id, status, result):
    source_doctype = result.get("doctype", "")
    source_name = result.get("name", "")

    if not source_doctype or not source_name:
        return

    if not frappe.db.exists(source_doctype, source_name):
        return

    state_map = {
        "completed": "Approved",
        "failed": "Rejected",
        "timed_out": "Escalated",
        "cancelled": "Cancelled",
    }

    new_state = state_map.get(status, status)

    if frappe.get_meta(source_doctype).has_field("cityos_workflow_state"):
        frappe.db.set_value(source_doctype, source_name, "cityos_workflow_state", new_state)

    _create_workflow_audit(workflow_id, "approval_chain", status, result)


def _handle_procurement_approval(workflow_id, status, result):
    pr_name = result.get("name", "")
    if not pr_name or not frappe.db.exists("CityOS Procurement Request", pr_name):
        return

    if status == "completed" and result.get("approved"):
        doc = frappe.get_doc("CityOS Procurement Request", pr_name)
        if doc.docstatus == 0:
            doc.cityos_workflow_state = "Approved"
            doc.flags.ignore_node_context = True
            doc.save(ignore_permissions=True)

    _create_workflow_audit(workflow_id, "procurement_approval", status, result)


def _handle_invoice_settlement(workflow_id, status, result):
    invoice_name = result.get("name", "")
    if not invoice_name:
        return

    if frappe.db.exists("Municipal Invoice", invoice_name):
        if status == "completed":
            frappe.db.set_value("Municipal Invoice", invoice_name, "cityos_workflow_state", "Settled")
    elif frappe.db.exists("Sales Invoice", invoice_name):
        if status == "completed":
            frappe.db.set_value("Sales Invoice", invoice_name, "cityos_workflow_state", "Settled")

    _create_workflow_audit(workflow_id, "invoice_settlement", status, result)


def _handle_vendor_onboarding(workflow_id, status, result):
    vendor_name = result.get("name", "")
    if not vendor_name or not frappe.db.exists("Vendor Compliance Profile", vendor_name):
        return

    if status == "completed":
        frappe.db.set_value("Vendor Compliance Profile", vendor_name, {
            "status": "Verified" if result.get("approved") else "Rejected",
        })

    _create_workflow_audit(workflow_id, "vendor_onboarding", status, result)


def _handle_budget_approval(workflow_id, status, result):
    budget_name = result.get("name", "")
    if not budget_name or not frappe.db.exists("Budget Program", budget_name):
        return

    if status == "completed" and result.get("approved"):
        if frappe.get_meta("Budget Program").has_field("cityos_workflow_state"):
            frappe.db.set_value("Budget Program", budget_name, "cityos_workflow_state", "Approved")

    _create_workflow_audit(workflow_id, "budget_approval", status, result)


WORKFLOW_DOCTYPE_MAP = {
    "approval_chain": None,
    "procurement_approval": "CityOS Procurement Request",
    "invoice_settlement": "Municipal Invoice",
    "vendor_onboarding": "Vendor Compliance Profile",
    "budget_approval": "Budget Program",
}


@frappe.whitelist()
def trigger_workflow(workflow_type, doctype=None, docname=None, input_data=None):
    if workflow_type not in WORKFLOW_METADATA:
        frappe.throw(
            f"Unknown workflow type '{workflow_type}'. Valid types: {', '.join(WORKFLOW_METADATA.keys())}",
            frappe.ValidationError,
        )

    expected_doctype = WORKFLOW_DOCTYPE_MAP.get(workflow_type)

    if expected_doctype and doctype and doctype != expected_doctype:
        frappe.throw(
            f"Workflow '{workflow_type}' expects doctype '{expected_doctype}', got '{doctype}'",
            frappe.ValidationError,
        )

    if not doctype and expected_doctype:
        doctype = expected_doctype

    if doctype and docname:
        if not frappe.db.exists(doctype, docname):
            frappe.throw(f"{doctype} '{docname}' not found", frappe.DoesNotExistError)

        doc = frappe.get_doc(doctype, docname)

        if hasattr(doc.meta, "has_field") and doc.meta.has_field("cityos_workflow_state"):
            frappe.db.set_value(doctype, docname, "cityos_workflow_state", "Workflow Started")

    extra = {}
    if isinstance(input_data, str):
        try:
            extra = json.loads(input_data)
        except (json.JSONDecodeError, TypeError):
            extra = {}
    elif isinstance(input_data, dict):
        extra = input_data

    workflow_input = {
        "workflow_type": workflow_type,
        "doctype": doctype,
        "name": docname,
        "initiated_by": frappe.session.user,
        **extra,
    }

    enqueue_temporal_workflow(
        workflow_type,
        input_data=workflow_input,
        doctype=doctype,
        docname=docname,
    )

    metadata = WORKFLOW_METADATA[workflow_type]
    queue = get_queue_for_workflow(workflow_type)

    return {
        "status": "enqueued",
        "workflow_type": workflow_type,
        "display_name": metadata["displayName"],
        "task_queue": queue,
        "doctype": doctype,
        "docname": docname,
        "message": f"Workflow '{metadata['displayName']}' has been triggered and will be processed via Temporal.",
    }


@frappe.whitelist()
def get_workflow_types():
    result = []
    for wf_type, metadata in WORKFLOW_METADATA.items():
        result.append({
            "workflow_type": wf_type,
            "display_name": metadata["displayName"],
            "description": metadata["description"],
            "task_queues": metadata["taskQueues"],
            "domain_pack": metadata["domainPack"],
            "tags": metadata["tags"],
            "expected_doctype": WORKFLOW_DOCTYPE_MAP.get(wf_type),
        })
    return result


@frappe.whitelist()
def get_workflow_status(workflow_id):
    if not workflow_id:
        frappe.throw("workflow_id is required", frappe.ValidationError)

    import asyncio
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(describe_temporal_workflow(workflow_id))
        if result:
            return result
        return {"status": "not_found", "workflow_id": workflow_id}
    except Exception as e:
        return {"status": "error", "workflow_id": workflow_id, "error": str(e)}


def enqueue_temporal_workflow(workflow_type, task_queue=None, input_data=None, doctype=None, docname=None):
    queue = task_queue or get_queue_for_workflow(workflow_type)

    payload = {
        "workflow_type": workflow_type,
        "task_queue": queue,
        "input": input_data or {},
        "source_doctype": doctype,
        "source_name": docname,
        "initiated_by": frappe.session.user,
        "initiated_at": now_datetime().isoformat(),
    }

    event = frappe.new_doc("Integration Outbox Event")
    event.event_type = f"TEMPORAL_WORKFLOW_{workflow_type.upper()}"
    event.target_system = "Temporal Workflow"
    event.source_doctype = doctype or "System"
    event.source_name = docname or workflow_type
    event.event_payload = json.dumps(payload, default=str)
    event.priority = "High"
    event.idempotency_key = f"temporal:{workflow_type}:{doctype}:{docname}:{now_datetime().isoformat()}"
    event.flags.ignore_node_context = True
    event.flags.ignore_permissions = True
    event.insert(ignore_permissions=True)


def _create_workflow_audit(workflow_id, workflow_type, status, result):
    try:
        if not frappe.db.exists("DocType", "CityOS Audit Log"):
            return

        source_doctype = result.get("doctype", "System")
        source_name = result.get("name", workflow_id)

        audit = frappe.new_doc("CityOS Audit Log")
        audit.document_type = source_doctype
        audit.document_name = source_name
        audit.action = "Approved" if status == "completed" and result.get("approved") else "Escalated"
        audit.user = result.get("approved_by", "System")
        audit.details = json.dumps({
            "workflow_id": workflow_id,
            "workflow_type": workflow_type,
            "status": status,
            "result": result,
        }, default=str)
        audit.flags.ignore_node_context = True
        audit.flags.ignore_permissions = True
        audit.insert(ignore_permissions=True)
    except Exception:
        frappe.log_error("CityOS Temporal Audit Error")
