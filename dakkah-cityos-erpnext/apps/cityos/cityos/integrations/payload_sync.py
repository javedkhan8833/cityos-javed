import frappe
import json
import os
import requests
from frappe.utils import now_datetime, cstr


def _get_payload_config():
    return (
        os.environ.get("PAYLOAD_CMS_URL_DEV") or os.environ.get("PAYLOAD_CMS_URL_LOCAL") or frappe.conf.get("payload_api_url", ""),
        os.environ.get("CITYOS_CMS_API_KEY") or frappe.conf.get("payload_api_key", ""),
    )


def sync_vendor_to_payload(vendor_doc):
    api_url, api_key = _get_payload_config()
    if not api_url or not api_key:
        return

    payload_data = {
        "name": vendor_doc.vendor_name if hasattr(vendor_doc, "vendor_name") else vendor_doc.name,
        "erpnext_id": vendor_doc.name,
        "status": getattr(vendor_doc, "status", "Active"),
        "tenant": getattr(vendor_doc, "cityos_tenant", ""),
    }

    try:
        response = requests.post(
            f"{api_url}/api/vendors",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload_data,
            timeout=30,
        )
        if response.status_code not in (200, 201):
            frappe.log_error(
                f"Payload CMS vendor sync failed: {response.status_code}",
                "CityOS Payload Sync",
            )
    except Exception as e:
        frappe.log_error(f"Payload CMS sync error: {str(e)}", "CityOS Payload Sync")


def sync_asset_to_payload(asset_doc):
    api_url, api_key = _get_payload_config()
    if not api_url or not api_key:
        return

    payload_data = {
        "name": asset_doc.asset_name if hasattr(asset_doc, "asset_name") else asset_doc.name,
        "erpnext_id": asset_doc.name,
        "asset_type": getattr(asset_doc, "asset_type", ""),
        "status": getattr(asset_doc, "status", "Active"),
        "tenant": getattr(asset_doc, "cityos_tenant", ""),
        "location": getattr(asset_doc, "location", ""),
    }

    try:
        response = requests.post(
            f"{api_url}/api/municipal-assets",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload_data,
            timeout=30,
        )
        if response.status_code not in (200, 201):
            frappe.log_error(
                f"Payload CMS asset sync failed: {response.status_code}",
                "CityOS Payload Sync",
            )
    except Exception as e:
        frappe.log_error(f"Payload CMS sync error: {str(e)}", "CityOS Payload Sync")


def sync_governance_authority_to_payload(doc, method=None):
    api_url, api_key = _get_payload_config()
    if not api_url or not api_key:
        return

    payload_data = {
        "name": doc.authority_name,
        "erpnext_id": doc.name,
        "authorityType": getattr(doc, "authority_type", ""),
        "jurisdictionLevel": getattr(doc, "jurisdiction_level", ""),
        "parentAuthority": getattr(doc, "parent_authority", ""),
        "residencyZone": getattr(doc, "residency_zone", ""),
        "status": getattr(doc, "status", "Active"),
    }

    try:
        response = requests.post(
            f"{api_url}/api/governance-authorities",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=payload_data,
            timeout=30,
        )
        if response.status_code not in (200, 201):
            frappe.log_error(f"Payload CMS governance authority sync failed: {response.status_code}", "CityOS Payload Sync")
    except Exception as e:
        frappe.log_error(f"Payload CMS sync error: {str(e)}", "CityOS Payload Sync")


def sync_policy_to_payload(doc, method=None):
    api_url, api_key = _get_payload_config()
    if not api_url or not api_key:
        return

    payload_data = {
        "name": doc.policy_name,
        "erpnext_id": doc.name,
        "policyType": getattr(doc, "policy_type", ""),
        "scopeLevel": getattr(doc, "scope_level", ""),
        "enforcementLevel": getattr(doc, "enforcement_level", ""),
        "inheritanceMode": getattr(doc, "inheritance_mode", ""),
        "governanceAuthority": getattr(doc, "governance_authority", ""),
        "status": getattr(doc, "status", "Draft"),
    }

    try:
        response = requests.post(
            f"{api_url}/api/policies",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=payload_data,
            timeout=30,
        )
        if response.status_code not in (200, 201):
            frappe.log_error(f"Payload CMS policy sync failed: {response.status_code}", "CityOS Payload Sync")
    except Exception as e:
        frappe.log_error(f"Payload CMS sync error: {str(e)}", "CityOS Payload Sync")


def sync_persona_to_payload(doc, method=None):
    api_url, api_key = _get_payload_config()
    if not api_url or not api_key:
        return

    payload_data = {
        "name": doc.persona_name,
        "erpnext_id": doc.name,
        "personaType": getattr(doc, "persona_type", ""),
        "personaCode": getattr(doc, "persona_code", ""),
        "status": getattr(doc, "status", "Active"),
    }

    try:
        response = requests.post(
            f"{api_url}/api/personas",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=payload_data,
            timeout=30,
        )
        if response.status_code not in (200, 201):
            frappe.log_error(f"Payload CMS persona sync failed: {response.status_code}", "CityOS Payload Sync")
    except Exception as e:
        frappe.log_error(f"Payload CMS sync error: {str(e)}", "CityOS Payload Sync")


def _create_outbox_event(doc, collection, payload_data):
    try:
        idempotency_key = f"payload_sync:{collection}:{doc.doctype}:{doc.name}:{now_datetime().isoformat()}"

        event = frappe.new_doc("Integration Outbox Event")
        event.event_type = f"CMS_SYNC_{collection.upper().replace('-', '_')}"
        event.target_system = "Payload CMS"
        event.source_doctype = doc.doctype
        event.source_name = doc.name
        event.tenant = getattr(doc, "cityos_tenant", "") or ""
        event.country = getattr(doc, "cityos_country", "") or ""
        event.idempotency_key = idempotency_key
        event.event_payload = json.dumps(payload_data, default=str)
        event.priority = "Normal"
        event.flags.ignore_permissions = True
        event.flags.ignore_node_context = True
        event.insert(ignore_permissions=True)
    except Exception as e:
        frappe.log_error(f"Outbox event creation error: {str(e)}", "CityOS Payload Sync")


def sync_budget_program_to_payload(doc, method=None):
    api_url, api_key = _get_payload_config()
    if not api_url or not api_key:
        return

    payload_data = {
        "name": getattr(doc, "program_name", doc.name),
        "erpnext_id": doc.name,
        "tenant": getattr(doc, "cityos_tenant", ""),
        "source_system": "erpnext",
        "last_synced": cstr(now_datetime()),
        "status": getattr(doc, "status", "Active"),
        "fiscal_year": getattr(doc, "fiscal_year", ""),
        "total_budget": getattr(doc, "total_budget", 0),
        "department": getattr(doc, "department", ""),
    }

    try:
        response = requests.post(
            f"{api_url}/api/budget-programs",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=payload_data,
            timeout=30,
        )
        if response.status_code not in (200, 201):
            frappe.log_error(f"Payload CMS budget program sync failed: {response.status_code}", "CityOS Payload Sync")
        _create_outbox_event(doc, "budget-programs", payload_data)
    except Exception as e:
        frappe.log_error(f"Payload CMS sync error: {str(e)}", "CityOS Payload Sync")


def sync_municipal_invoice_to_payload(doc, method=None):
    api_url, api_key = _get_payload_config()
    if not api_url or not api_key:
        return

    payload_data = {
        "name": getattr(doc, "invoice_number", doc.name),
        "erpnext_id": doc.name,
        "tenant": getattr(doc, "cityos_tenant", ""),
        "source_system": "erpnext",
        "last_synced": cstr(now_datetime()),
        "status": getattr(doc, "status", "Draft"),
        "invoice_type": getattr(doc, "invoice_type", ""),
        "grand_total": getattr(doc, "grand_total", 0),
        "posting_date": cstr(getattr(doc, "posting_date", "")),
        "vendor": getattr(doc, "vendor", ""),
    }

    try:
        response = requests.post(
            f"{api_url}/api/municipal-invoices",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=payload_data,
            timeout=30,
        )
        if response.status_code not in (200, 201):
            frappe.log_error(f"Payload CMS municipal invoice sync failed: {response.status_code}", "CityOS Payload Sync")
        _create_outbox_event(doc, "municipal-invoices", payload_data)
    except Exception as e:
        frappe.log_error(f"Payload CMS sync error: {str(e)}", "CityOS Payload Sync")


def sync_funding_source_to_payload(doc, method=None):
    api_url, api_key = _get_payload_config()
    if not api_url or not api_key:
        return

    payload_data = {
        "name": getattr(doc, "source_name", doc.name),
        "erpnext_id": doc.name,
        "tenant": getattr(doc, "cityos_tenant", ""),
        "source_system": "erpnext",
        "last_synced": cstr(now_datetime()),
        "source_type": getattr(doc, "source_type", ""),
        "total_amount": getattr(doc, "total_amount", 0),
        "status": getattr(doc, "status", "Active"),
    }

    try:
        response = requests.post(
            f"{api_url}/api/funding-sources",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=payload_data,
            timeout=30,
        )
        if response.status_code not in (200, 201):
            frappe.log_error(f"Payload CMS funding source sync failed: {response.status_code}", "CityOS Payload Sync")
        _create_outbox_event(doc, "funding-sources", payload_data)
    except Exception as e:
        frappe.log_error(f"Payload CMS sync error: {str(e)}", "CityOS Payload Sync")


def sync_fiscal_allocation_to_payload(doc, method=None):
    api_url, api_key = _get_payload_config()
    if not api_url or not api_key:
        return

    payload_data = {
        "name": getattr(doc, "allocation_name", doc.name),
        "erpnext_id": doc.name,
        "tenant": getattr(doc, "cityos_tenant", ""),
        "source_system": "erpnext",
        "last_synced": cstr(now_datetime()),
        "fiscal_year": getattr(doc, "fiscal_year", ""),
        "allocated_amount": getattr(doc, "allocated_amount", 0),
        "budget_program": getattr(doc, "budget_program", ""),
        "status": getattr(doc, "status", "Active"),
    }

    try:
        response = requests.post(
            f"{api_url}/api/fiscal-allocations",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=payload_data,
            timeout=30,
        )
        if response.status_code not in (200, 201):
            frappe.log_error(f"Payload CMS fiscal allocation sync failed: {response.status_code}", "CityOS Payload Sync")
        _create_outbox_event(doc, "fiscal-allocations", payload_data)
    except Exception as e:
        frappe.log_error(f"Payload CMS sync error: {str(e)}", "CityOS Payload Sync")


def sync_procurement_request_to_payload(doc, method=None):
    api_url, api_key = _get_payload_config()
    if not api_url or not api_key:
        return

    payload_data = {
        "name": getattr(doc, "request_name", doc.name),
        "erpnext_id": doc.name,
        "tenant": getattr(doc, "cityos_tenant", ""),
        "source_system": "erpnext",
        "last_synced": cstr(now_datetime()),
        "status": getattr(doc, "status", "Draft"),
        "procurement_type": getattr(doc, "procurement_type", ""),
        "estimated_value": getattr(doc, "estimated_value", 0),
        "department": getattr(doc, "department", ""),
        "required_date": cstr(getattr(doc, "required_date", "")),
    }

    try:
        response = requests.post(
            f"{api_url}/api/procurement-requests",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=payload_data,
            timeout=30,
        )
        if response.status_code not in (200, 201):
            frappe.log_error(f"Payload CMS procurement request sync failed: {response.status_code}", "CityOS Payload Sync")
        _create_outbox_event(doc, "procurement-requests", payload_data)
    except Exception as e:
        frappe.log_error(f"Payload CMS sync error: {str(e)}", "CityOS Payload Sync")


def sync_vendor_profile_to_payload(doc, method=None):
    api_url, api_key = _get_payload_config()
    if not api_url or not api_key:
        return

    payload_data = {
        "name": getattr(doc, "vendor_name", doc.name),
        "erpnext_id": doc.name,
        "tenant": getattr(doc, "cityos_tenant", ""),
        "source_system": "erpnext",
        "last_synced": cstr(now_datetime()),
        "compliance_status": getattr(doc, "compliance_status", ""),
        "vendor_category": getattr(doc, "vendor_category", ""),
        "registration_number": getattr(doc, "registration_number", ""),
        "status": getattr(doc, "status", "Active"),
    }

    try:
        response = requests.post(
            f"{api_url}/api/vendor-profiles",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=payload_data,
            timeout=30,
        )
        if response.status_code not in (200, 201):
            frappe.log_error(f"Payload CMS vendor profile sync failed: {response.status_code}", "CityOS Payload Sync")
        _create_outbox_event(doc, "vendor-profiles", payload_data)
    except Exception as e:
        frappe.log_error(f"Payload CMS sync error: {str(e)}", "CityOS Payload Sync")


def sync_contract_to_payload(doc, method=None):
    api_url, api_key = _get_payload_config()
    if not api_url or not api_key:
        return

    payload_data = {
        "name": getattr(doc, "contract_name", doc.name),
        "erpnext_id": doc.name,
        "tenant": getattr(doc, "cityos_tenant", ""),
        "source_system": "erpnext",
        "last_synced": cstr(now_datetime()),
        "contract_type": getattr(doc, "contract_type", ""),
        "contract_value": getattr(doc, "contract_value", 0),
        "vendor": getattr(doc, "vendor", ""),
        "start_date": cstr(getattr(doc, "start_date", "")),
        "end_date": cstr(getattr(doc, "end_date", "")),
        "status": getattr(doc, "status", "Draft"),
    }

    try:
        response = requests.post(
            f"{api_url}/api/contract-registers",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=payload_data,
            timeout=30,
        )
        if response.status_code not in (200, 201):
            frappe.log_error(f"Payload CMS contract sync failed: {response.status_code}", "CityOS Payload Sync")
        _create_outbox_event(doc, "contract-registers", payload_data)
    except Exception as e:
        frappe.log_error(f"Payload CMS sync error: {str(e)}", "CityOS Payload Sync")


def sync_municipal_asset_to_payload(doc, method=None):
    api_url, api_key = _get_payload_config()
    if not api_url or not api_key:
        return

    payload_data = {
        "name": getattr(doc, "asset_name", doc.name),
        "erpnext_id": doc.name,
        "tenant": getattr(doc, "cityos_tenant", ""),
        "source_system": "erpnext",
        "last_synced": cstr(now_datetime()),
        "asset_type": getattr(doc, "asset_type", ""),
        "location": getattr(doc, "location", ""),
        "condition": getattr(doc, "condition", ""),
        "acquisition_date": cstr(getattr(doc, "acquisition_date", "")),
        "asset_value": getattr(doc, "asset_value", 0),
        "status": getattr(doc, "status", "Active"),
    }

    try:
        response = requests.post(
            f"{api_url}/api/municipal-assets",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=payload_data,
            timeout=30,
        )
        if response.status_code not in (200, 201):
            frappe.log_error(f"Payload CMS municipal asset sync failed: {response.status_code}", "CityOS Payload Sync")
        _create_outbox_event(doc, "municipal-assets", payload_data)
    except Exception as e:
        frappe.log_error(f"Payload CMS sync error: {str(e)}", "CityOS Payload Sync")


def sync_capital_project_to_payload(doc, method=None):
    api_url, api_key = _get_payload_config()
    if not api_url or not api_key:
        return

    payload_data = {
        "name": getattr(doc, "project_name", doc.name),
        "erpnext_id": doc.name,
        "tenant": getattr(doc, "cityos_tenant", ""),
        "source_system": "erpnext",
        "last_synced": cstr(now_datetime()),
        "project_type": getattr(doc, "project_type", ""),
        "total_budget": getattr(doc, "total_budget", 0),
        "start_date": cstr(getattr(doc, "start_date", "")),
        "expected_completion": cstr(getattr(doc, "expected_completion", "")),
        "status": getattr(doc, "status", "Planning"),
    }

    try:
        response = requests.post(
            f"{api_url}/api/capital-projects",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=payload_data,
            timeout=30,
        )
        if response.status_code not in (200, 201):
            frappe.log_error(f"Payload CMS capital project sync failed: {response.status_code}", "CityOS Payload Sync")
        _create_outbox_event(doc, "capital-projects", payload_data)
    except Exception as e:
        frappe.log_error(f"Payload CMS sync error: {str(e)}", "CityOS Payload Sync")


def sync_position_control_to_payload(doc, method=None):
    api_url, api_key = _get_payload_config()
    if not api_url or not api_key:
        return

    payload_data = {
        "name": getattr(doc, "position_name", doc.name),
        "erpnext_id": doc.name,
        "tenant": getattr(doc, "cityos_tenant", ""),
        "source_system": "erpnext",
        "last_synced": cstr(now_datetime()),
        "department": getattr(doc, "department", ""),
        "designation": getattr(doc, "designation", ""),
        "grade": getattr(doc, "grade", ""),
        "budgeted": getattr(doc, "budgeted", 0),
        "status": getattr(doc, "status", "Active"),
    }

    try:
        response = requests.post(
            f"{api_url}/api/position-controls",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=payload_data,
            timeout=30,
        )
        if response.status_code not in (200, 201):
            frappe.log_error(f"Payload CMS position control sync failed: {response.status_code}", "CityOS Payload Sync")
        _create_outbox_event(doc, "position-controls", payload_data)
    except Exception as e:
        frappe.log_error(f"Payload CMS sync error: {str(e)}", "CityOS Payload Sync")


def detect_sync_conflicts(doctype, erpnext_doc_name):
    """Check if CMS has a newer version than ERPNext"""
    api_url, api_key = _get_payload_config()
    if not api_url or not api_key:
        return {"conflict_detected": False, "error": "Payload CMS not configured"}

    collection_map = {
        "Budget Program": "budget-programs",
        "Municipal Invoice": "municipal-invoices",
        "Funding Source": "funding-sources",
        "Fiscal Allocation": "fiscal-allocations",
        "CityOS Procurement Request": "procurement-requests",
        "Vendor Compliance Profile": "vendor-profiles",
        "Contract Register": "contract-registers",
        "Municipal Asset": "municipal-assets",
        "Capital Project": "capital-projects",
        "Position Control": "position-controls",
    }

    collection = collection_map.get(doctype)
    if not collection:
        return {"conflict_detected": False, "error": f"Unknown doctype: {doctype}"}

    try:
        erpnext_doc = frappe.get_doc(doctype, erpnext_doc_name)
        erpnext_modified = erpnext_doc.modified

        response = requests.get(
            f"{api_url}/api/{collection}",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            params={"where[erpnext_id][equals]": erpnext_doc_name},
            timeout=30,
        )

        if response.status_code != 200:
            return {"conflict_detected": False, "error": f"CMS request failed: {response.status_code}"}

        cms_data = response.json()
        docs = cms_data.get("docs", [])
        if not docs:
            return {"conflict_detected": False, "cms_modified": None, "erpnext_modified": cstr(erpnext_modified), "recommended_action": "push_to_cms"}

        cms_doc = docs[0]
        cms_modified = cms_doc.get("updatedAt", "")

        from frappe.utils import get_datetime
        cms_dt = get_datetime(cms_modified) if cms_modified else None
        erpnext_dt = get_datetime(erpnext_modified)

        if cms_dt and cms_dt > erpnext_dt:
            return {
                "conflict_detected": True,
                "cms_modified": cstr(cms_modified),
                "erpnext_modified": cstr(erpnext_modified),
                "recommended_action": "review_cms_changes",
            }

        return {
            "conflict_detected": False,
            "cms_modified": cstr(cms_modified),
            "erpnext_modified": cstr(erpnext_modified),
            "recommended_action": "safe_to_push",
        }
    except Exception as e:
        frappe.log_error(f"Conflict detection error: {str(e)}", "CityOS Payload Sync")
        return {"conflict_detected": False, "error": str(e)}


def handle_payload_webhook(data):
    collection = data.get("collection", "")
    operation = data.get("operation", "")
    doc_data = data.get("doc", {})

    handlers = {
        "tenants": _handle_tenant_sync,
        "stores": _handle_store_sync,
        "categories": _handle_category_sync,
        "scopes": _handle_scope_sync,
        "subcategories": _handle_subcategory_sync,
        "portals": _handle_portal_sync,
        "governance-authorities": _handle_governance_authority_sync,
        "policies": _handle_policy_sync,
        "personas": _handle_persona_sync,
        "persona-assignments": _handle_persona_assignment_sync,
        "countries": _handle_country_sync,
        "compliance-records": _handle_compliance_record_sync,
        "nodes": _handle_node_sync,
    }

    handler = handlers.get(collection)
    if handler:
        handler(operation, doc_data)
    else:
        frappe.log_error(
            f"Unhandled Payload CMS collection: {collection} (operation: {operation})",
            "CityOS Payload Sync",
        )


def _handle_tenant_sync(operation, data):
    tenant_id = data.get("id", "")
    tenant_name = data.get("name", "")
    if not tenant_id:
        return

    existing = frappe.db.get_value("Node Context", {"cms_ref_id": tenant_id}, "name")

    if operation == "delete":
        if existing:
            frappe.db.set_value("Node Context", existing, "status", "Archived")
        return

    tenant_tier = data.get("tenantTier", "")
    parent_tenant_data = data.get("parentTenant", {})
    parent_tenant_id = parent_tenant_data.get("id", "") if isinstance(parent_tenant_data, dict) else ""
    governance_data = data.get("governanceAuthority", {})
    governance_id = governance_data.get("id", "") if isinstance(governance_data, dict) else ""
    country_data = data.get("country", {})
    country_name = country_data.get("name", "") if isinstance(country_data, dict) else ""
    settings = data.get("settings", {}) or {}

    parent_tenant_name = ""
    if parent_tenant_id:
        parent_tenant_name = frappe.db.get_value("Node Context", {"cms_ref_id": parent_tenant_id}, "name") or ""

    governance_authority_name = ""
    if governance_id:
        governance_authority_name = frappe.db.get_value("Governance Authority", {"cms_ref_id": governance_id}, "name") or ""

    if existing:
        if operation in ("create", "update"):
            update_vals = {
                "context_name": tenant_name or existing,
                "tenant_tier": tenant_tier,
                "residency_zone": data.get("residencyZone", ""),
                "status": data.get("status", "Active"),
                "domain": data.get("domain", ""),
                "slug": data.get("slug", ""),
                "default_locale": settings.get("defaultLocale", "en-SA"),
                "timezone": settings.get("timezone", "Asia/Riyadh"),
            }
            if parent_tenant_name:
                update_vals["parent_tenant"] = parent_tenant_name
            if governance_authority_name:
                update_vals["governance_authority"] = governance_authority_name
            if country_name and frappe.db.exists("Country", country_name):
                update_vals["country"] = country_name
            frappe.db.set_value("Node Context", existing, update_vals)
    else:
        if operation in ("create", "update"):
            try:
                nc = frappe.new_doc("Node Context")
                nc.context_name = tenant_name or tenant_id
                nc.tenant = tenant_name or tenant_id
                nc.tenant_tier = tenant_tier
                nc.slug = data.get("slug", "")
                nc.domain = data.get("domain", "")
                nc.status = data.get("status", "Active")
                nc.residency_zone = data.get("residencyZone", "")
                nc.default_locale = settings.get("defaultLocale", "en-SA")
                nc.timezone = settings.get("timezone", "Asia/Riyadh")
                nc.cms_ref_id = tenant_id
                nc.enabled = 1
                if parent_tenant_name:
                    nc.parent_tenant = parent_tenant_name
                if governance_authority_name:
                    nc.governance_authority = governance_authority_name
                if country_name and frappe.db.exists("Country", country_name):
                    nc.country = country_name
                else:
                    nc.country = "Saudi Arabia"
                nc.flags.ignore_node_context = True
                nc.insert(ignore_permissions=True)
            except Exception as e:
                frappe.log_error(f"Payload tenant sync error: {str(e)}", "CityOS Payload Sync")


def _handle_store_sync(operation, data):
    store_id = data.get("id", "")
    store_name = data.get("name", "")
    if not store_id:
        return

    existing = frappe.db.get_value("CityOS Store", {"payload_store_id": store_id}, "name")

    if operation == "delete":
        if existing:
            frappe.db.set_value("CityOS Store", existing, "enabled", 0)
        return

    if existing:
        if operation in ("create", "update"):
            update_vals = {"store_name": store_name} if store_name else {}
            handle = data.get("handle", "")
            if handle:
                update_vals["store_handle"] = handle
            tenant_data = data.get("tenant", {})
            if isinstance(tenant_data, dict) and tenant_data.get("handle"):
                update_vals["tenant"] = tenant_data["handle"]
            if update_vals:
                frappe.db.set_value("CityOS Store", existing, update_vals)
    else:
        if operation in ("create", "update") and store_name:
            try:
                store = frappe.new_doc("CityOS Store")
                store.store_name = store_name
                store.store_handle = data.get("handle", store_name.lower().replace(" ", "-"))
                store.payload_store_id = store_id
                tenant_data = data.get("tenant", {})
                if isinstance(tenant_data, dict):
                    store.tenant = tenant_data.get("handle", "")
                store.flags.ignore_node_context = True
                store.insert(ignore_permissions=True)
            except Exception as e:
                frappe.log_error(f"Payload store sync error: {str(e)}", "CityOS Payload Sync")


def _handle_category_sync(operation, data):
    cat_id = data.get("id", "")
    cat_name = data.get("name", "")
    if not cat_id:
        return

    existing = frappe.db.get_value("CityOS Category", {"payload_category_id": cat_id}, "name")

    if operation == "delete":
        if existing:
            frappe.delete_doc("CityOS Category", existing, ignore_permissions=True, force=True)
        return

    if existing:
        if operation in ("create", "update"):
            update_vals = {}
            if cat_name:
                update_vals["category_name"] = cat_name
            code = data.get("code", "")
            if code:
                update_vals["category_code"] = code
            if update_vals:
                frappe.db.set_value("CityOS Category", existing, update_vals)
    else:
        if operation in ("create", "update") and cat_name:
            try:
                cat = frappe.new_doc("CityOS Category")
                cat.category_name = cat_name
                cat.category_code = data.get("code", "")
                cat.payload_category_id = cat_id
                scope_data = data.get("scope", {})
                if isinstance(scope_data, dict) and scope_data.get("name"):
                    scope_name = scope_data["name"]
                    if frappe.db.exists("CityOS Scope", scope_name):
                        cat.scope = scope_name
                cat.flags.ignore_node_context = True
                cat.insert(ignore_permissions=True)
            except Exception as e:
                frappe.log_error(f"Payload category sync error: {str(e)}", "CityOS Payload Sync")


def _handle_scope_sync(operation, data):
    scope_id = data.get("id", "")
    scope_name = data.get("name", "")
    if not scope_id:
        return

    existing = frappe.db.get_value("CityOS Scope", {"payload_scope_id": scope_id}, "name")

    if operation == "delete":
        if existing:
            frappe.delete_doc("CityOS Scope", existing, ignore_permissions=True, force=True)
        return

    if existing:
        if operation in ("create", "update"):
            update_vals = {}
            if scope_name:
                update_vals["scope_name"] = scope_name
            code = data.get("code", "")
            if code:
                update_vals["scope_code"] = code
            if update_vals:
                frappe.db.set_value("CityOS Scope", existing, update_vals)
    else:
        if operation in ("create", "update") and scope_name:
            try:
                scope = frappe.new_doc("CityOS Scope")
                scope.scope_name = scope_name
                scope.scope_code = data.get("code", "")
                scope.payload_scope_id = scope_id
                country_data = data.get("country", {})
                if isinstance(country_data, dict) and country_data.get("name"):
                    scope.country = country_data["name"]
                else:
                    scope.country = "Saudi Arabia"
                scope.flags.ignore_node_context = True
                scope.insert(ignore_permissions=True)
            except Exception as e:
                frappe.log_error(f"Payload scope sync error: {str(e)}", "CityOS Payload Sync")


def _handle_subcategory_sync(operation, data):
    subcat_id = data.get("id", "")
    subcat_name = data.get("name", "")
    if not subcat_id:
        return

    existing = frappe.db.get_value("CityOS Subcategory", {"payload_subcategory_id": subcat_id}, "name") if frappe.get_meta("CityOS Subcategory").has_field("payload_subcategory_id") else None

    if operation == "delete":
        if existing:
            frappe.delete_doc("CityOS Subcategory", existing, ignore_permissions=True, force=True)
        return

    if not existing and operation in ("create", "update") and subcat_name:
        try:
            subcat = frappe.new_doc("CityOS Subcategory")
            subcat.subcategory_name = subcat_name
            subcat.subcategory_code = data.get("code", "")
            if subcat.meta.has_field("payload_subcategory_id"):
                subcat.payload_subcategory_id = subcat_id
            category_data = data.get("category", {})
            if isinstance(category_data, dict) and category_data.get("name"):
                if frappe.db.exists("CityOS Category", category_data["name"]):
                    subcat.category = category_data["name"]
            subcat.flags.ignore_node_context = True
            subcat.insert(ignore_permissions=True)
        except Exception as e:
            frappe.log_error(f"Payload subcategory sync error: {str(e)}", "CityOS Payload Sync")


def _handle_portal_sync(operation, data):
    portal_id = data.get("id", "")
    portal_name = data.get("name", "")
    if not portal_id:
        return

    existing = frappe.db.get_value("CityOS Portal", {"payload_portal_id": portal_id}, "name") if frappe.get_meta("CityOS Portal").has_field("payload_portal_id") else None

    if operation == "delete":
        if existing:
            frappe.delete_doc("CityOS Portal", existing, ignore_permissions=True, force=True)
        return

    if not existing and operation in ("create", "update") and portal_name:
        try:
            portal = frappe.new_doc("CityOS Portal")
            portal.portal_name = portal_name
            if portal.meta.has_field("payload_portal_id"):
                portal.payload_portal_id = portal_id
            portal.portal_url = data.get("url", "")
            store_data = data.get("store", {})
            if isinstance(store_data, dict) and store_data.get("name"):
                if frappe.db.exists("CityOS Store", store_data["name"]):
                    portal.store = store_data["name"]
            portal.flags.ignore_node_context = True
            portal.insert(ignore_permissions=True)
        except Exception as e:
            frappe.log_error(f"Payload portal sync error: {str(e)}", "CityOS Payload Sync")


def _handle_governance_authority_sync(operation, data):
    ga_id = data.get("id", "")
    ga_name = data.get("name", "")
    if not ga_id:
        return

    existing = frappe.db.get_value("Governance Authority", {"cms_ref_id": ga_id}, "name")

    if operation == "delete":
        if existing:
            frappe.db.set_value("Governance Authority", existing, "status", "Inactive")
        return

    if existing:
        if operation in ("create", "update"):
            update_vals = {}
            if ga_name:
                update_vals["authority_name"] = ga_name
            auth_type = data.get("authorityType", "")
            if auth_type:
                update_vals["authority_type"] = auth_type
            jurisdiction = data.get("jurisdictionLevel", "")
            if jurisdiction:
                update_vals["jurisdiction_level"] = jurisdiction
            rz = data.get("residencyZone", "")
            if rz:
                update_vals["residency_zone"] = rz
            status = data.get("status", "")
            if status:
                update_vals["status"] = status
            if update_vals:
                frappe.db.set_value("Governance Authority", existing, update_vals)
    else:
        if operation in ("create", "update") and ga_name:
            try:
                ga = frappe.new_doc("Governance Authority")
                ga.authority_name = ga_name
                ga.authority_type = data.get("authorityType", "Regulatory")
                ga.jurisdiction_level = data.get("jurisdictionLevel", "COUNTRY")
                ga.residency_zone = data.get("residencyZone", "")
                ga.status = data.get("status", "Active")
                ga.cms_ref_id = ga_id
                parent_data = data.get("parentAuthority", {})
                if isinstance(parent_data, dict) and parent_data.get("id"):
                    parent_name = frappe.db.get_value("Governance Authority", {"cms_ref_id": parent_data["id"]}, "name")
                    if parent_name:
                        ga.parent_authority = parent_name
                ga.flags.ignore_node_context = True
                ga.insert(ignore_permissions=True)
            except Exception as e:
                frappe.log_error(f"Payload governance authority sync error: {str(e)}", "CityOS Payload Sync")


def _handle_policy_sync(operation, data):
    policy_id = data.get("id", "")
    policy_name = data.get("name", "")
    if not policy_id:
        return

    existing = frappe.db.get_value("Policy Doctrine", {"cms_ref_id": policy_id}, "name")

    if operation == "delete":
        if existing:
            frappe.db.set_value("Policy Doctrine", existing, "status", "Revoked")
        return

    if existing:
        if operation in ("create", "update"):
            update_vals = {}
            if policy_name:
                update_vals["policy_name"] = policy_name
            pt = data.get("policyType", "")
            if pt:
                update_vals["policy_type"] = pt
            sl = data.get("scopeLevel", "")
            if sl:
                update_vals["scope_level"] = sl
            el = data.get("enforcementLevel", "")
            if el:
                update_vals["enforcement_level"] = el
            im = data.get("inheritanceMode", "")
            if im:
                update_vals["inheritance_mode"] = im
            status = data.get("status", "")
            if status:
                update_vals["status"] = status
            if update_vals:
                frappe.db.set_value("Policy Doctrine", existing, update_vals)
    else:
        if operation in ("create", "update") and policy_name:
            try:
                policy = frappe.new_doc("Policy Doctrine")
                policy.policy_name = policy_name
                policy.policy_type = data.get("policyType", "Compliance")
                policy.scope_level = data.get("scopeLevel", "COUNTRY")
                policy.enforcement_level = data.get("enforcementLevel", "Mandatory")
                policy.inheritance_mode = data.get("inheritanceMode", "Inherit")
                policy.status = data.get("status", "Active")
                policy.cms_ref_id = policy_id
                ga_data = data.get("governanceAuthority", {})
                if isinstance(ga_data, dict) and ga_data.get("id"):
                    ga_name = frappe.db.get_value("Governance Authority", {"cms_ref_id": ga_data["id"]}, "name")
                    if ga_name:
                        policy.governance_authority = ga_name
                policy.flags.ignore_node_context = True
                policy.insert(ignore_permissions=True)
            except Exception as e:
                frappe.log_error(f"Payload policy sync error: {str(e)}", "CityOS Payload Sync")


def _handle_persona_sync(operation, data):
    persona_id = data.get("id", "")
    persona_name = data.get("name", "")
    if not persona_id:
        return

    existing = frappe.db.get_value("CityOS Persona", {"cms_ref_id": persona_id}, "name")

    if operation == "delete":
        if existing:
            frappe.db.set_value("CityOS Persona", existing, "status", "Inactive")
        return

    if existing:
        if operation in ("create", "update"):
            update_vals = {}
            if persona_name:
                update_vals["persona_name"] = persona_name
            pt = data.get("personaType", "")
            if pt:
                update_vals["persona_type"] = pt
            code = data.get("personaCode", "")
            if code:
                update_vals["persona_code"] = code
            status = data.get("status", "")
            if status:
                update_vals["status"] = status
            if update_vals:
                frappe.db.set_value("CityOS Persona", existing, update_vals)
    else:
        if operation in ("create", "update") and persona_name:
            try:
                persona = frappe.new_doc("CityOS Persona")
                persona.persona_name = persona_name
                persona.persona_type = data.get("personaType", "Citizen")
                persona.persona_code = data.get("personaCode", "")
                persona.status = data.get("status", "Active")
                persona.cms_ref_id = persona_id
                persona.flags.ignore_node_context = True
                persona.insert(ignore_permissions=True)
            except Exception as e:
                frappe.log_error(f"Payload persona sync error: {str(e)}", "CityOS Payload Sync")


def _handle_persona_assignment_sync(operation, data):
    assignment_id = data.get("id", "")
    if not assignment_id:
        return

    existing = frappe.db.get_value("CityOS Persona Assignment", {"cms_ref_id": assignment_id}, "name")

    if operation == "delete":
        if existing:
            frappe.db.set_value("CityOS Persona Assignment", existing, "status", "Revoked")
        return

    persona_data = data.get("persona", {})
    tenant_data = data.get("tenant", {})

    if not existing and operation in ("create", "update"):
        persona_id = persona_data.get("id", "") if isinstance(persona_data, dict) else ""
        tenant_id = tenant_data.get("id", "") if isinstance(tenant_data, dict) else ""

        persona_name = frappe.db.get_value("CityOS Persona", {"cms_ref_id": persona_id}, "name") if persona_id else ""
        tenant_name = frappe.db.get_value("Node Context", {"cms_ref_id": tenant_id}, "name") if tenant_id else ""

        if persona_name and tenant_name:
            try:
                assignment = frappe.new_doc("CityOS Persona Assignment")
                assignment.persona = persona_name
                assignment.tenant = tenant_name
                assignment.effective_date = data.get("effectiveDate") or now_datetime().date()
                assignment.expiry_date = data.get("expiryDate", "")
                assignment.status = data.get("status", "Active")
                assignment.cms_ref_id = assignment_id
                user_data = data.get("user", {})
                if isinstance(user_data, dict) and user_data.get("email"):
                    if frappe.db.exists("User", user_data["email"]):
                        assignment.user = user_data["email"]
                assignment.flags.ignore_node_context = True
                assignment.insert(ignore_permissions=True)
            except Exception as e:
                frappe.log_error(f"Payload persona assignment sync error: {str(e)}", "CityOS Payload Sync")


def _handle_country_sync(operation, data):
    country_name = data.get("name", "")
    if not country_name:
        return
    if not frappe.db.exists("Country", country_name):
        frappe.log_error(f"Country '{country_name}' not found in ERPNext", "CityOS Payload Sync")


def _handle_compliance_record_sync(operation, data):
    record_id = data.get("id", "")
    if not record_id:
        return

    try:
        audit = frappe.new_doc("CityOS Audit Log")
        audit.document_type = "Compliance Record"
        audit.document_name = record_id
        audit.action = data.get("action", "Compliance Check")
        audit.user = data.get("performedBy", "System")
        audit.details = json.dumps({
            "cms_compliance_record": record_id,
            "check_type": data.get("checkType", ""),
            "result": data.get("result", ""),
            "severity": data.get("severity", ""),
            "source": "Payload CMS",
        }, default=str)
        audit.flags.ignore_node_context = True
        audit.flags.ignore_permissions = True
        audit.insert(ignore_permissions=True)
    except Exception as e:
        frappe.log_error(f"Payload compliance record sync error: {str(e)}", "CityOS Payload Sync")


def _handle_node_sync(operation, data):
    node_id = data.get("id", "")
    node_type = data.get("nodeType", "")
    if not node_id:
        return

    type_to_handler = {
        "scope": lambda op, d: _handle_scope_sync(op, d),
        "category": lambda op, d: _handle_category_sync(op, d),
        "subcategory": lambda op, d: _handle_subcategory_sync(op, d),
        "store": lambda op, d: _handle_store_sync(op, d),
        "portal": lambda op, d: _handle_portal_sync(op, d),
    }

    handler = type_to_handler.get(node_type)
    if handler:
        handler(operation, data)
