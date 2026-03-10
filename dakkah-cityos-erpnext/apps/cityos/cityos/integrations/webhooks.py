import frappe
import json
import hmac
import hashlib
import os


@frappe.whitelist(allow_guest=True)
def medusa_webhook():
    try:
        data = frappe.request.get_json(force=True)
        if not data:
            frappe.throw("No data received", frappe.ValidationError)

        webhook_secret = os.environ.get("MEDUSA_WEBHOOK_SECRET") or frappe.conf.get("medusa_webhook_secret", "")
        if webhook_secret:
            signature = frappe.request.headers.get("x-medusa-signature", "")
            if not _verify_signature(frappe.request.get_data(), webhook_secret, signature):
                frappe.throw("Invalid signature", frappe.AuthenticationError)

        from cityos.integrations.medusa_sync import handle_medusa_webhook
        handle_medusa_webhook(data)

        frappe.db.commit()
        return {"status": "ok"}

    except Exception as e:
        frappe.log_error(f"Medusa webhook error: {str(e)}", "CityOS Webhook")
        frappe.throw(str(e))


@frappe.whitelist(allow_guest=True)
def payload_webhook():
    try:
        data = frappe.request.get_json(force=True)
        if not data:
            frappe.throw("No data received", frappe.ValidationError)

        webhook_secret = os.environ.get("PAYLOAD_WEBHOOK_SECRET") or frappe.conf.get("payload_webhook_secret", "")
        if webhook_secret:
            signature = frappe.request.headers.get("x-payload-signature", "")
            if not _verify_signature(frappe.request.get_data(), webhook_secret, signature):
                frappe.throw("Invalid signature", frappe.AuthenticationError)

        from cityos.integrations.payload_sync import handle_payload_webhook
        handle_payload_webhook(data)

        frappe.db.commit()
        return {"status": "ok"}

    except Exception as e:
        frappe.log_error(f"Payload webhook error: {str(e)}", "CityOS Webhook")
        frappe.throw(str(e))


@frappe.whitelist(allow_guest=True)
def temporal_webhook():
    try:
        data = frappe.request.get_json(force=True)
        if not data:
            frappe.throw("No data received", frappe.ValidationError)

        webhook_secret = os.environ.get("TEMPORAL_WEBHOOK_SECRET") or frappe.conf.get("temporal_webhook_secret", "")
        if webhook_secret:
            signature = frappe.request.headers.get("x-temporal-signature", "")
            if not _verify_signature(frappe.request.get_data(), webhook_secret, signature):
                frappe.throw("Invalid signature", frappe.AuthenticationError)

        from cityos.integrations.temporal_sync import handle_temporal_webhook
        handle_temporal_webhook(data)

        frappe.db.commit()
        return {"status": "ok"}

    except Exception as e:
        frappe.log_error(f"Temporal webhook error: {str(e)}", "CityOS Webhook")
        frappe.throw(str(e))


@frappe.whitelist()
def get_integration_status():
    medusa_url = os.environ.get("MEDUSA_BACKEND_URL_DEV") or os.environ.get("MEDUSA_BACKEND_URL_LOCAL") or frappe.conf.get("medusa_api_url", "")
    payload_url = os.environ.get("PAYLOAD_CMS_URL_DEV") or os.environ.get("PAYLOAD_CMS_URL_LOCAL") or frappe.conf.get("payload_api_url", "")

    outbox_stats = {}
    if frappe.db.exists("DocType", "Integration Outbox Event"):
        for status in ["Pending", "Processing", "Published", "Failed", "Dead Letter"]:
            outbox_stats[status] = frappe.db.count("Integration Outbox Event", {"status": status})

    return {
        "medusa": {
            "configured": bool(medusa_url),
            "url": medusa_url,
        },
        "payload_cms": {
            "configured": bool(payload_url),
            "url": payload_url,
        },
        "outbox": outbox_stats,
        "hierarchy": {
            "scopes": frappe.db.count("CityOS Scope") if frappe.db.exists("DocType", "CityOS Scope") else 0,
            "categories": frappe.db.count("CityOS Category") if frappe.db.exists("DocType", "CityOS Category") else 0,
            "subcategories": frappe.db.count("CityOS Subcategory") if frappe.db.exists("DocType", "CityOS Subcategory") else 0,
            "stores": frappe.db.count("CityOS Store") if frappe.db.exists("DocType", "CityOS Store") else 0,
            "portals": frappe.db.count("CityOS Portal") if frappe.db.exists("DocType", "CityOS Portal") else 0,
        },
    }


def _verify_signature(payload, secret, signature):
    if not signature:
        return False

    expected = hmac.HMAC(
        secret.encode("utf-8"),
        payload,
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(expected, signature)
