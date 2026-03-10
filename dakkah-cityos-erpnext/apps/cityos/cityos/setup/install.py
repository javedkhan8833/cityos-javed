import frappe
from frappe import _


def after_install():
    create_cityos_roles()
    add_node_context_custom_fields()
    frappe.db.commit()
    print("CityOS: Post-install setup complete")


def after_migrate():
    add_node_context_custom_fields()
    frappe.db.commit()


def create_cityos_roles():
    roles = [
        {"role_name": "CityOS Administrator", "desk_access": 1},
        {"role_name": "CityOS Finance Manager", "desk_access": 1},
        {"role_name": "CityOS Procurement Officer", "desk_access": 1},
        {"role_name": "CityOS Asset Manager", "desk_access": 1},
        {"role_name": "CityOS HR Manager", "desk_access": 1},
        {"role_name": "CityOS Project Manager", "desk_access": 1},
        {"role_name": "CityOS Compliance Officer", "desk_access": 1},
        {"role_name": "CityOS Auditor", "desk_access": 1},
        {"role_name": "CityOS Citizen Services", "desk_access": 1},
        {"role_name": "CityOS Store Manager", "desk_access": 1},
        {"role_name": "CityOS Vendor Manager", "desk_access": 1},
        {"role_name": "CityOS Governance Officer", "desk_access": 1},
        {"role_name": "CityOS Policy Manager", "desk_access": 1},
    ]
    for role in roles:
        if not frappe.db.exists("Role", role["role_name"]):
            doc = frappe.new_doc("Role")
            doc.role_name = role["role_name"]
            doc.desk_access = role.get("desk_access", 1)
            doc.insert(ignore_permissions=True)
            print(f"CityOS: Created role '{role['role_name']}'")


NODE_CONTEXT_FIELDS = [
    {
        "fieldname": "cityos_section_break",
        "label": "CityOS Governance",
        "fieldtype": "Section Break",
        "insert_after": "naming_series",
        "collapsible": 1,
    },
    {
        "fieldname": "cityos_tenant",
        "label": "CityOS Tenant",
        "fieldtype": "Link",
        "options": "Node Context",
        "insert_after": "cityos_section_break",
        "in_standard_filter": 1,
    },
    {
        "fieldname": "cityos_country",
        "label": "CityOS Country",
        "fieldtype": "Link",
        "options": "Country",
        "insert_after": "cityos_tenant",
        "in_standard_filter": 1,
    },
    {
        "fieldname": "cityos_scope",
        "label": "CityOS Scope",
        "fieldtype": "Link",
        "options": "CityOS Scope",
        "insert_after": "cityos_country",
        "in_standard_filter": 1,
    },
    {
        "fieldname": "cityos_column_break_1",
        "fieldtype": "Column Break",
        "insert_after": "cityos_scope",
    },
    {
        "fieldname": "cityos_category",
        "label": "CityOS Category",
        "fieldtype": "Link",
        "options": "CityOS Category",
        "insert_after": "cityos_column_break_1",
    },
    {
        "fieldname": "cityos_subcategory",
        "label": "CityOS Subcategory",
        "fieldtype": "Link",
        "options": "CityOS Subcategory",
        "insert_after": "cityos_category",
    },
    {
        "fieldname": "cityos_store",
        "label": "CityOS Store",
        "fieldtype": "Link",
        "options": "CityOS Store",
        "insert_after": "cityos_subcategory",
    },
    {
        "fieldname": "cityos_section_break_2",
        "label": "CityOS Integration",
        "fieldtype": "Section Break",
        "insert_after": "cityos_store",
        "collapsible": 1,
    },
    {
        "fieldname": "cityos_city",
        "label": "CityOS City",
        "fieldtype": "Data",
        "insert_after": "cityos_section_break_2",
    },
    {
        "fieldname": "cityos_sector",
        "label": "CityOS Sector",
        "fieldtype": "Data",
        "insert_after": "cityos_city",
    },
    {
        "fieldname": "cityos_column_break_2",
        "fieldtype": "Column Break",
        "insert_after": "cityos_sector",
    },
    {
        "fieldname": "cityos_correlation_id",
        "label": "Correlation ID",
        "fieldtype": "Data",
        "insert_after": "cityos_column_break_2",
        "read_only": 1,
        "hidden": 1,
    },
    {
        "fieldname": "cityos_source_system",
        "label": "Source System",
        "fieldtype": "Select",
        "options": "\nERPNext\nMedusa Commerce\nPayload CMS\nTemporal Workflow\nManual",
        "insert_after": "cityos_correlation_id",
        "read_only": 1,
    },
    {
        "fieldname": "cityos_source_ref_id",
        "label": "Source Reference ID",
        "fieldtype": "Data",
        "insert_after": "cityos_source_system",
        "read_only": 1,
    },
    {
        "fieldname": "cityos_workflow_state",
        "label": "CityOS Workflow State",
        "fieldtype": "Data",
        "insert_after": "cityos_source_ref_id",
        "read_only": 1,
    },
]

ERPNEXT_DOCTYPES_TO_EXTEND = [
    "Sales Invoice",
    "Purchase Invoice",
    "Purchase Order",
    "Purchase Receipt",
    "Supplier",
    "Customer",
    "Item",
    "Asset",
    "Project",
    "Employee",
    "Journal Entry",
    "Payment Entry",
    "Stock Entry",
    "Material Request",
    "Request for Quotation",
    "Quotation",
    "Delivery Note",
    "Warehouse",
    "Cost Center",
    "Budget",
    "Company",
    "Sales Order",
    "BOM",
    "Work Order",
    "Timesheet",
    "Expense Claim",
    "Loan",
    "Subscription",
]


def add_node_context_custom_fields():
    from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

    custom_fields = {}
    for dt in ERPNEXT_DOCTYPES_TO_EXTEND:
        if frappe.db.exists("DocType", dt):
            custom_fields[dt] = [
                dict(field, owner="cityos") for field in NODE_CONTEXT_FIELDS
            ]

    if custom_fields:
        create_custom_fields(custom_fields, update=True)
        print(f"CityOS: Added NodeContext fields to {len(custom_fields)} doctypes")
