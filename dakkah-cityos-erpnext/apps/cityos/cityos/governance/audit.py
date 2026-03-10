import frappe
import json

AUDIT_EXEMPT_DOCTYPES = [
    "CityOS Audit Log",
    "Integration Outbox Event",
    "CityOS Persona Assignment",
    "Version",
    "Activity Log",
    "Error Log",
    "Comment",
    "Communication",
    "Scheduled Job Log",
    "File",
    "DefaultValue",
    "Singles",
    "DocType",
    "Module Def",
    "Custom Field",
    "Property Setter",
    "Tag",
    "Tag Link",
    "Access Log",
    "Notification Log",
    "Session Default Settings",
]


def _is_cityos_aware(doc):
    return doc.meta.has_field("cityos_tenant")


def log_document_create(doc, method):
    if doc.doctype in AUDIT_EXEMPT_DOCTYPES:
        return
    if not _is_cityos_aware(doc):
        return
    _create_audit_log(doc, "Created")


def log_document_change(doc, method):
    if doc.doctype in AUDIT_EXEMPT_DOCTYPES:
        return
    if not _is_cityos_aware(doc):
        return
    _create_audit_log(doc, "Updated")


def log_document_submit(doc, method):
    if doc.doctype in AUDIT_EXEMPT_DOCTYPES:
        return
    if not _is_cityos_aware(doc):
        return
    _create_audit_log(doc, "Submitted")


def log_document_cancel(doc, method):
    if doc.doctype in AUDIT_EXEMPT_DOCTYPES:
        return
    if not _is_cityos_aware(doc):
        return
    _create_audit_log(doc, "Cancelled")


def log_document_delete(doc, method):
    if doc.doctype in AUDIT_EXEMPT_DOCTYPES:
        return
    if not _is_cityos_aware(doc):
        return
    _create_audit_log(doc, "Deleted")


def _create_audit_log(doc, action):
    try:
        if not frappe.db.exists("DocType", "CityOS Audit Log"):
            return

        tenant = getattr(doc, "cityos_tenant", None) or ""
        country = getattr(doc, "cityos_country", None) or ""
        city = getattr(doc, "cityos_city", None) or ""
        correlation_id = getattr(doc, "cityos_correlation_id", None) or ""
        scope = getattr(doc, "cityos_scope", None) or ""
        store = getattr(doc, "cityos_store", None) or ""

        details = {}
        if action == "Created":
            details = {"event": "document_created", "doctype": doc.doctype, "name": doc.name}
        elif action == "Updated" and doc.get_doc_before_save():
            changed = {}
            before = doc.get_doc_before_save()
            for field in doc.meta.fields:
                if field.fieldtype in ("Section Break", "Column Break", "Tab Break"):
                    continue
                old_val = before.get(field.fieldname)
                new_val = doc.get(field.fieldname)
                if old_val != new_val:
                    changed[field.fieldname] = {"old": str(old_val) if old_val else "", "new": str(new_val) if new_val else ""}
            if changed:
                details = {"changed_fields": changed}
        elif action == "Deleted":
            details = {"event": "document_deleted", "doctype": doc.doctype, "name": doc.name}

        audit = frappe.new_doc("CityOS Audit Log")
        audit.document_type = doc.doctype
        audit.document_name = doc.name
        audit.action = action
        audit.user = frappe.session.user
        audit.tenant = tenant
        audit.country = country
        audit.city = city
        audit.correlation_id = correlation_id
        if details:
            audit.details = json.dumps(details, default=str)
        audit.flags.ignore_node_context = True
        audit.flags.ignore_permissions = True
        audit.insert(ignore_permissions=True)
    except Exception:
        frappe.log_error("CityOS Audit Log Error")
