import frappe

CITYOS_DOCTYPES = []

EXEMPT_DOCTYPES = [
    "Node Context",
    "Node Context Rule",
    "CityOS Audit Log",
    "CityOS Scope",
    "CityOS Category",
    "CityOS Subcategory",
    "CityOS Store",
    "CityOS Portal",
    "Integration Outbox Event",
    "Governance Authority",
    "Policy Doctrine",
    "CityOS Persona",
    "CityOS Persona Assignment",
    "DocType",
    "Module Def",
    "Role",
    "Custom Field",
    "Property Setter",
    "Print Format",
    "Report",
    "Page",
    "Workspace",
    "Dashboard",
    "Dashboard Chart",
    "Number Card",
    "System Settings",
    "User",
    "User Permission",
    "Has Role",
    "Communication",
    "Comment",
    "Version",
    "Activity Log",
    "Error Log",
    "Scheduled Job Log",
    "File",
    "ToDo",
    "Event",
    "Note",
    "Tag",
    "Tag Link",
    "Translation",
    "DefaultValue",
    "Singles",
    "Letter Head",
    "Print Style",
    "Navbar Settings",
    "Session Default Settings",
    "Notification Log",
    "Access Log",
    "Prepared Report",
    "Budget Funding Source",
    "Procurement Request Item",
    "Procurement Document Checklist",
    "Vendor Certificate",
    "Contract Milestone",
    "Contract Payment Schedule",
    "Contract Amendment",
    "Maintenance Parts Used",
    "Project Milestone",
]

CITYOS_STRICT_TENANT_DOCTYPES = [
    "Budget Program",
    "Municipal Invoice",
    "Funding Source",
    "Fiscal Allocation",
    "CityOS Procurement Request",
    "Vendor Compliance Profile",
    "Contract Register",
    "Municipal Asset",
    "Municipal Facility",
    "Maintenance Plan",
    "Position Control",
    "Staff Assignment",
    "Capital Project",
    "Community Impact Report",
    "Node Context",
    "CityOS Store",
    "CityOS Scope",
    "CityOS Category",
    "CityOS Subcategory",
    "CityOS Portal",
    "Governance Authority",
    "Policy Doctrine",
    "CityOS Persona",
    "CityOS Persona Assignment",
]

TIER_HIERARCHY = {
    "MASTER": 0,
    "GLOBAL": 1,
    "REGIONAL": 2,
    "COUNTRY": 3,
    "CITY": 4,
}

_tenant_tree_cache = {}


def validate_node_context(doc, method):
    if doc.doctype in EXEMPT_DOCTYPES:
        return

    if not doc.meta.has_field("cityos_tenant"):
        return

    if doc.flags.ignore_node_context:
        return

    if not doc.cityos_tenant and frappe.session.user != "Administrator":
        default_tenant = frappe.db.get_default("cityos_default_tenant")
        if default_tenant:
            doc.cityos_tenant = default_tenant

    if hasattr(doc, "cityos_scope") and doc.cityos_scope and hasattr(doc, "cityos_category") and doc.cityos_category:
        category_scope = frappe.db.get_value("CityOS Category", doc.cityos_category, "scope")
        if category_scope and category_scope != doc.cityos_scope:
            frappe.throw(
                f"Category '{doc.cityos_category}' does not belong to Scope '{doc.cityos_scope}'",
                title="Invalid CityOS Hierarchy"
            )

    if hasattr(doc, "cityos_category") and doc.cityos_category and hasattr(doc, "cityos_subcategory") and doc.cityos_subcategory:
        subcat_category = frappe.db.get_value("CityOS Subcategory", doc.cityos_subcategory, "category")
        if subcat_category and subcat_category != doc.cityos_category:
            frappe.throw(
                f"Subcategory '{doc.cityos_subcategory}' does not belong to Category '{doc.cityos_category}'",
                title="Invalid CityOS Hierarchy"
            )

    if hasattr(doc, "cityos_store") and doc.cityos_store and doc.cityos_tenant:
        store_tenant = frappe.db.get_value("CityOS Store", doc.cityos_store, "tenant")
        if store_tenant and store_tenant != doc.cityos_tenant:
            frappe.throw(
                f"Store '{doc.cityos_store}' does not belong to Tenant '{doc.cityos_tenant}'",
                title="Invalid CityOS Store Assignment"
            )


def get_child_tenants(tenant_name):
    global _tenant_tree_cache

    cache_key = f"children_{tenant_name}"
    if cache_key in _tenant_tree_cache:
        cached = _tenant_tree_cache[cache_key]
        if cached.get("timestamp") and (frappe.utils.now_datetime() - cached["timestamp"]).total_seconds() < 300:
            return cached["tenants"]

    children = set()
    try:
        direct_children = frappe.db.get_all(
            "Node Context",
            filters={"parent_tenant": tenant_name},
            pluck="name"
        )
        for child in direct_children:
            children.add(child)
            children.update(get_child_tenants(child))
    except Exception:
        pass

    _tenant_tree_cache[cache_key] = {
        "tenants": children,
        "timestamp": frappe.utils.now_datetime()
    }
    return children


def get_accessible_tenants(user=None):
    if not user:
        user = frappe.session.user

    if user == "Administrator":
        return None

    if "System Manager" in frappe.get_roles(user):
        return None

    if "CityOS Administrator" in frappe.get_roles(user):
        return None

    default_tenant = frappe.db.get_default("cityos_default_tenant")
    if not default_tenant:
        return set()

    accessible = {default_tenant}

    try:
        tenant_tier = frappe.db.get_value("Node Context", default_tenant, "tenant_tier")
        if tenant_tier and tenant_tier in ("MASTER", "GLOBAL", "REGIONAL", "COUNTRY"):
            children = get_child_tenants(default_tenant)
            accessible.update(children)
    except Exception:
        pass

    return accessible


def get_permission_query_conditions(user=None, doctype=None):
    if not user:
        user = frappe.session.user

    if user == "Administrator":
        return ""

    if "System Manager" in frappe.get_roles(user):
        return ""

    if "CityOS Administrator" in frappe.get_roles(user):
        return ""

    default_tenant = frappe.db.get_default("cityos_default_tenant")
    if not default_tenant:
        return "1=0"

    accessible = get_accessible_tenants(user)

    if accessible is None:
        return ""

    if not accessible:
        return "1=0"

    is_strict = doctype in CITYOS_STRICT_TENANT_DOCTYPES

    if len(accessible) == 1:
        tenant = list(accessible)[0]
        escaped = frappe.db.escape(tenant)
        if is_strict:
            return f"`tab{doctype}`.`cityos_tenant` = {escaped}"
        return f"(`tab{doctype}`.`cityos_tenant` = {escaped} OR `tab{doctype}`.`cityos_tenant` IS NULL OR `tab{doctype}`.`cityos_tenant` = '')"

    tenant_list = ", ".join([frappe.db.escape(t) for t in accessible])
    if is_strict:
        return f"`tab{doctype}`.`cityos_tenant` IN ({tenant_list})"
    return f"(`tab{doctype}`.`cityos_tenant` IN ({tenant_list}) OR `tab{doctype}`.`cityos_tenant` IS NULL OR `tab{doctype}`.`cityos_tenant` = '')"


def validate_tenant_access(tenant_id, user=None):
    if not tenant_id:
        return True

    accessible = get_accessible_tenants(user)

    if accessible is None:
        return True

    if tenant_id not in accessible:
        frappe.throw(
            f"You do not have access to tenant '{tenant_id}'",
            title="Tenant Access Denied"
        )
    return True


def clear_tenant_cache():
    global _tenant_tree_cache
    _tenant_tree_cache = {}
