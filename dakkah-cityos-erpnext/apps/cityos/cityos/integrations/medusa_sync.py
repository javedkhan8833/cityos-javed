import frappe
import json
import os
import requests
from frappe.utils import now_datetime, cstr


def _get_medusa_config():
    api_url = os.environ.get("MEDUSA_BACKEND_URL_DEV") or os.environ.get("MEDUSA_BACKEND_URL_LOCAL") or frappe.conf.get("medusa_api_url", "")
    api_key = os.environ.get("MEDUSA_API_KEY") or frappe.conf.get("medusa_api_key", "")
    return api_url, api_key


def on_invoice_submit(doc, method):
    if not doc.cityos_source_system or doc.cityos_source_system == "ERPNext":
        _create_outbox_event(
            event_type="ERP_INVOICE_SUBMITTED",
            target_system="Medusa Commerce",
            source_doctype="Sales Invoice",
            source_name=doc.name,
            tenant=getattr(doc, "cityos_tenant", ""),
            country=getattr(doc, "cityos_country", ""),
            payload={
                "invoice_name": doc.name,
                "customer": doc.customer,
                "customer_name": doc.customer_name,
                "grand_total": float(doc.grand_total),
                "currency": doc.currency,
                "posting_date": cstr(doc.posting_date),
                "items": [
                    {
                        "item_code": item.item_code,
                        "item_name": item.item_name,
                        "qty": float(item.qty),
                        "rate": float(item.rate),
                        "amount": float(item.amount),
                    }
                    for item in doc.items
                ],
                "correlation_id": getattr(doc, "cityos_correlation_id", ""),
                "source_ref_id": getattr(doc, "cityos_source_ref_id", ""),
            },
        )


def on_payment_submit(doc, method):
    if not doc.cityos_source_system or doc.cityos_source_system == "ERPNext":
        _create_outbox_event(
            event_type="ERP_PAYMENT_RECORDED",
            target_system="Medusa Commerce",
            source_doctype="Payment Entry",
            source_name=doc.name,
            tenant=getattr(doc, "cityos_tenant", ""),
            country=getattr(doc, "cityos_country", ""),
            payload={
                "payment_name": doc.name,
                "payment_type": doc.payment_type,
                "party_type": doc.party_type,
                "party": doc.party,
                "paid_amount": float(doc.paid_amount),
                "received_amount": float(doc.received_amount),
                "currency": doc.paid_from_account_currency,
                "posting_date": cstr(doc.posting_date),
                "reference_no": doc.reference_no,
                "correlation_id": getattr(doc, "cityos_correlation_id", ""),
            },
        )


def sync_pending_orders():
    api_url, api_key = _get_medusa_config()
    if not api_url or not api_key:
        return

    try:
        response = requests.get(
            f"{api_url}/admin/orders",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            params={
                "status": "pending",
                "limit": 50,
            },
            timeout=30,
        )

        if response.status_code != 200:
            frappe.log_error(
                f"Medusa order sync failed: {response.status_code} {response.text}",
                "CityOS Medusa Sync"
            )
            return

        data = response.json()
        orders = data.get("orders", [])

        for order in orders:
            _process_medusa_order(order)

        if orders:
            frappe.db.commit()

    except requests.exceptions.ConnectionError:
        pass
    except Exception as e:
        frappe.log_error(f"Medusa order sync error: {str(e)}", "CityOS Medusa Sync")


def _process_medusa_order(order):
    order_id = order.get("id", "")
    if not order_id:
        return

    existing = frappe.db.get_value(
        "Sales Invoice",
        {"cityos_source_ref_id": order_id, "cityos_source_system": "Medusa Commerce"},
        "name",
    )
    if existing:
        return

    customer = _ensure_customer(order)
    if not customer:
        return

    try:
        invoice = frappe.new_doc("Sales Invoice")
        invoice.customer = customer
        invoice.posting_date = now_datetime().date()
        invoice.due_date = now_datetime().date()
        invoice.currency = order.get("currency_code", "SAR").upper()

        invoice.cityos_source_system = "Medusa Commerce"
        invoice.cityos_source_ref_id = order_id
        invoice.cityos_correlation_id = order.get("metadata", {}).get("correlation_id", order_id)
        invoice.cityos_tenant = order.get("metadata", {}).get("tenant_id", "")

        for item_data in order.get("items", []):
            item_code = _ensure_item(item_data)
            if item_code:
                invoice.append("items", {
                    "item_code": item_code,
                    "qty": item_data.get("quantity", 1),
                    "rate": float(item_data.get("unit_price", 0)) / 100,
                })

        invoice.flags.ignore_node_context = True
        invoice.insert(ignore_permissions=True)
        frappe.db.commit()

    except Exception as e:
        frappe.log_error(f"Failed to create invoice for Medusa order {order_id}: {str(e)}", "CityOS Medusa Sync")


def _ensure_customer(order):
    email = order.get("email", "")
    if not email:
        return None

    existing = frappe.db.get_value("Customer", {"email_id": email}, "name")
    if existing:
        return existing

    customer_name = order.get("shipping_address", {}).get("first_name", "")
    if not customer_name:
        customer_name = email.split("@")[0]

    last_name = order.get("shipping_address", {}).get("last_name", "")
    if last_name:
        customer_name = f"{customer_name} {last_name}"

    try:
        customer = frappe.new_doc("Customer")
        customer.customer_name = customer_name
        customer.customer_type = "Individual"
        customer.email_id = email
        customer.cityos_source_system = "Medusa Commerce"
        customer.cityos_source_ref_id = order.get("customer_id", "")
        customer.cityos_tenant = order.get("metadata", {}).get("tenant_id", "")
        customer.flags.ignore_node_context = True
        customer.insert(ignore_permissions=True)
        return customer.name
    except Exception as e:
        frappe.log_error(f"Failed to create customer: {str(e)}", "CityOS Medusa Sync")
        return None


def _ensure_item(item_data):
    title = item_data.get("title", "")
    product_id = item_data.get("product_id", "")

    if product_id:
        existing = frappe.db.get_value("Item", {"cityos_source_ref_id": product_id}, "name")
        if existing:
            return existing

    item_code = product_id or title.replace(" ", "-").lower()[:140]
    if frappe.db.exists("Item", item_code):
        return item_code

    try:
        item = frappe.new_doc("Item")
        item.item_code = item_code
        item.item_name = title or item_code
        item.item_group = "Products"
        item.stock_uom = "Nos"
        item.is_sales_item = 1
        item.cityos_source_system = "Medusa Commerce"
        item.cityos_source_ref_id = product_id
        item.flags.ignore_node_context = True
        item.insert(ignore_permissions=True)
        return item.name
    except Exception as e:
        frappe.log_error(f"Failed to create item: {str(e)}", "CityOS Medusa Sync")
        return None


def _create_outbox_event(event_type, target_system, source_doctype, source_name,
                          tenant="", country="", payload=None):
    try:
        idempotency_key = f"{event_type}:{source_doctype}:{source_name}:{now_datetime().isoformat()}"

        event = frappe.new_doc("Integration Outbox Event")
        event.event_type = event_type
        event.target_system = target_system
        event.source_doctype = source_doctype
        event.source_name = source_name
        event.tenant = tenant
        event.country = country
        event.idempotency_key = idempotency_key
        event.event_payload = json.dumps(payload or {}, default=str)
        event.priority = "Normal"
        event.flags.ignore_node_context = True
        event.flags.ignore_permissions = True
        event.insert(ignore_permissions=True)
    except Exception as e:
        frappe.log_error(f"Failed to create outbox event: {str(e)}", "CityOS Outbox")


def handle_medusa_webhook(data):
    event_type = data.get("event", "")
    payload = data.get("data", {})

    handlers = {
        "order.placed": _handle_order_placed,
        "order.completed": _handle_order_completed,
        "order.updated": _handle_order_updated,
        "order.cancelled": _handle_order_cancelled,
        "product.created": _handle_product_created,
        "product.updated": _handle_product_updated,
        "product.deleted": _handle_product_deleted,
        "customer.created": _handle_customer_created,
        "payment.captured": _handle_payment_captured,
        "payment.refunded": _handle_payment_refunded,
        "vendor.created": _handle_vendor_created,
        "tenant.created": _handle_tenant_created,
        "tenant.updated": _handle_tenant_updated,
        "store.created": _handle_store_created,
        "store.updated": _handle_store_updated,
        "store.deleted": _handle_store_deleted,
    }

    handler = handlers.get(event_type)
    if handler:
        handler(payload)
    else:
        frappe.log_error(f"Unhandled Medusa webhook event: {event_type}", "CityOS Medusa Webhook")


def _handle_order_placed(data):
    _process_medusa_order(data)


def _handle_order_completed(data):
    order_id = data.get("id", "")
    if order_id:
        existing = frappe.db.get_value(
            "Sales Invoice",
            {"cityos_source_ref_id": order_id, "cityos_source_system": "Medusa Commerce"},
            "name",
        )
        if existing:
            frappe.db.set_value("Sales Invoice", existing, "cityos_workflow_state", "Completed")


def _handle_order_updated(data):
    order_id = data.get("id", "")
    if not order_id:
        return

    existing = frappe.db.get_value(
        "Sales Invoice",
        {"cityos_source_ref_id": order_id, "cityos_source_system": "Medusa Commerce"},
        "name",
    )
    if existing:
        status = data.get("status", "")
        if status:
            frappe.db.set_value("Sales Invoice", existing, "cityos_workflow_state", status.capitalize())


def _handle_order_cancelled(data):
    order_id = data.get("id", "")
    if not order_id:
        return

    existing = frappe.db.get_value(
        "Sales Invoice",
        {"cityos_source_ref_id": order_id, "cityos_source_system": "Medusa Commerce"},
        "name",
    )
    if existing:
        frappe.db.set_value("Sales Invoice", existing, "cityos_workflow_state", "Cancelled")


def _handle_product_created(data):
    _ensure_item(data)


def _handle_product_updated(data):
    product_id = data.get("id", "")
    if not product_id:
        return

    existing = frappe.db.get_value("Item", {"cityos_source_ref_id": product_id}, "name")
    if existing:
        title = data.get("title", "")
        if title:
            frappe.db.set_value("Item", existing, "item_name", title)


def _handle_product_deleted(data):
    product_id = data.get("id", "")
    if not product_id:
        return

    existing = frappe.db.get_value("Item", {"cityos_source_ref_id": product_id}, "name")
    if existing:
        frappe.db.set_value("Item", existing, "disabled", 1)


def _handle_customer_created(data):
    email = data.get("email", "")
    if email:
        _ensure_customer({"email": email, "shipping_address": data, "customer_id": data.get("id", "")})


def _handle_payment_captured(data):
    order_id = data.get("order_id", "")
    if order_id:
        existing = frappe.db.get_value(
            "Sales Invoice",
            {"cityos_source_ref_id": order_id, "cityos_source_system": "Medusa Commerce"},
            "name",
        )
        if existing:
            frappe.db.set_value("Sales Invoice", existing, "cityos_workflow_state", "Paid")


def _handle_payment_refunded(data):
    order_id = data.get("order_id", "")
    payment_id = data.get("id", "")
    if not order_id:
        return

    existing = frappe.db.get_value(
        "Sales Invoice",
        {"cityos_source_ref_id": order_id, "cityos_source_system": "Medusa Commerce"},
        ["name", "cityos_tenant", "cityos_country"],
        as_dict=True,
    )
    if existing:
        _create_outbox_event(
            event_type="ERP_PAYMENT_REFUNDED",
            target_system="Medusa Commerce",
            source_doctype="Sales Invoice",
            source_name=existing.name,
            tenant=existing.get("cityos_tenant", ""),
            country=existing.get("cityos_country", ""),
            payload={
                "invoice_name": existing.name,
                "order_id": order_id,
                "payment_id": payment_id,
                "refund_amount": data.get("amount", 0),
                "reason": data.get("reason", ""),
                "refunded_at": cstr(now_datetime()),
            },
        )


def _handle_vendor_created(data):
    vendor_id = data.get("id", "")
    vendor_name = data.get("name", "")
    if not vendor_id:
        return

    existing = frappe.db.get_value(
        "Vendor Compliance Profile",
        {"medusa_vendor_id": vendor_id} if frappe.get_meta("Vendor Compliance Profile").has_field("medusa_vendor_id") else {},
        "name",
    )
    if not existing and vendor_name:
        try:
            if frappe.db.exists("DocType", "Vendor Compliance Profile"):
                vcp = frappe.new_doc("Vendor Compliance Profile")
                vcp.vendor_name = vendor_name
                if vcp.meta.has_field("medusa_vendor_id"):
                    vcp.medusa_vendor_id = vendor_id
                vcp.flags.ignore_node_context = True
                vcp.insert(ignore_permissions=True)
        except Exception as e:
            frappe.log_error(f"Failed to create vendor profile: {str(e)}", "CityOS Medusa Sync")


def _handle_tenant_created(data):
    tenant_id = data.get("id", "")
    tenant_name = data.get("name", "")
    if not tenant_id:
        return

    existing = frappe.db.get_value("Node Context", {"cms_ref_id": tenant_id}, "name")
    if existing:
        return

    try:
        nc = frappe.new_doc("Node Context")
        nc.context_name = tenant_name or tenant_id
        nc.tenant = tenant_name or tenant_id
        nc.tenant_tier = data.get("metadata", {}).get("tenant_tier", "CITY")
        nc.status = "Active"
        nc.cms_ref_id = tenant_id
        nc.enabled = 1
        nc.country = data.get("metadata", {}).get("country", "Saudi Arabia")
        if nc.country and not frappe.db.exists("Country", nc.country):
            nc.country = "Saudi Arabia"
        nc.flags.ignore_node_context = True
        nc.insert(ignore_permissions=True)
    except Exception as e:
        frappe.log_error(f"Failed to create tenant from Medusa: {str(e)}", "CityOS Medusa Sync")


def _handle_tenant_updated(data):
    tenant_id = data.get("id", "")
    if not tenant_id:
        return

    existing = frappe.db.get_value("Node Context", {"cms_ref_id": tenant_id}, "name")
    if not existing:
        return

    update_vals = {}
    tenant_name = data.get("name", "")
    if tenant_name:
        update_vals["context_name"] = tenant_name
        update_vals["tenant"] = tenant_name
    metadata = data.get("metadata", {}) or {}
    tenant_tier = metadata.get("tenant_tier", "")
    if tenant_tier:
        update_vals["tenant_tier"] = tenant_tier
    status = data.get("status", "")
    if status:
        update_vals["status"] = status
    country = metadata.get("country", "")
    if country and frappe.db.exists("Country", country):
        update_vals["country"] = country

    if update_vals:
        try:
            frappe.db.set_value("Node Context", existing, update_vals)
        except Exception as e:
            frappe.log_error(f"Failed to update tenant from Medusa: {str(e)}", "CityOS Medusa Sync")


def _handle_store_created(data):
    store_id = data.get("id", "")
    store_name = data.get("name", "")
    store_handle = data.get("handle", "")

    if not store_id or not store_name:
        return

    existing = frappe.db.get_value("CityOS Store", {"medusa_store_id": store_id}, "name")
    if not existing:
        try:
            store = frappe.new_doc("CityOS Store")
            store.store_name = store_name
            store.store_handle = store_handle or store_name.lower().replace(" ", "-")
            store.medusa_store_id = store_id
            store.tenant = data.get("metadata", {}).get("tenant_id", "")
            store.flags.ignore_node_context = True
            store.insert(ignore_permissions=True)
        except Exception as e:
            frappe.log_error(f"Failed to create store: {str(e)}", "CityOS Medusa Sync")


def _handle_store_updated(data):
    store_id = data.get("id", "")
    if not store_id:
        return

    existing = frappe.db.get_value("CityOS Store", {"medusa_store_id": store_id}, "name")
    if not existing:
        return

    update_vals = {}
    store_name = data.get("name", "")
    if store_name:
        update_vals["store_name"] = store_name
    store_handle = data.get("handle", "")
    if store_handle:
        update_vals["store_handle"] = store_handle
    metadata = data.get("metadata", {}) or {}
    tenant_id = metadata.get("tenant_id", "")
    if tenant_id:
        update_vals["tenant"] = tenant_id

    if update_vals:
        try:
            frappe.db.set_value("CityOS Store", existing, update_vals)
        except Exception as e:
            frappe.log_error(f"Failed to update store from Medusa: {str(e)}", "CityOS Medusa Sync")


def _handle_store_deleted(data):
    store_id = data.get("id", "")
    if not store_id:
        return

    existing = frappe.db.get_value("CityOS Store", {"medusa_store_id": store_id}, "name")
    if existing:
        frappe.db.set_value("CityOS Store", existing, "enabled", 0)
