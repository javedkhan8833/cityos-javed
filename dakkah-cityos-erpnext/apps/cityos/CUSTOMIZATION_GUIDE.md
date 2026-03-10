# CityOS ERPNext Customization Guide & Design Patterns

> **Version:** 1.0 | **Last Updated:** February 11, 2026
> **Audience:** Developers re-implementing or extending the CityOS platform on ERPNext/Frappe

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Multi-Tenancy Design](#2-multi-tenancy-design)
3. [Existing Customization Inventory](#3-existing-customization-inventory)
4. [Frappe Extension Points Used](#4-frappe-extension-points-used)
5. [Hybrid Company-NodeContext Strategy](#5-hybrid-company-nodecontext-strategy)
6. [Coverage Analysis & Gaps](#6-coverage-analysis--gaps)
7. [Design Patterns](#7-design-patterns)
8. [Integration Architecture](#8-integration-architecture)
9. [Testing Patterns](#9-testing-patterns)
10. [Re-Implementation Playbook](#10-re-implementation-playbook)

---

## 1. Architecture Overview

### Core Philosophy

CityOS extends ERPNext as a **CityOS-grade ERP** without modifying ERPNext or Frappe source code. All customizations live in the `cityos` custom app (`apps/cityos/`), using Frappe's documented extension points:

```
┌─────────────────────────────────────────────────────┐
│                   CityOS Custom App                  │
│  (governance, finance, procurement, assets, HR,      │
│   projects, compliance, integrations)                │
├─────────────────────────────────────────────────────┤
│                ERPNext v17.0.0-dev                    │
│  (accounts, stock, buying, selling, manufacturing,   │
│   assets, projects, HR, CRM, support)                │
├─────────────────────────────────────────────────────┤
│                  Frappe v15.99.0                      │
│  (framework, ORM, permissions, hooks, web server)    │
└─────────────────────────────────────────────────────┘
```

### Key Principle: Zero ERPNext Source Modifications

All customizations are achieved through:
- **Custom Fields** (`frappe.custom.doctype.custom_field`) — add fields to ERPNext doctypes
- **Hooks** (`hooks.py`) — intercept document events, add permission filters
- **Custom Doctypes** — new business entities defined entirely in CityOS app
- **Server Scripts / API Methods** — extend backend functionality
- **Fixtures** — export/import roles, custom fields, settings

The **only** ERPNext source patches are two PostgreSQL compatibility fixes in `erpnext/accounts/report/financial_statements.py` (documented in `replit.md`).

---

## 2. Multi-Tenancy Design

### 2.1 Key Concepts: Three Separate Hierarchies

CityOS defines three distinct hierarchies (often confused):

1. **Tenant Hierarchy** (Node Context `tenant_tier`): MASTER → GLOBAL → REGIONAL → COUNTRY → CITY
   - Controls data isolation and cascading visibility
   - Enforced via `parent_tenant` field and tier validation rules

2. **Organizational Taxonomy** (separate doctypes): Scope → Category → Subcategory
   - Classifies documents by organizational function
   - Validated on save via `validate_node_context` (category must belong to scope, etc.)

3. **Business Hierarchy** (separate doctypes): Tenant → Store → Portal
   - Maps to business units and customer-facing channels
   - Store must belong to the assigned tenant

These are **not tiers** — they are separate classification systems that coexist on each document.

### 2.2 Why Not ERPNext Company?

ERPNext's built-in `Company` doctype provides multi-entity financial separation. We chose a custom `Node Context` approach because:

| Requirement | Company | Node Context |
|-------------|---------|-------------|
| 5-tier hierarchy enforcement (MASTER→GLOBAL→REGIONAL→COUNTRY→CITY) | Simple parent-child, no tier rules | Strict tier validation with valid-parent rules |
| Non-financial doctype isolation (governance, compliance, personas) | Only covers doctypes with `company` field | Covers any doctype via `cityos_tenant` custom field |
| Hierarchical cascading visibility (parent sees children) | Not built into Company permissions | Built into `permission_query_conditions` |
| Cross-system tenant identity (Payload CMS, Medusa, Temporal) | Company concept doesn't extend outside ERPNext | `cityos_tenant` flows to all integrated systems |
| Governance metadata (authorities, policies, personas, domains) | No equivalent fields on Company | Full governance model on Node Context |

### 2.3 Current Multi-Tenancy Implementation

**Mechanism:** Single-database, row-level isolation using `cityos_tenant` field + `permission_query_conditions` hooks.

**Tier Hierarchy:**
```
MASTER (tier 0) — Platform-wide owner
  └── GLOBAL (tier 1) — Global operations
       └── REGIONAL (tier 2) — Regional grouping
            └── COUNTRY (tier 3) — Country-level
                 └── CITY (tier 4) — City/municipality level
```

**Valid Parent Rules (enforced in `NodeContext.validate`):**
| Tier | Valid Parents |
|------|-------------|
| MASTER | None (top-level) |
| GLOBAL | MASTER |
| REGIONAL | GLOBAL, MASTER |
| COUNTRY | REGIONAL, GLOBAL |
| CITY | COUNTRY |

**Access Model:**
- Administrators / System Managers / CityOS Administrators → see all data
- Regular users → see their tenant's data + all child tenant data (cascading)
- Users without tenant assignment → see nothing (default deny: `1=0`)

### 2.4 Proposed Hybrid: Company + Node Context (NOT YET IMPLEMENTED)

> **Status:** This is a planned architecture improvement. None of the code below exists yet. It is documented here as a design reference for future implementation.

**Future architecture:** Link each Node Context to an ERPNext Company record.

```
Node Context (Governance Truth)     Company (Operational Proxy)
┌─────────────────────────┐        ┌────────────────────────┐
│ name: "dakkah-riyadh"   │───────>│ name: "Dakkah Riyadh"  │
│ tenant_tier: CITY       │        │ parent_company: ...     │
│ governance_authority: ..│        │ default_currency: SAR   │
│ policies: [...]         │        │ chart_of_accounts: ...  │
│ personas: [...]         │        │ country: Saudi Arabia   │
└─────────────────────────┘        └────────────────────────┘
```

**Benefits:**
- 120+ ERPNext doctypes with `company` field get tenant isolation for free via User Permissions
- No need for `permission_query_conditions` on those 120+ doctypes
- ERPNext reports, dashboards, financial statements work natively per-company
- Node Context remains the governance truth for CityOS-specific features

**Implementation (all in CityOS app, zero ERPNext changes):**
1. Add `company` Link field to Node Context doctype JSON
2. Hook `after_insert` on Node Context to auto-create matching Company
3. Hook `on_update` on Node Context to sync changes to Company
4. When assigning users to tenants, also create `User Permission` for the linked Company
5. CityOS custom doctypes can optionally add a `company` field, or keep using `cityos_tenant` + PQC

---

## 3. Existing Customization Inventory

### 3.1 Custom Doctypes (35 total)

**Governance Module (12 doctypes):**

| Doctype | Type | Fields | Key Purpose |
|---------|------|--------|-------------|
| Node Context | Parent | 52 | Hierarchical tenant with 5-tier governance, geographic/organizational scoping |
| CityOS Scope | Parent | 11 | Top-level organizational scope |
| CityOS Category | Parent | 13 | Category within scope |
| CityOS Subcategory | Parent | 12 | Subcategory within category |
| CityOS Store | Parent | 28 | Business store/unit per tenant |
| CityOS Portal | Parent | 20 | Portal/channel configuration |
| CityOS Audit Log | Parent | 14 | Immutable audit trail for all CityOS-aware operations |
| Integration Outbox Event | Parent | 27 | Reliable event publishing for cross-system integration |
| Governance Authority | Parent | 20 | Governance bodies/authorities per tenant |
| Policy Doctrine | Parent | 24 | Policies linked to governance authorities |
| CityOS Persona | Parent | 17 | Persona definitions for access patterns |
| CityOS Persona Assignment | Parent | 15 | User-to-persona assignments |

**Finance Module (5 doctypes):**

| Doctype | Type | Fields | Has Tenant | Key Purpose |
|---------|------|--------|------------|-------------|
| Budget Program | Parent | 45 | Yes | Budget management with committed/actual/available tracking, funding source allocation |
| Funding Source | Parent | 36 | Yes | Funding sources with allocated/utilized tracking |
| Municipal Invoice | Parent | 49 | Yes | Municipal-specific invoicing with payment tracking, overdue detection |
| Fiscal Allocation | Parent | 35 | Yes | Fiscal period allocations |
| Budget Funding Source | Child | 3 | No | Child table for Budget Program funding sources |

**Procurement Module (7 doctypes):**

| Doctype | Type | Fields | Has Tenant | Key Purpose |
|---------|------|--------|------------|-------------|
| CityOS Procurement Request | Parent | 61 | Yes | Procurement with method thresholds, approval levels, document checks |
| Vendor Compliance Profile | Parent | 66 | Yes | Weighted compliance scoring 0-100, risk levels, certificate tracking |
| Contract Register | Parent | 58 | Yes | SLA compliance, amendments, retention, auto-expiry |
| Procurement Request Item | Child | 6 | No | Line items for procurement requests |
| Procurement Document Checklist | Child | 4 | No | Required documents per request |
| Vendor Certificate | Child | 7 | No | Certificates per vendor |
| Contract Milestone | Child | 7 | No | Contract milestones |
| Contract Payment Schedule | Child | 5 | No | Payment schedules |
| Contract Amendment | Child | 5 | No | Contract amendments |

**Assets Management Module (4 doctypes):**

| Doctype | Type | Fields | Has Tenant | Key Purpose |
|---------|------|--------|------------|-------------|
| Municipal Asset | Parent | 73 | Yes | Depreciation (straight-line/declining), disposal management |
| Municipal Facility | Parent | 61 | Yes | Occupancy rate, area validation |
| Maintenance Plan | Parent | 60 | Yes | Recurring schedules, parts costing, overdue detection |
| Maintenance Parts Used | Child | 5 | No | Parts used in maintenance |

**HR Management Module (2 doctypes):**

| Doctype | Type | Fields | Has Tenant | Key Purpose |
|---------|------|--------|------------|-------------|
| Position Control | Parent | 56 | Yes | Headcount/vacancy tracking, freeze/abolish validation |
| Staff Assignment | Parent | 53 | Yes | Vacancy checks, duplicate prevention, salary validation |

**Projects Module (3 doctypes):**

| Doctype | Type | Fields | Has Tenant | Key Purpose |
|---------|------|--------|------------|-------------|
| Capital Project | Parent | 78 | Yes | Financial tracking, milestone completion %, risk assessment |
| Community Impact Report | Parent | 46 | Yes | Weighted impact scoring, publishability validation |
| Project Milestone | Child | 7 | No | Milestones per project |

### 3.2 Custom Fields on ERPNext Doctypes

**28 ERPNext doctypes** receive CityOS NodeContext custom fields via `setup/install.py`:

```
Sales Invoice, Purchase Invoice, Purchase Order, Purchase Receipt,
Supplier, Customer, Item, Asset, Project, Employee, Journal Entry,
Payment Entry, Stock Entry, Material Request, Request for Quotation,
Quotation, Delivery Note, Warehouse, Cost Center, Budget, Company,
Sales Order, BOM, Work Order, Timesheet, Expense Claim, Loan, Subscription
```

**Fields added to each (18 fields):**
| Field | Type | Purpose |
|-------|------|---------|
| `cityos_tenant` | Link → Node Context | Primary tenant assignment |
| `cityos_country` | Link → Country | Geographic scoping |
| `cityos_scope` | Link → CityOS Scope | Organizational scope |
| `cityos_category` | Link → CityOS Category | Category classification |
| `cityos_subcategory` | Link → CityOS Subcategory | Subcategory classification |
| `cityos_store` | Link → CityOS Store | Store/unit assignment |
| `cityos_city` | Data | City identifier |
| `cityos_sector` | Data | Sector identifier |
| `cityos_correlation_id` | Data (read-only) | Cross-system correlation |
| `cityos_source_system` | Data (read-only) | Source system identifier |
| `cityos_source_ref_id` | Data (read-only) | Source system reference ID |
| `cityos_last_synced` | Datetime (read-only) | Last sync timestamp |

### 3.3 Custom Roles (13 roles)

```
CityOS Administrator, CityOS Finance Manager, CityOS Procurement Officer,
CityOS Asset Manager, CityOS HR Manager, CityOS Project Manager,
CityOS Compliance Officer, CityOS Auditor, CityOS Citizen Services,
CityOS Store Manager, CityOS Vendor Manager, CityOS Governance Officer,
CityOS Policy Manager
```

### 3.4 Hooks Summary

| Hook Type | Count | Description |
|-----------|-------|-------------|
| `doc_events["*"]` | 6 | Wildcard: validate_node_context + 5 audit log events |
| `doc_events` (specific) | 14 | Medusa sync (2), Payload CMS sync (12) |
| `permission_query_conditions` | 34 | Row-level tenant isolation |
| `api_methods` | 13 | Webhook endpoints, integration APIs |
| `scheduler_events` | 5 | Hourly (2), daily (2), cron/15min (1) |
| `fixtures` | 2 | Roles, Custom Fields |

---

## 4. Frappe Extension Points Used

### 4.1 doc_events (Document Lifecycle Hooks)

**Pattern:** Intercept document save/submit/delete without modifying the doctype's code.

```python
# hooks.py
doc_events = {
    "*": {  # Wildcard — fires for ALL doctypes
        "validate": "cityos.governance.node_context.validate_node_context",
        "after_insert": "cityos.governance.audit.log_document_create",
    },
    "Sales Invoice": {  # Specific doctype
        "on_submit": "cityos.integrations.medusa_sync.on_invoice_submit",
    },
}
```

**Design Rules:**
- Use `"*"` for cross-cutting concerns (tenant validation, audit logging)
- Use specific doctype for integration sync events
- Always check `doc.meta.has_field("cityos_tenant")` before processing in wildcard hooks
- Maintain an `EXEMPT_DOCTYPES` list for system doctypes that should be skipped

### 4.2 permission_query_conditions (Row-Level Security)

**Pattern:** Append SQL WHERE conditions to every query for a doctype.

```python
# hooks.py
permission_query_conditions = {
    "Sales Invoice": "cityos.governance.node_context.get_permission_query_conditions",
}
```

**Implementation Pattern:**
```python
def get_permission_query_conditions(user=None, doctype=None):
    # 1. Admin bypass
    if user == "Administrator":
        return ""

    # 2. Role-based bypass
    if "System Manager" in frappe.get_roles(user):
        return ""

    # 3. Get user's tenant
    default_tenant = frappe.db.get_default("cityos_default_tenant")
    if not default_tenant:
        return "1=0"  # Default deny

    # 4. Get accessible tenants (user's + children)
    accessible = get_accessible_tenants(user)

    # 5. Build SQL filter
    # Strict: CityOS doctypes require tenant to be set
    # Lenient: ERPNext doctypes allow NULL/empty for backward compatibility
    if is_strict:
        return f"`tab{doctype}`.`cityos_tenant` IN ({tenant_list})"
    else:
        return f"(`tab{doctype}`.`cityos_tenant` IN ({tenant_list}) OR `tab{doctype}`.`cityos_tenant` IS NULL OR `tab{doctype}`.`cityos_tenant` = '')"
```

**Design Rules:**
- CityOS custom doctypes → **strict** filtering (no NULL bypass)
- ERPNext core doctypes → **lenient** filtering (allow NULL for backward compatibility)
- Always return `"1=0"` for users without tenant (default deny)
- Cache tenant tree with TTL to avoid recursive queries on every list view

### 4.3 Custom Fields (Programmatic)

**Pattern:** Add fields to ERPNext doctypes via `create_custom_fields()` in install/migrate hooks.

```python
# setup/install.py
def add_node_context_custom_fields():
    from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

    custom_fields = {}
    for dt in ERPNEXT_DOCTYPES_TO_EXTEND:
        if frappe.db.exists("DocType", dt):
            custom_fields[dt] = NODE_CONTEXT_FIELDS

    create_custom_fields(custom_fields, update=True)
```

**Design Rules:**
- Define field specs as a list of dicts, reuse across multiple doctypes
- Always check `frappe.db.exists("DocType", dt)` before adding fields
- Use `insert_after` to control field placement
- Run in both `after_install` and `after_migrate` hooks
- Fields are exported as fixtures for version control

### 4.4 Fixtures

**Pattern:** Export/import roles and custom fields with the app.

```python
# hooks.py
fixtures = [
    {"doctype": "Role", "filters": [["name", "like", "CityOS%"]]},
    {"doctype": "Custom Field", "filters": [["name", "like", "cityos_%"]]},
]
```

### 4.5 API Methods

**Pattern:** Expose custom REST endpoints without modifying Frappe's routing.

```python
# hooks.py
api_methods = {
    "cityos.integrations.webhooks.medusa_webhook": {"methods": ["POST"]},
}
```

### 4.6 Scheduler Events

**Pattern:** Schedule background tasks.

```python
scheduler_events = {
    "hourly": ["cityos.integrations.outbox.publish_pending_events"],
    "daily": ["cityos.compliance.checks.run_daily_compliance_checks"],
    "cron": {"*/15 * * * *": ["cityos.integrations.medusa_sync.sync_pending_orders"]},
}
```

---

## 5. Hybrid Company-NodeContext Strategy (PLANNED — NOT YET IMPLEMENTED)

> **Status:** Everything in Section 5 is a proposed design. No code exists for this yet. This section serves as a blueprint for future implementation.

### 5.1 Rationale

Currently, CityOS uses `permission_query_conditions` to filter **34 doctypes**, but **120+ ERPNext doctypes** with a `company` field remain uncovered. Rather than adding PQC hooks for all 120+, we can leverage ERPNext's native Company-based permissions.

### 5.2 Architecture

```
┌─────────────────────────────┐
│       Node Context          │ ← Governance Truth
│  (tenant_tier, policies,    │    (CityOS-specific metadata)
│   personas, authorities)    │
│         │                   │
│    company (Link) ─────────────> Company  ← Operational Proxy
│         │                   │    (ERPNext native permissions
│         │                   │     for 120+ doctypes)
└─────────────────────────────┘
```

### 5.3 Implementation Steps (All in CityOS App)

**Step 1: Add `company` field to Node Context**
```json
{
  "fieldname": "company",
  "label": "Linked Company",
  "fieldtype": "Link",
  "options": "Company",
  "insert_after": "cost_center",
  "description": "Auto-created ERPNext Company for this tenant"
}
```

**Step 2: Auto-create Company on Node Context creation**
```python
# hooks.py
doc_events = {
    "Node Context": {
        "after_insert": "cityos.governance.company_sync.create_linked_company",
        "on_update": "cityos.governance.company_sync.sync_to_company",
    }
}
```

```python
# governance/company_sync.py
def create_linked_company(doc, method):
    if doc.company:
        return  # Already linked

    parent_company = None
    if doc.parent_tenant:
        parent_company = frappe.db.get_value("Node Context", doc.parent_tenant, "company")

    company = frappe.get_doc({
        "doctype": "Company",
        "company_name": doc.context_name or doc.name,
        "abbr": _generate_abbr(doc),
        "default_currency": doc.default_currency or "SAR",
        "country": frappe.db.get_value("Country", doc.country, "name") if doc.country else "Saudi Arabia",
        "parent_company": parent_company,
    })
    company.insert(ignore_permissions=True)

    doc.db_set("company", company.name, update_modified=False)
```

**Step 3: Auto-assign User Permissions**
```python
def assign_user_to_tenant(user, tenant_name):
    # 1. Set CityOS tenant default
    frappe.db.set_default("cityos_default_tenant", tenant_name, user)

    # 2. Get linked Company
    company = frappe.db.get_value("Node Context", tenant_name, "company")
    if not company:
        return

    # 3. Create User Permission for Company (native ERPNext isolation)
    if not frappe.db.exists("User Permission", {
        "user": user, "allow": "Company", "for_value": company
    }):
        frappe.get_doc({
            "doctype": "User Permission",
            "user": user,
            "allow": "Company",
            "for_value": company,
            "apply_to_all_doctypes": 1,
            "is_default": 1,
        }).insert(ignore_permissions=True)

    # 4. For hierarchical access, also add child companies
    # (if "Allow Descendants Access" is enabled on User Permission)
```

**Step 4: Keep PQC for CityOS-only doctypes**

CityOS custom doctypes (Budget Program, Municipal Invoice, etc.) either:
- Option A: Add a `company` Link field to their JSON schema → native ERPNext filtering
- Option B: Keep using `cityos_tenant` + `permission_query_conditions` → existing approach

Recommended: **Option A** for maximum consistency — add `company` field to CityOS doctypes and auto-populate from `cityos_tenant`.

### 5.4 Migration Path

For existing systems with data:
1. Create Company records for each existing Node Context
2. Backfill `company` field on Node Context records
3. Backfill `company` field on all existing CityOS doctype records
4. Create User Permissions for existing users
5. Gradually remove `permission_query_conditions` for ERPNext doctypes (Company permissions take over)
6. Keep PQC only for CityOS doctypes that need strict tenant-based filtering beyond Company

---

## 6. Coverage Analysis & Gaps

### 6.1 Current PQC Coverage (34 doctypes)

**ERPNext Core (16 covered):**
Sales Invoice, Purchase Invoice, Purchase Order, Purchase Receipt, Supplier, Customer, Item, Asset, Project, Employee, Journal Entry, Payment Entry, Sales Order, Delivery Note, Material Request, Quotation

**CityOS Custom (18 covered):**
Budget Program, Municipal Invoice, Municipal Asset, Capital Project, Contract Register, Governance Authority, Policy Doctrine, CityOS Persona, CityOS Persona Assignment, Funding Source, Fiscal Allocation, CityOS Procurement Request, Vendor Compliance Profile, Municipal Facility, Maintenance Plan, Position Control, Staff Assignment, Community Impact Report

### 6.2 Custom Fields Added but No PQC (12 ERPNext doctypes)

These have `cityos_tenant` custom field but **no permission_query_conditions** — meaning data is tagged but not filtered on read:

| Doctype | Module | Impact |
|---------|--------|--------|
| Stock Entry | Stock | **High** — inventory movements visible across tenants |
| Warehouse | Stock | **High** — warehouse list not tenant-scoped |
| Cost Center | Accounts | **High** — cost centers visible across tenants |
| Budget | Accounts | **High** — budgets visible across tenants |
| BOM | Manufacturing | **Medium** — bill of materials cross-visible |
| Work Order | Manufacturing | **Medium** — production orders cross-visible |
| Request for Quotation | Buying | **Medium** — RFQs cross-visible |
| Expense Claim | HR | **Medium** — expense claims cross-visible |
| Timesheet | Projects | **Low** — timesheets cross-visible |
| Company | Setup | **Low** — company list (administrative) |
| Loan | Accounts | **Low** — if unused |
| Subscription | Accounts | **Low** — if unused |

### 6.3 ERPNext Doctypes with `company` but No Custom Fields (92+)

These 92+ doctypes have a `company` field natively but have not been extended with CityOS custom fields. With the hybrid Company-NodeContext approach, these would get tenant isolation automatically through ERPNext's native Company-based User Permissions.

**High-priority modules:**
- **Accounts:** GL Entry, Account, POS Invoice, Tax Rule, Payment Reconciliation (~40 doctypes)
- **Stock:** Bin, Serial No, Pick List, Quality Inspection (~15 doctypes)
- **Assets:** Asset Maintenance, Asset Movement, Asset Repair (~7 doctypes)
- **Manufacturing:** Job Card, Production Plan, Plant Floor (~5 doctypes)

### 6.4 Wildcard Coverage (Safety Net)

Even for uncovered doctypes, these wildcard mechanisms provide partial protection:

| Mechanism | Coverage | Limitation |
|-----------|----------|------------|
| `validate_node_context` (wildcard `"*"`) | All doctypes on save | Only fires on write, not read |
| Audit logging (wildcard `"*"`) | All CityOS-aware doctypes | Logging only, no filtering |
| Compliance check (`check_missing_tenant`) | 11 key doctypes daily | Detection only, not prevention |

---

## 7. Design Patterns

### 7.1 Pattern: Doctype Business Logic

Each CityOS parent doctype follows this pattern:

```python
# Module: cityos/{module}/doctype/{doctype_name}/{doctype_name}.py

import frappe
from frappe.model.document import Document

class MyDoctype(Document):
    def validate(self):
        """Called before save — validation logic"""
        self._calculate_totals()
        self._validate_business_rules()
        self._set_status()

    def before_submit(self):
        """Called before submission — pre-submit checks"""
        self._validate_ready_for_submission()

    def on_submit(self):
        """Called after submission — trigger side effects"""
        self._update_related_records()

    def on_cancel(self):
        """Called on cancellation — reverse side effects"""
        self._reverse_related_updates()
```

**Naming Convention:** Private methods prefixed with `_`, grouped by concern.

### 7.2 Pattern: Child Table Doctype

```json
{
  "doctype": "DocType",
  "name": "Budget Funding Source",
  "module": "Finance",
  "istable": 1,
  "fields": [
    {"fieldname": "funding_source", "fieldtype": "Link", "options": "Funding Source"},
    {"fieldname": "amount", "fieldtype": "Currency"},
    {"fieldname": "percentage", "fieldtype": "Percent"}
  ]
}
```

**Rules:**
- `istable: 1` marks it as a child table
- No `cityos_tenant` field needed (inherits from parent)
- No `permission_query_conditions` needed
- Add to parent's `EXEMPT_DOCTYPES` in `node_context.py`

### 7.3 Pattern: Cross-System Integration Sync

```python
# integrations/payload_sync.py

def sync_budget_program_to_payload(doc, method):
    """Outbound sync: ERPNext → Payload CMS"""
    if doc.flags.from_payload_sync:
        return  # Prevent sync loops

    payload = _build_payload(doc)
    _create_outbox_event(doc, "payload_cms", "budget_program.updated", payload)


def _create_outbox_event(doc, target_system, event_type, payload):
    """Create an outbox event for reliable async delivery"""
    frappe.get_doc({
        "doctype": "Integration Outbox Event",
        "event_type": event_type,
        "target_system": target_system,
        "reference_doctype": doc.doctype,
        "reference_name": doc.name,
        "payload": frappe.as_json(payload),
        "status": "Pending",
        "cityos_tenant": getattr(doc, "cityos_tenant", ""),
    }).insert(ignore_permissions=True)
```

**Rules:**
- Always use the **Outbox Pattern** — never call external APIs directly from doc_events
- Check `flags.from_*_sync` to prevent infinite sync loops
- Include `cityos_tenant` in outbox events for tenant-scoped processing

### 7.4 Pattern: Permission Query Conditions

```python
def get_permission_query_conditions(user=None, doctype=None):
    """
    Three-tier access model:
    1. Admin bypass → return ""
    2. Tenant-scoped → return SQL filter
    3. No tenant → return "1=0" (deny all)
    """
    if user == "Administrator":
        return ""
    if has_admin_role(user):
        return ""

    tenant = get_user_tenant(user)
    if not tenant:
        return "1=0"

    accessible = get_accessible_tenants(user)  # User's tenant + children
    return build_sql_filter(doctype, accessible)
```

### 7.5 Pattern: Tenant Hierarchy Caching

```python
_tenant_tree_cache = {}

def get_child_tenants(tenant_name):
    """Recursively get all child tenants with TTL cache"""
    cache_key = f"children_{tenant_name}"
    if cache_key in _tenant_tree_cache:
        cached = _tenant_tree_cache[cache_key]
        if (now() - cached["timestamp"]).total_seconds() < 300:  # 5 min TTL
            return cached["tenants"]

    children = set()
    direct = frappe.db.get_all("Node Context",
        filters={"parent_tenant": tenant_name}, pluck="name")
    for child in direct:
        children.add(child)
        children.update(get_child_tenants(child))  # Recursive

    _tenant_tree_cache[cache_key] = {"tenants": children, "timestamp": now()}
    return children
```

### 7.6 Pattern: Webhook Ingestion with HMAC Validation

```python
# integrations/webhooks.py

@frappe.whitelist(allow_guest=True)
def medusa_webhook():
    """Inbound webhook from Medusa Commerce"""
    # 1. Validate HMAC signature
    payload = frappe.request.get_data()
    signature = frappe.request.headers.get("X-Medusa-Signature")
    secret = frappe.db.get_single_value("CityOS Settings", "medusa_webhook_secret")

    if not _verify_hmac(payload, signature, secret):
        frappe.throw("Invalid webhook signature", frappe.AuthenticationError)

    # 2. Parse and route event
    data = frappe.parse_json(payload)
    event_type = data.get("event")

    # 3. Process with flag to prevent sync loops
    doc.flags.from_medusa_sync = True
```

### 7.7 Pattern: Compliance Checks (Scheduled)

```python
# compliance/checks.py

def run_daily_compliance_checks():
    """Daily scheduled task — checks data integrity across tenants"""
    check_missing_tenant()          # Records without tenant assignment
    check_stale_workflow_states()   # Stuck outbox events
    check_orphan_stores()           # Stores without tenant
    check_overdue_maintenance()     # Overdue maintenance plans
    check_governance_chain_integrity()
    check_hierarchy_integrity()
    check_cross_system_sync_health()
    check_expired_persona_assignments()
    check_policy_expiry()
    frappe.db.commit()
```

### 7.8 Pattern: Exempt Doctype Lists

Maintain centralized lists of doctypes exempt from various processing:

```python
# governance/node_context.py
EXEMPT_DOCTYPES = [...]           # Skip tenant validation
CITYOS_STRICT_TENANT_DOCTYPES = [...] # Strict filtering (no NULL bypass)

# governance/audit.py
AUDIT_EXEMPT_DOCTYPES = [...]     # Skip audit logging
```

**Rule:** All child table doctypes, system doctypes (DocType, Role, Custom Field, etc.), and meta doctypes should be in exempt lists.

---

## 8. Integration Architecture

### 8.1 External Systems

```
                    ┌─────────────────┐
                    │  Temporal Cloud  │ ← Execution Truth
                    │  (Workflows)     │   (approval chains,
                    └────────▲────────┘    settlement runs)
                             │
┌──────────────┐    ┌────────┴────────┐    ┌──────────────┐
│ Payload CMS  │◄──►│  CityOS ERPNext │◄──►│   Medusa     │
│ (Content)    │    │  (Finance/Ops)  │    │  (Commerce)  │
└──────────────┘    └─────────────────┘    └──────────────┘
     ▲                       │                     ▲
     │              ┌────────┴────────┐            │
     │              │ CityOS Workflow │            │
     └──────────────│    Registry     │────────────┘
                    └─────────────────┘
```

### 8.2 Integration Contracts

| System | Direction | Mechanism | Doctypes |
|--------|-----------|-----------|----------|
| Payload CMS | Bidirectional | Webhooks + Outbox | 12 doctypes (governance + operational) |
| Medusa Commerce | Bidirectional | Webhooks + Cron sync | Sales Invoice, Payment Entry |
| Temporal Cloud | Outbound trigger | API calls | Approval workflows, settlement runs |
| Workflow Registry | Bidirectional | SSE + Polling | 5 workflow type registrations |

### 8.3 Task Queues (Temporal)

| Queue | Purpose | Workflows |
|-------|---------|-----------|
| `xsystem-platform-queue` | Cross-system platform operations | Approvals, procurement, vendor onboarding |
| `xsystem-vertical-queue` | Vertical/domain-specific operations | Invoice settlement, budget approval |

---

## 9. Testing Patterns

### 9.1 Test Infrastructure

**Single mock source:** `conftest.py` is the ONLY place that mocks the `frappe` module. Individual test files MUST NOT override `sys.modules` for frappe.

```python
# conftest.py pattern
@pytest.fixture(autouse=True)
def mock_frappe():
    """Provides a consistent frappe mock for all tests"""
    # ... setup frappe mock with Document class, db, session, etc.
```

### 9.2 Test File Organization

| File | Tests | Coverage |
|------|-------|----------|
| `test_business_logic.py` | 322 | All 14 operational doctype business logic |
| `test_temporal_workflows.py` | 70 | Temporal metadata, queue routing, handlers |
| `test_governance.py` | ~30 | Node Context hierarchy, tier validation |
| `test_node_context.py` | ~25 | Permission queries, tenant access |
| `test_doctypes.py` | ~20 | Doctype schema validation |
| `test_outbox.py` | ~15 | Outbox event processing |
| `test_webhooks.py` | ~15 | Webhook ingestion, HMAC validation |
| `test_compliance.py` | ~20 | Daily compliance checks |

### 9.3 Testing Rules

1. **Never use `spec=ClassName`** on MagicMock when the class comes from a mocked module
2. **Use `@patch`** to replace frappe in specific modules under test
3. **Import frappe** directly in test files — it comes from conftest's mock
4. Run full suite: `python -m pytest apps/cityos/cityos/tests/ -v --tb=short -c /dev/null`

---

## 10. Re-Implementation Playbook

If you need to rebuild this system from scratch on a new Frappe/ERPNext instance:

### Phase 1: Foundation (Week 1)

1. **Install Frappe Bench** with PostgreSQL + Redis
2. **Create custom app** `cityos` via `bench new-app cityos`
3. **Define governance doctypes:**
   - Node Context (with all 52 fields, tier validation logic)
   - CityOS Scope, Category, Subcategory, Store, Portal
   - Governance Authority, Policy Doctrine
   - CityOS Persona, CityOS Persona Assignment
   - CityOS Audit Log, Integration Outbox Event
4. **Set up `setup/install.py`:**
   - Create CityOS roles
   - Add NodeContext custom fields to ERPNext doctypes
5. **Set up `hooks.py`:**
   - Wildcard doc_events for validation and audit
   - Fixtures for roles and custom fields

### Phase 2: Multi-Tenancy (Week 2)

6. **Implement Node Context logic** (`governance/node_context.py`):
   - `validate_node_context()` — wildcard validation
   - `get_permission_query_conditions()` — row-level security
   - `get_accessible_tenants()` — hierarchical access
   - `get_child_tenants()` — recursive with caching
7. **Add permission_query_conditions** to hooks.py for all target doctypes
8. **Implement Company-NodeContext linking** (if using hybrid approach):
   - Auto-create Company on Node Context insert
   - Auto-assign User Permissions

### Phase 3: Business Modules (Week 3-4)

9. **Define operational doctypes** by module:
   - Finance: Budget Program, Funding Source, Municipal Invoice, Fiscal Allocation
   - Procurement: Procurement Request, Vendor Compliance, Contract Register
   - Assets: Municipal Asset, Municipal Facility, Maintenance Plan
   - HR: Position Control, Staff Assignment
   - Projects: Capital Project, Community Impact Report
10. **Define child table doctypes** (9 total)
11. **Implement business logic** in each doctype's `.py` file

### Phase 4: Integrations (Week 5)

12. **Payload CMS sync** — outbound sync for 12 doctypes via outbox pattern
13. **Medusa Commerce sync** — webhook handlers + cron sync
14. **Temporal Cloud** — workflow triggers, multi-queue routing
15. **Workflow Registry** — discovery, registration, SSE listener

### Phase 5: Operations (Week 6)

16. **Compliance checks** — daily scheduled integrity checks
17. **Workspace pages** — 6 workspaces with shortcuts and number cards
18. **Testing** — 497+ automated tests
19. **Documentation** — update replit.md, this guide

### Key Files to Create (in order)

```
apps/cityos/
├── cityos/
│   ├── __init__.py
│   ├── hooks.py                          ← Central hook registry
│   ├── setup/
│   │   ├── install.py                    ← Post-install setup (roles, custom fields)
│   │   └── seed_data.py                  ← Sample data for development
│   ├── governance/
│   │   ├── node_context.py               ← Tenant validation + PQC
│   │   ├── audit.py                      ← Audit logging
│   │   ├── company_sync.py               ← Company-NodeContext linking (hybrid)
│   │   └── doctype/                      ← 12 governance doctypes
│   ├── finance/
│   │   └── doctype/                      ← 5 finance doctypes
│   ├── procurement/
│   │   └── doctype/                      ← 7 procurement doctypes
│   ├── assets_management/
│   │   └── doctype/                      ← 4 assets doctypes
│   ├── hr_management/
│   │   └── doctype/                      ← 2 HR doctypes
│   ├── cityos_projects/
│   │   └── doctype/                      ← 3 project doctypes
│   ├── compliance/
│   │   └── checks.py                     ← Daily compliance checks
│   ├── integrations/
│   │   ├── payload_sync.py               ← Payload CMS sync
│   │   ├── medusa_sync.py                ← Medusa Commerce sync
│   │   ├── temporal_sync.py              ← Temporal Cloud workflows
│   │   ├── workflow_registry.py          ← Workflow discovery
│   │   ├── webhooks.py                   ← Inbound webhook router
│   │   ├── outbox.py                     ← Outbox event processing
│   │   └── cms_client.py                 ← CMS hierarchy client
│   └── tests/
│       ├── conftest.py                   ← Single frappe mock source
│       ├── test_business_logic.py        ← 322 tests
│       ├── test_temporal_workflows.py    ← 70 tests
│       └── ...                           ← Additional test files
```

---

## Appendix A: Full ERPNext Doctype Coverage Matrix

### Legend
- **CF** = Custom Fields added (cityos_tenant, etc.)
- **PQC** = Permission Query Conditions hook
- **Sync** = Integration sync (Payload/Medusa)
- **Hybrid** = Would be covered by Company-based User Permissions

### ERPNext Core Doctypes

| Doctype | CF | PQC | Sync | Hybrid | Priority |
|---------|:--:|:---:|:----:|:------:|----------|
| Sales Invoice | Yes | Yes | Medusa | Yes | Done |
| Purchase Invoice | Yes | Yes | - | Yes | Done |
| Purchase Order | Yes | Yes | - | Yes | Done |
| Purchase Receipt | Yes | Yes | - | Yes | Done |
| Supplier | Yes | Yes | - | Yes | Done |
| Customer | Yes | Yes | - | Yes | Done |
| Item | Yes | Yes | - | Yes | Done |
| Asset | Yes | Yes | - | Yes | Done |
| Project | Yes | Yes | - | Yes | Done |
| Employee | Yes | Yes | - | Yes | Done |
| Journal Entry | Yes | Yes | - | Yes | Done |
| Payment Entry | Yes | Yes | Medusa | Yes | Done |
| Sales Order | Yes | Yes | - | Yes | Done |
| Delivery Note | Yes | Yes | - | Yes | Done |
| Material Request | Yes | Yes | - | Yes | Done |
| Quotation | Yes | Yes | - | Yes | Done |
| Stock Entry | Yes | **No** | - | Yes | **High** |
| Warehouse | Yes | **No** | - | Yes | **High** |
| Cost Center | Yes | **No** | - | Yes | **High** |
| Budget | Yes | **No** | - | Yes | **High** |
| BOM | Yes | **No** | - | Yes | **Medium** |
| Work Order | Yes | **No** | - | Yes | **Medium** |
| Request for Quotation | Yes | **No** | - | Yes | **Medium** |
| Expense Claim | Yes | **No** | - | Yes | **Medium** |
| Timesheet | Yes | **No** | - | Yes | **Low** |
| Company | Yes | **No** | - | N/A | **Low** |
| Loan | Yes | **No** | - | Yes | **Low** |
| Subscription | Yes | **No** | - | Yes | **Low** |

### CityOS Custom Doctypes

| Doctype | Tenant Field | PQC | Sync | Priority |
|---------|:----------:|:---:|:----:|----------|
| Budget Program | Yes | Yes | Payload | Done |
| Municipal Invoice | Yes | Yes | Payload | Done |
| Funding Source | Yes | Yes | Payload | Done |
| Fiscal Allocation | Yes | Yes | Payload | Done |
| CityOS Procurement Request | Yes | Yes | Payload | Done |
| Vendor Compliance Profile | Yes | Yes | Payload | Done |
| Contract Register | Yes | Yes | Payload | Done |
| Municipal Asset | Yes | Yes | Payload | Done |
| Municipal Facility | Yes | Yes | - | Done |
| Maintenance Plan | Yes | Yes | - | Done |
| Position Control | Yes | Yes | Payload | Done |
| Staff Assignment | Yes | Yes | - | Done |
| Capital Project | Yes | Yes | Payload | Done |
| Community Impact Report | Yes | Yes | - | Done |

---

## Appendix B: Environment & Configuration

### Server Ports
| Port | Service | Role |
|------|---------|------|
| 5000 | Node.js reverse proxy (`proxy.js`) | Public-facing, routes to Gunicorn + Socket.IO |
| 8000 | Gunicorn | Frappe/ERPNext application server |
| 9000 | Node.js Socket.IO | Real-time WebSocket server |
| 11000 | Redis | Cache |
| 13000 | Redis | Queue / Socket.IO pubsub |

### External System Configuration
| System | Config Fields | Location |
|--------|--------------|----------|
| Payload CMS | `payload_api_url`, `payload_api_key`, `payload_webhook_secret` | CityOS Settings |
| Medusa Commerce | `medusa_api_url`, `medusa_api_key`, `medusa_webhook_secret` | CityOS Settings |
| Temporal Cloud | `temporal_endpoint`, `temporal_namespace`, `temporal_task_queues`, `temporal_webhook_secret` | CityOS Settings |
| Workflow Registry | `workflow_registry_base_url` | CityOS Settings |

### Login Credentials (Development)
- Username: `Administrator`
- Password: `admin`
