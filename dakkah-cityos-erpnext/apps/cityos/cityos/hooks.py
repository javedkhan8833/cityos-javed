from . import __version__ as app_version

app_name = "cityos"
app_title = "Dakkah CityOS"
app_publisher = "Dakkah CityOS"
app_description = "CityOS-Grade ERP Extension for Municipal Government & Smart City Operations"
app_email = "dev@dakkah.io"
app_license = "MIT"
app_icon = "octicon octicon-globe"
app_color = "#1a73e8"
app_logo_url = "/assets/cityos/images/cityos-logo.svg"

add_to_apps_screen = [
    {
        "name": "cityos",
        "logo": "/assets/cityos/images/cityos-logo.svg",
        "title": "Dakkah CityOS",
        "route": "/app/cityos-home",
        "has_permission": "cityos.check_app_permission",
    }
]

required_apps = ["frappe", "erpnext"]

app_include_js = []
app_include_css = []

after_install = "cityos.setup.install.after_install"
after_migrate = "cityos.setup.install.after_migrate"

fixtures = [
    {
        "doctype": "Role",
        "filters": [["name", "like", "CityOS%"]],
    },
    {
        "doctype": "Custom Field",
        "filters": [["name", "like", "cityos_%"]],
    },
]

doc_events = {
    "*": {
        "validate": "cityos.governance.node_context.validate_node_context",
        "after_insert": "cityos.governance.audit.log_document_create",
        "on_update": "cityos.governance.audit.log_document_change",
        "on_submit": "cityos.governance.audit.log_document_submit",
        "on_cancel": "cityos.governance.audit.log_document_cancel",
        "on_trash": "cityos.governance.audit.log_document_delete",
    },
    "Sales Invoice": {
        "on_submit": "cityos.integrations.medusa_sync.on_invoice_submit",
    },
    "Payment Entry": {
        "on_submit": "cityos.integrations.medusa_sync.on_payment_submit",
    },
    "Governance Authority": {
        "after_insert": "cityos.integrations.payload_sync.sync_governance_authority_to_payload",
        "on_update": "cityos.integrations.payload_sync.sync_governance_authority_to_payload",
    },
    "Policy Doctrine": {
        "after_insert": "cityos.integrations.payload_sync.sync_policy_to_payload",
        "on_update": "cityos.integrations.payload_sync.sync_policy_to_payload",
    },
    "CityOS Persona": {
        "after_insert": "cityos.integrations.payload_sync.sync_persona_to_payload",
        "on_update": "cityos.integrations.payload_sync.sync_persona_to_payload",
    },
    "Budget Program": {
        "on_update": "cityos.integrations.payload_sync.sync_budget_program_to_payload",
    },
    "Municipal Invoice": {
        "on_submit": "cityos.integrations.payload_sync.sync_municipal_invoice_to_payload",
    },
    "Funding Source": {
        "on_update": "cityos.integrations.payload_sync.sync_funding_source_to_payload",
    },
    "CityOS Procurement Request": {
        "on_update": "cityos.integrations.payload_sync.sync_procurement_request_to_payload",
    },
    "Vendor Compliance Profile": {
        "on_update": "cityos.integrations.payload_sync.sync_vendor_profile_to_payload",
    },
    "Contract Register": {
        "on_update": "cityos.integrations.payload_sync.sync_contract_to_payload",
    },
    "Municipal Asset": {
        "on_update": "cityos.integrations.payload_sync.sync_municipal_asset_to_payload",
    },
    "Capital Project": {
        "on_update": "cityos.integrations.payload_sync.sync_capital_project_to_payload",
    },
    "Fiscal Allocation": {
        "on_update": "cityos.integrations.payload_sync.sync_fiscal_allocation_to_payload",
    },
    "Position Control": {
        "on_update": "cityos.integrations.payload_sync.sync_position_control_to_payload",
    },
}

permission_query_conditions = {
    "Sales Invoice": "cityos.governance.node_context.get_permission_query_conditions",
    "Purchase Invoice": "cityos.governance.node_context.get_permission_query_conditions",
    "Purchase Order": "cityos.governance.node_context.get_permission_query_conditions",
    "Purchase Receipt": "cityos.governance.node_context.get_permission_query_conditions",
    "Supplier": "cityos.governance.node_context.get_permission_query_conditions",
    "Customer": "cityos.governance.node_context.get_permission_query_conditions",
    "Item": "cityos.governance.node_context.get_permission_query_conditions",
    "Asset": "cityos.governance.node_context.get_permission_query_conditions",
    "Project": "cityos.governance.node_context.get_permission_query_conditions",
    "Employee": "cityos.governance.node_context.get_permission_query_conditions",
    "Journal Entry": "cityos.governance.node_context.get_permission_query_conditions",
    "Payment Entry": "cityos.governance.node_context.get_permission_query_conditions",
    "Sales Order": "cityos.governance.node_context.get_permission_query_conditions",
    "Delivery Note": "cityos.governance.node_context.get_permission_query_conditions",
    "Material Request": "cityos.governance.node_context.get_permission_query_conditions",
    "Quotation": "cityos.governance.node_context.get_permission_query_conditions",
    "Budget Program": "cityos.governance.node_context.get_permission_query_conditions",
    "Municipal Invoice": "cityos.governance.node_context.get_permission_query_conditions",
    "Municipal Asset": "cityos.governance.node_context.get_permission_query_conditions",
    "Capital Project": "cityos.governance.node_context.get_permission_query_conditions",
    "Contract Register": "cityos.governance.node_context.get_permission_query_conditions",
    "Governance Authority": "cityos.governance.node_context.get_permission_query_conditions",
    "Policy Doctrine": "cityos.governance.node_context.get_permission_query_conditions",
    "CityOS Persona": "cityos.governance.node_context.get_permission_query_conditions",
    "CityOS Persona Assignment": "cityos.governance.node_context.get_permission_query_conditions",
    "Funding Source": "cityos.governance.node_context.get_permission_query_conditions",
    "Fiscal Allocation": "cityos.governance.node_context.get_permission_query_conditions",
    "CityOS Procurement Request": "cityos.governance.node_context.get_permission_query_conditions",
    "Vendor Compliance Profile": "cityos.governance.node_context.get_permission_query_conditions",
    "Municipal Facility": "cityos.governance.node_context.get_permission_query_conditions",
    "Maintenance Plan": "cityos.governance.node_context.get_permission_query_conditions",
    "Position Control": "cityos.governance.node_context.get_permission_query_conditions",
    "Staff Assignment": "cityos.governance.node_context.get_permission_query_conditions",
    "Community Impact Report": "cityos.governance.node_context.get_permission_query_conditions",
}

has_permission = {}

override_whitelisted_methods = {}

api_methods = {
    "cityos.integrations.webhooks.medusa_webhook": {"methods": ["POST"]},
    "cityos.integrations.webhooks.payload_webhook": {"methods": ["POST"]},
    "cityos.integrations.webhooks.temporal_webhook": {"methods": ["POST"]},
    "cityos.integrations.webhooks.get_integration_status": {"methods": ["GET"]},
    "cityos.integrations.cms_client.test_cms_connection": {"methods": ["GET"]},
    "cityos.integrations.cms_client.fetch_cms_hierarchy": {"methods": ["GET"]},
    "cityos.integrations.cms_client.fetch_cms_workflows": {"methods": ["GET"]},
    "cityos.integrations.temporal_sync.test_temporal_connection": {"methods": ["GET"]},
    "cityos.integrations.temporal_sync.trigger_workflow": {"methods": ["POST"]},
    "cityos.integrations.temporal_sync.get_workflow_types": {"methods": ["GET"]},
    "cityos.integrations.temporal_sync.get_workflow_status": {"methods": ["GET"]},
    "cityos.integrations.workflow_registry.get_workflow_registry_status": {"methods": ["GET"]},
    "cityos.integrations.workflow_registry.trigger_discovery": {"methods": ["POST"]},
    "cityos.integrations.cms_client.trigger_cms_sync": {"methods": ["POST"]},
}

scheduler_events = {
    "hourly": [
        "cityos.integrations.outbox.publish_pending_events",
        "cityos.integrations.workflow_registry.poll_registry_updates",
    ],
    "daily": [
        "cityos.compliance.checks.run_daily_compliance_checks",
    ],
    "cron": {
        "*/15 * * * *": [
            "cityos.integrations.medusa_sync.sync_pending_orders",
            "cityos.integrations.cms_client.sync_hierarchy_from_cms",
        ],
    },
}

on_login = "cityos.integrations.workflow_registry.on_boot_discovery"

website_route_rules = [
    {"from_route": "/cityos/<path:app_path>", "to_route": "cityos"},
]

domains = {
    "Municipal Government": "cityos.domains.municipal_government",
    "Smart City": "cityos.domains.smart_city",
}
