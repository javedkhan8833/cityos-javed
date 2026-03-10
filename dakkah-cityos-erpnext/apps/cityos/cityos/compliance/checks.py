import frappe
from frappe.utils import now_datetime, add_days


def run_daily_compliance_checks():
    check_missing_tenant()
    check_stale_workflow_states()
    check_orphan_stores()
    check_overdue_maintenance()
    check_governance_chain_integrity()
    check_hierarchy_integrity()
    check_cross_system_sync_health()
    check_expired_persona_assignments()
    check_policy_expiry()
    frappe.db.commit()


def check_missing_tenant():
    doctypes_to_check = [
        "Sales Invoice", "Purchase Invoice", "Customer", "Supplier",
        "Item", "Project", "Employee", "Budget Program",
        "Municipal Invoice", "Municipal Asset", "Capital Project",
    ]

    for dt in doctypes_to_check:
        if not frappe.db.exists("DocType", dt):
            continue

        meta = frappe.get_meta(dt)
        if not meta.has_field("cityos_tenant"):
            continue

        count = frappe.db.count(dt, filters={
            "cityos_tenant": ["in", ["", None]],
            "docstatus": ["!=", 2],
        })

        if count > 0:
            _log_compliance_finding(
                "Missing Tenant Assignment",
                f"{count} {dt} records have no CityOS tenant assigned",
                "Warning",
                dt,
            )


def check_stale_workflow_states():
    if not frappe.db.exists("DocType", "Integration Outbox Event"):
        return

    stale_count = frappe.db.count("Integration Outbox Event", filters={
        "status": "Processing",
        "last_attempt": ["<", add_days(now_datetime(), -1)],
    })

    if stale_count > 0:
        _log_compliance_finding(
            "Stale Processing Events",
            f"{stale_count} outbox events stuck in Processing state for >24 hours",
            "Critical",
            "Integration Outbox Event",
        )

    dead_count = frappe.db.count("Integration Outbox Event", filters={
        "status": "Dead Letter",
    })

    if dead_count > 0:
        _log_compliance_finding(
            "Dead Letter Events",
            f"{dead_count} outbox events in Dead Letter state requiring manual intervention",
            "Warning",
            "Integration Outbox Event",
        )


def check_orphan_stores():
    if not frappe.db.exists("DocType", "CityOS Store"):
        return

    stores = frappe.get_all("CityOS Store", filters={"enabled": 1}, fields=["name", "tenant"])
    for store in stores:
        if not store.get("tenant", ""):
            _log_compliance_finding(
                "Orphan Store",
                "Store '{}' has no tenant assigned".format(store.get("name", "")),
                "Warning",
                "CityOS Store",
            )


def check_overdue_maintenance():
    if not frappe.db.exists("DocType", "Maintenance Plan"):
        return

    overdue = frappe.db.count("Maintenance Plan", filters={
        "status": "Scheduled",
        "next_due_date": ["<", now_datetime()],
    })

    if overdue > 0:
        _log_compliance_finding(
            "Overdue Maintenance Plans",
            f"{overdue} maintenance plans are overdue",
            "Warning",
            "Maintenance Plan",
        )


def check_governance_chain_integrity():
    if not frappe.db.exists("DocType", "Node Context"):
        return

    tenants = frappe.get_all(
        "Node Context",
        filters={"enabled": 1},
        fields=["name", "context_name", "tenant_tier", "parent_tenant", "governance_authority", "status"],
    )

    valid_tier_parents = {
        "MASTER": [],
        "GLOBAL": ["MASTER"],
        "REGIONAL": ["GLOBAL", "MASTER"],
        "COUNTRY": ["REGIONAL", "GLOBAL"],
        "CITY": ["COUNTRY"],
    }

    tier_map = {}
    for t in tenants:
        tier_map[t.get("name")] = t

    for tenant in tenants:
        tier = tenant.get("tenant_tier") or ""
        parent_name = tenant.get("parent_tenant") or ""

        if tier == "MASTER" and parent_name:
            _log_compliance_finding(
                "Invalid MASTER Hierarchy",
                f"MASTER tenant '{tenant.get('context_name')}' should not have a parent tenant",
                "Critical",
                "Node Context",
            )

        if tier and tier != "MASTER" and not parent_name:
            _log_compliance_finding(
                "Missing Parent Tenant",
                f"{tier} tenant '{tenant.get('context_name')}' has no parent tenant assigned",
                "Warning",
                "Node Context",
            )

        if parent_name and parent_name in tier_map:
            parent = tier_map[parent_name]
            parent_tier = parent.get("tenant_tier") or ""
            if tier and parent_tier:
                valid = valid_tier_parents.get(tier, [])
                if valid and parent_tier not in valid:
                    _log_compliance_finding(
                        "Invalid Tier Hierarchy",
                        f"Tenant '{tenant.get('context_name')}' ({tier}) has invalid parent tier ({parent_tier})",
                        "Critical",
                        "Node Context",
                    )


def check_hierarchy_integrity():
    if frappe.db.exists("DocType", "CityOS Category"):
        categories = frappe.get_all(
            "CityOS Category",
            fields=["name", "category_name", "scope"],
        )
        for cat in categories:
            scope = cat.get("scope") or ""
            if scope and not frappe.db.exists("CityOS Scope", scope):
                _log_compliance_finding(
                    "Broken Category-Scope Link",
                    f"Category '{cat.get('category_name')}' references non-existent scope '{scope}'",
                    "Critical",
                    "CityOS Category",
                )

    if frappe.db.exists("DocType", "CityOS Subcategory"):
        subcategories = frappe.get_all(
            "CityOS Subcategory",
            fields=["name", "subcategory_name", "category"],
        )
        for subcat in subcategories:
            category = subcat.get("category") or ""
            if category and not frappe.db.exists("CityOS Category", category):
                _log_compliance_finding(
                    "Broken Subcategory-Category Link",
                    f"Subcategory '{subcat.get('subcategory_name')}' references non-existent category",
                    "Critical",
                    "CityOS Subcategory",
                )

    if frappe.db.exists("DocType", "CityOS Portal"):
        portals = frappe.get_all(
            "CityOS Portal",
            fields=["name", "portal_name", "store"],
        )
        for portal in portals:
            store = portal.get("store") or ""
            if store and not frappe.db.exists("CityOS Store", store):
                _log_compliance_finding(
                    "Broken Portal-Store Link",
                    f"Portal '{portal.get('portal_name')}' references non-existent store '{store}'",
                    "Critical",
                    "CityOS Portal",
                )


def check_cross_system_sync_health():
    if not frappe.db.exists("DocType", "Integration Outbox Event"):
        return

    now = now_datetime()
    cutoff = add_days(now, -1)

    recent_failed = frappe.db.count("Integration Outbox Event", filters={
        "status": "Failed",
        "modified": [">=", cutoff],
    })

    if recent_failed > 10:
        _log_compliance_finding(
            "High Integration Failure Rate",
            f"{recent_failed} outbox events failed in the last 24 hours",
            "Critical",
            "Integration Outbox Event",
        )

    for target in ["Medusa Commerce", "Payload CMS", "Temporal Workflow"]:
        target_failed = frappe.db.count("Integration Outbox Event", filters={
            "status": ["in", ["Failed", "Dead Letter"]],
            "target_system": target,
            "modified": [">=", cutoff],
        })
        if target_failed > 5:
            _log_compliance_finding(
                f"{target} Sync Issues",
                f"{target_failed} failed events for {target} in the last 24 hours",
                "Warning",
                "Integration Outbox Event",
            )

    if frappe.db.exists("DocType", "Node Context"):
        unlinked = frappe.db.count("Node Context", filters={
            "cms_ref_id": ["in", ["", None]],
            "enabled": 1,
        })
        if unlinked > 0:
            _log_compliance_finding(
                "Unlinked CMS Tenants",
                f"{unlinked} active tenants have no CMS reference ID, indicating they may not be synced with Payload CMS",
                "Warning",
                "Node Context",
            )


def check_expired_persona_assignments():
    if not frappe.db.exists("DocType", "CityOS Persona Assignment"):
        return

    expired = frappe.db.count("CityOS Persona Assignment", filters={
        "status": "Active",
        "expiry_date": ["<", now_datetime()],
    })

    if expired > 0:
        _log_compliance_finding(
            "Expired Persona Assignments",
            f"{expired} persona assignments have expired but are still marked as active",
            "Warning",
            "CityOS Persona Assignment",
        )


def check_policy_expiry():
    if not frappe.db.exists("DocType", "Policy Doctrine"):
        return

    soon_expiring = frappe.db.count("Policy Doctrine", filters={
        "status": "Active",
        "expiry_date": ["between", [now_datetime(), add_days(now_datetime(), 30)]],
    })

    if soon_expiring > 0:
        _log_compliance_finding(
            "Policies Expiring Soon",
            f"{soon_expiring} active policies will expire within 30 days",
            "Warning",
            "Policy Doctrine",
        )

    expired = frappe.db.count("Policy Doctrine", filters={
        "status": "Active",
        "expiry_date": ["<", now_datetime()],
    })

    if expired > 0:
        _log_compliance_finding(
            "Expired Active Policies",
            f"{expired} policies have expired but are still marked as active",
            "Critical",
            "Policy Doctrine",
        )


def _log_compliance_finding(title, description, severity, doctype):
    try:
        if frappe.db.exists("DocType", "CityOS Audit Log"):
            audit = frappe.new_doc("CityOS Audit Log")
            audit.document_type = doctype
            audit.document_name = "Compliance Check"
            audit.action = "Escalated"
            audit.user = "Administrator"
            audit.details = f"[{severity}] {title}: {description}"
            audit.flags.ignore_node_context = True
            audit.flags.ignore_permissions = True
            audit.insert(ignore_permissions=True)
    except Exception:
        frappe.log_error(f"CityOS Compliance Check Error: {title}")
