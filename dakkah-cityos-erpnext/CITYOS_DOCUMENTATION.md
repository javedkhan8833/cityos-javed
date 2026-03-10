# Dakkah CityOS ERP - Complete Implementation Documentation

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [CityOS Custom App](#3-cityos-custom-app)
4. [Governance Module](#4-governance-module)
5. [Finance Module](#5-finance-module)
6. [Procurement Module](#6-procurement-module)
7. [Assets Management Module](#7-assets-management-module)
8. [HR Management Module](#8-hr-management-module)
9. [CityOS Projects Module](#9-cityos-projects-module)
10. [Integration Architecture](#10-integration-architecture)
11. [Frontend & Workspaces](#11-frontend--workspaces)
12. [Security & Data Isolation](#12-security--data-isolation)
13. [PostgreSQL Compatibility Patches](#13-postgresql-compatibility-patches)
14. [Testing](#14-testing)
15. [Maintenance & Upgrades](#15-maintenance--upgrades)

---

## 1. Project Overview

Dakkah CityOS ERP is a municipal-grade Enterprise Resource Planning system built on:
- **Frappe Framework** v15.99.0 (core platform)
- **ERPNext** v17.0.0-dev (ERP modules)
- **CityOS App** v0.1.0 (custom smart city features)

It serves as the central **Truth Layer** for the Dakkah CityOS Platform, managing:
- Financial operations and budget programs
- Human resources and position control
- Procurement and vendor compliance
- Municipal assets and facility maintenance
- Capital projects and community impact reporting
- Governance, policy, and compliance

### Platform Philosophy
ERPNext functions as the **economic backbone** of the CityOS ecosystem, not just for internal operations. It connects with:
- **Payload CMS** (Content Truth) for hierarchy/entity sync
- **Medusa Commerce** (Transaction Truth) for orders and payments
- **Temporal Cloud** (Execution Truth) for workflow orchestration

---

## 2. System Architecture

### Technology Stack
| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | Frappe | v15.99.0 |
| ERP | ERPNext | v17.0.0-dev |
| CityOS App | Custom Frappe App | v0.1.0 |
| Language | Python | 3.12 |
| Database | PostgreSQL | (Neon-backed) |
| Cache | Redis | Port 11000 |
| Queue | Redis | Port 13000 |
| Web Server | Gunicorn | Port 5000 |
| Static Assets | Werkzeug | - |

### Directory Structure
```
frappe-bench/
  apps/
    frappe/                    # Frappe framework
    erpnext/                   # ERPNext application
    cityos/                    # CityOS custom app
      cityos/
        governance/            # Governance module
          doctype/
            node_context/      # Multi-tenant hierarchy management
            cityos_scope/      # Scope definitions
            cityos_category/   # Category definitions
            cityos_subcategory/# Subcategory definitions
            cityos_store/      # Store definitions
            cityos_portal/     # Portal definitions
            cityos_audit_log/  # Immutable audit trail
            integration_outbox_event/ # Event publishing
            governance_authority/     # Governance authorities
            policy_doctrine/          # Policy management
            cityos_persona/           # Persona definitions
            cityos_persona_assignment/# Persona role assignments
          workspace/
            cityos_governance/ # Governance workspace page
          number_card/         # Dashboard number card fixtures
        finance/               # Finance module
          doctype/
            budget_program/    # Budget program management
            funding_source/    # Funding source tracking
            municipal_invoice/ # Municipal invoicing
            fiscal_allocation/ # Fiscal allocation management
          workspace/
            cityos_finance/    # Finance workspace page
        procurement/           # Procurement module
          doctype/
            vendor_compliance_profile/ # Vendor compliance
            contract_register/         # Contract management
            cityos_procurement_request/# Procurement requests
          workspace/
            cityos_procurement/# Procurement workspace page
        assets_management/     # Assets module
          doctype/
            municipal_asset/   # Municipal asset registry
            municipal_facility/# Facility management
            maintenance_plan/  # Maintenance scheduling
          workspace/
            cityos_assets/     # Assets workspace page
        hr_management/         # HR module
          doctype/
            position_control/  # Position management
            staff_assignment/  # Staff assignment tracking
          workspace/
            cityos_hr/         # HR workspace page
        cityos_projects/       # Projects module
          doctype/
            capital_project/   # Capital project management
            community_impact_report/ # Community impact tracking
          workspace/
            cityos_projects/   # Projects workspace page
        compliance/            # Compliance module
        hooks.py               # App lifecycle hooks
        modules.txt            # Registered modules
        tests/                 # Automated tests (105 tests)
  sites/
    site1.local/               # Primary site
      site_config.json         # Site configuration
```

---

## 3. CityOS Custom App

The CityOS app (`cityos`) is a standalone Frappe application that extends ERPNext without modifying its source code. All CityOS features are contained within this app, making it fully portable and upgrade-safe.

### Registered Modules
The app registers 7 modules (defined in `modules.txt`):
1. **Governance** - Tenant hierarchy, audit, compliance
2. **Finance** - Budget programs, funding, invoicing
3. **Procurement** - Vendor management, contracts
4. **Assets Management** - Municipal assets, facilities
5. **HR Management** - Position control, staffing
6. **CityOS Projects** - Capital projects, impact reports
7. **Compliance** - Automated compliance checks

### App Hooks
Key hooks configured in `hooks.py`:
- **doc_events**: Automatic audit logging on create/update/delete
- **permission_query_conditions**: Tenant-based data isolation
- **scheduled_tasks**: Daily compliance checks
- **fixtures**: Number cards and workspace configurations

---

## 4. Governance Module

The Governance module is the core of CityOS, implementing multi-tenant hierarchical management.

### Doctypes

#### Node Context
The primary tenant/entity management doctype with a 5-tier hierarchy.

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| context_name | Data | Display name |
| tenant_tier | Select | MASTER / GLOBAL / REGIONAL / COUNTRY / CITY |
| parent_tenant | Link (Node Context) | Parent in hierarchy |
| governance_authority | Link | Governing authority |
| slug | Data (Unique) | URL-friendly identifier |
| domain | Data | Associated domain |
| status | Select | Active / Inactive / Suspended / Archived |
| residency_zone | Data | Geographic zone |
| default_locale | Data | Default language/locale |
| supported_locales | Small Text | Comma-separated locales |
| timezone | Data | Timezone |
| default_currency | Link (Currency) | Default currency |
| default_persona | Link (CityOS Persona) | Default persona |
| cms_ref_id | Data | Payload CMS reference ID |
| cityos_tenant | Link (Node Context) | Tenant scoping |
| cityos_country | Data | Country code |
| cityos_scope | Link (CityOS Scope) | Scope reference |
| cityos_store | Link (CityOS Store) | Store reference |
| enabled | Check | Active status |

**NodeContext fields are also added to 21 core ERPNext doctypes** for tenant/geographic data scoping:
- Sales Invoice, Purchase Invoice, Journal Entry
- Customer, Supplier, Item
- Employee, Company, Cost Center
- And 12 more core doctypes

#### Hierarchy Structure (5-Tier)
| Doctype | Description |
|---------|-------------|
| CityOS Scope | Top-level organizational scope |
| CityOS Category | Category within a scope |
| CityOS Subcategory | Subcategory within a category |
| CityOS Store | Operational store unit |
| CityOS Portal | Public-facing portal |

#### Governance Authority
Defines governing bodies and authorities.

**Key Fields:**
- authority_name, authority_type, jurisdiction_level
- parent_authority (Link), governing_body
- effective_date, expiry_date, status

#### Policy Doctrine
Manages governance policies and compliance rules.

**Key Fields:**
- policy_name, policy_type, policy_scope
- effective_date, review_date, status (Active/Draft/Expired/Suspended)
- enforcement_level, compliance_threshold
- policy_text (Text Editor)

#### CityOS Persona
Defines user personas/roles within the CityOS platform.

**Key Fields:**
- persona_name, persona_type, description
- access_level, default_workspace

#### CityOS Persona Assignment
Links personas to users and tenants.

**Key Fields:**
- user (Link to User), persona (Link to CityOS Persona)
- node_context (Link), effective_date, expiry_date

#### CityOS Audit Log
Immutable audit trail for all CityOS-aware documents.

**Key Fields:**
- doctype_name, document_name, action (Create/Update/Delete)
- user, timestamp, snapshot (JSON), changes (JSON)

#### Integration Outbox Event
Event publishing for external system synchronization.

**Key Fields:**
- event_type, doctype_name, document_name
- payload (JSON), status (Pending/Sent/Failed/Retrying)
- target_system, retry_count, last_error

---

## 5. Finance Module

### Doctypes
| Doctype | Key Fields | Purpose |
|---------|-----------|---------|
| Budget Program | program_name, fiscal_year, total_budget, allocated, remaining | Municipal budget management |
| Funding Source | source_name, source_type, amount, currency | Track funding origins |
| Municipal Invoice | invoice_number, vendor, amount, due_date, status | Municipal billing |
| Fiscal Allocation | allocation_name, budget_program, department, amount | Budget distribution |

---

## 6. Procurement Module

### Doctypes
| Doctype | Key Fields | Purpose |
|---------|-----------|---------|
| Vendor Compliance Profile | vendor, compliance_status, last_audit, certifications | Vendor qualification tracking |
| Contract Register | contract_name, vendor, value, start_date, end_date, status | Contract lifecycle management |
| CityOS Procurement Request | request_title, department, estimated_cost, priority, status | Procurement workflow |

---

## 7. Assets Management Module

### Doctypes
| Doctype | Key Fields | Purpose |
|---------|-----------|---------|
| Municipal Asset | asset_name, asset_type, location, condition, acquisition_date | Asset registry |
| Municipal Facility | facility_name, facility_type, address, capacity, status | Facility management |
| Maintenance Plan | plan_name, asset, frequency, next_due, assigned_to | Preventive maintenance |

---

## 8. HR Management Module

### Doctypes
| Doctype | Key Fields | Purpose |
|---------|-----------|---------|
| Position Control | position_title, department, grade, status, budget_code | Position management |
| Staff Assignment | employee, position, start_date, end_date, status | Staff-to-position mapping |

---

## 9. CityOS Projects Module

### Doctypes
| Doctype | Key Fields | Purpose |
|---------|-----------|---------|
| Capital Project | project_name, budget, start_date, completion_date, status | Capital project tracking |
| Community Impact Report | project, report_date, impact_area, beneficiaries, metrics | Impact measurement |

---

## 10. Integration Architecture

CityOS uses an event-driven architecture for external system integration.

### Integration Outbox Pattern
All external synchronization uses the **Transactional Outbox Pattern**:
1. When a CityOS document changes, an `Integration Outbox Event` is created
2. Events are stored with status `Pending` in the database
3. A background worker processes pending events and sends them to target systems
4. Failed events are retried with exponential backoff

### External Systems

#### Payload CMS (Content Truth)
- **Purpose**: Syncs entities like vendors, organizations, assets, and hierarchical structures
- **Configuration**: `medusa_api_url`, `payload_api_key`, `payload_webhook_secret`
- **Sync Direction**: Bidirectional (webhooks from Payload, outbox events to Payload)

#### Medusa Commerce (Transaction Truth)
- **Purpose**: E-commerce orders, payments, and product management
- **Configuration**: `medusa_api_url`, `medusa_api_key`, `medusa_webhook_secret`
- **Sync Direction**: Bidirectional

#### Temporal Cloud (Execution Truth)
- **Purpose**: Workflow orchestration for approval chains, settlement runs
- **Configuration**: `temporal_api_url`, `temporal_webhook_secret`
- **Key Workflows**: Approval chains, budget settlement, compliance reviews

---

## 11. Frontend & Workspaces

### Login Page
- Branded as **"Login to Dakkah CityOS"** (configured via System Settings `app_name`)
- Access: `http://<host>:5000`
- Credentials: Administrator / admin

### Workspace Pages (Sidebar Navigation)
6 workspace pages are available in the sidebar:

| Workspace | Module | Shortcuts |
|-----------|--------|-----------|
| CityOS Governance | Governance | Node Context, Scopes, Categories, Subcategories, Stores, Portals, Governance Authority, Policy Doctrine, Personas, Persona Assignments, Audit Log, Outbox Events |
| CityOS Finance | Finance | Budget Programs, Funding Sources, Municipal Invoices, Fiscal Allocations |
| CityOS Procurement | Procurement | Vendor Profiles, Contracts, Procurement Requests |
| CityOS Assets | Assets Management | Municipal Assets, Facilities, Maintenance Plans |
| CityOS HR | HR Management | Positions, Staff Assignments |
| CityOS Projects | CityOS Projects | Capital Projects, Impact Reports |

### Dashboard Number Cards
8 number cards on the Governance workspace showing real-time metrics:
1. **Active Tenants** - Count of enabled Node Contexts
2. **Total Stores** - Count of CityOS Stores
3. **Governance Authorities** - Count of authorities
4. **Active Policies** - Count of active Policy Doctrines
5. **Budget Programs** - Count of budget programs
6. **Pending Outbox Events** - Events awaiting processing
7. **Municipal Assets** - Total registered assets
8. **Audit Log Entries** - Total audit trail entries

---

## 12. Security & Data Isolation

### Multi-Tenant Data Isolation
- All CityOS-aware doctypes include a `cityos_tenant` field linking to Node Context
- `permission_query_conditions` hooks automatically filter queries by the user's assigned tenant
- Users can only see data belonging to their tenant and child tenants

### Custom Roles
| Role | Description |
|------|-------------|
| CityOS Administrator | Full system access |
| Finance Manager | Finance module access |
| Procurement Manager | Procurement module access |
| Asset Manager | Assets module access |
| HR Manager | HR module access |
| Project Manager | Projects module access |

### Audit Trail
- Every create, update, and delete action on CityOS-aware documents is logged
- Audit logs are immutable (no edit/delete permissions)
- Logs include: user, timestamp, action type, document snapshot, and specific changes

---

## 13. PostgreSQL Compatibility Patches

ERPNext was originally designed for MariaDB/MySQL. The following patches were applied for PostgreSQL compatibility:

### Patch 1: FORCE INDEX Removal
**File**: `erpnext/accounts/report/financial_statements.py` (line 553)
**Issue**: `FORCE INDEX` is MySQL-specific syntax not supported by PostgreSQL
**Fix**: Conditional check - only applies `force_index` when running on MySQL
```python
if frappe.db.db_type != "postgres":
    query = query.force_index("posting_date_company_index")
```

### Patch 2: GROUP BY Quoting
**File**: `erpnext/accounts/report/financial_statements.py` (line 580)
**Issue**: MySQL uses backticks for quoting, PostgreSQL uses double quotes
**Fix**: Database-aware quoting
```python
query += ' GROUP BY "account"' if frappe.db.db_type == "postgres" else " GROUP BY `account`"
```

### Upgrade Impact
- These patches modify ERPNext source code directly
- They will need to be re-applied after ERPNext upgrades
- Check if newer ERPNext versions already include PostgreSQL fixes before re-patching

---

## 14. Testing

### Test Suite
- **Location**: `apps/cityos/cityos/tests/`
- **Total Tests**: 105
- **Coverage**: All CityOS modules, doctypes, hooks, and compliance checks

### Running Tests
```bash
cd /home/runner/frappe-bench
python -m pytest apps/cityos/cityos/tests/ -v --tb=short -c /dev/null
```

### Test Categories
- Unit tests for each doctype
- Integration tests for webhook handlers
- Compliance check validation tests
- Data isolation tests
- Audit trail verification tests

---

## 15. Maintenance & Upgrades

### Redis Cache Management
```bash
redis-cli -p 11000 FLUSHALL
```

### Restarting the Application
The application runs via Gunicorn on port 5000. Restart by restarting the ERPNext workflow.

### Adding New Doctypes
1. Enable developer mode: Set `developer_mode: 1` in `sites/site1.local/site_config.json`
2. Create the doctype via Frappe UI or JSON definition
3. Run `bench migrate` or use `frappe.modules.import_file_by_path()` to sync
4. Disable developer mode when done

### Backup
PostgreSQL database can be backed up using the built-in Replit database tools or:
```bash
cd /home/runner/frappe-bench && bench --site site1.local backup
```

### Key Configuration Files
| File | Purpose |
|------|---------|
| `sites/site1.local/site_config.json` | Site configuration (database, redis, etc.) |
| `apps/cityos/cityos/hooks.py` | App hooks and event handlers |
| `apps/cityos/cityos/modules.txt` | Registered module list |
| `apps/cityos/setup.py` | App package configuration |

---

## Appendix: Sample Data

The system is pre-loaded with sample data for testing:

### Node Contexts (Tenants)
- Riyadh Smart City
- Jeddah Municipality
- Dubai Innovation Hub
- Barcelona Smart City
- Singapore Urban Hub

### Municipal Assets
- MA-RIY-001, MA-RIY-002 (Riyadh)
- MA-JED-001 (Jeddah)

### Company
- Dakkah CityOS (primary company)

### Fiscal Year
- 2026 (current)
