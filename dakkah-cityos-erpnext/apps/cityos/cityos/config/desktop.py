from frappe import _


def get_data():
    return [
        {
            "module_name": "Governance",
            "category": "Modules",
            "label": _("CityOS Governance"),
            "icon": "octicon octicon-shield",
            "type": "module",
            "description": _("Node Context, Audit Logs, and Policy Management"),
            "color": "#1a73e8",
        },
        {
            "module_name": "Finance",
            "category": "Modules",
            "label": _("CityOS Finance"),
            "icon": "octicon octicon-credit-card",
            "type": "module",
            "description": _("Municipal Finance, Budgets, Grants, and Settlements"),
            "color": "#0d9488",
        },
        {
            "module_name": "Procurement",
            "category": "Modules",
            "label": _("CityOS Procurement"),
            "icon": "octicon octicon-package",
            "type": "module",
            "description": _("Vendor Management, Contracts, Tenders, and Purchase Orders"),
            "color": "#7c3aed",
        },
        {
            "module_name": "Assets Management",
            "category": "Modules",
            "label": _("CityOS Assets"),
            "icon": "octicon octicon-server",
            "type": "module",
            "description": _("Municipal Assets, Facilities, and Maintenance"),
            "color": "#ea580c",
        },
        {
            "module_name": "HR Management",
            "category": "Modules",
            "label": _("CityOS HR"),
            "icon": "octicon octicon-people",
            "type": "module",
            "description": _("Position Control, Staff Assignments, and Training"),
            "color": "#2563eb",
        },
        {
            "module_name": "CityOS Projects",
            "category": "Modules",
            "label": _("CityOS Projects"),
            "icon": "octicon octicon-project",
            "type": "module",
            "description": _("Capital Projects, Milestones, and Community Impact"),
            "color": "#059669",
        },
        {
            "module_name": "Compliance",
            "category": "Modules",
            "label": _("CityOS Compliance"),
            "icon": "octicon octicon-law",
            "type": "module",
            "description": _("Regulatory Requirements, Policy Enforcement, and Evidence"),
            "color": "#dc2626",
        },
    ]
