# Dakkah CityOS ERP — Comprehensive Gap Analysis

**Date:** February 10, 2026
**Scope:** Current ERPNext/CityOS implementation vs. full Dakkah CityOS Platform + CMS requirements
**System:** ERPNext v17.0.0-dev on Frappe v15.99.0, PostgreSQL backend, CityOS custom app v0.1.0

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Inventory](#2-current-state-inventory)
3. [Gap Area 1: Doctype Business Logic](#3-gap-area-1-doctype-business-logic)
4. [Gap Area 2: CMS (Payload CMS) Integration Completeness](#4-gap-area-2-cms-payload-cms-integration-completeness)
5. [Gap Area 3: Multi-Tenant Data Isolation](#5-gap-area-3-multi-tenant-data-isolation)
6. [Gap Area 4: ERPNext Standard Module Integration](#6-gap-area-4-erpnext-standard-module-integration)
7. [Gap Area 5: Workflow State Machine Completeness](#7-gap-area-5-workflow-state-machine-completeness)
8. [Gap Area 6: API Endpoints and External System Contracts](#8-gap-area-6-api-endpoints-and-external-system-contracts)
9. [Gap Area 7: Dashboard and Reporting Capabilities](#9-gap-area-7-dashboard-and-reporting-capabilities)
10. [Gap Area 8: Security (RBAC, Permissions, API Auth)](#10-gap-area-8-security-rbac-permissions-api-auth)
11. [Gap Area 9: Missing Doctypes and Fields](#11-gap-area-9-missing-doctypes-and-fields)
12. [Gap Area 10: Data Migration and Seeding](#12-gap-area-10-data-migration-and-seeding)
13. [Priority Recommendations](#13-priority-recommendations)
14. [Appendix A: Current Doctype Inventory](#appendix-a-current-doctype-inventory)
15. [Appendix B: Integration Endpoint Map](#appendix-b-integration-endpoint-map)

---

## 1. Executive Summary

The Dakkah CityOS ERP system has established a strong architectural foundation: a 5-tier governance hierarchy, an event-driven integration pattern (outbox + webhooks), Temporal workflow orchestration with a centralized registry, and bidirectional sync scaffolding with Payload CMS and Medusa Commerce. However, significant gaps remain before the system can serve as a production-grade "Truth Layer" for Financial, Operational, HR, Procurement, Asset, and Compliance data within the Dakkah CityOS platform.

**Key findings:**

- **12 of 14 operational doctypes have zero business logic** — they are schema-only shells with no validation, calculations, or lifecycle management.
- **CMS integration is partially implemented** — outbound sync covers only 5 of 26+ entities; conflict resolution and sync status tracking are absent.
- **Multi-tenant isolation has enforcement gaps** — permission query conditions cover standard ERPNext doctypes but not all custom CityOS doctypes; API-level tenant scoping is inconsistent.
- **No connection to ERPNext's built-in modules** — CityOS doctypes operate in isolation from ERPNext Accounting, HR, Assets, Projects, and Buying modules.
- **Workflow state machines are metadata-only** — state transition rules, role-based guards, SLA tracking, and downstream action triggers are not implemented.
- **No operational dashboards or custom reports** — only 8 basic number cards exist; no municipal-specific analytics.
- **RBAC and field-level permissions are not configured** for custom doctypes.
- **Critical operational entities are missing** — service requests, permits, inspections, SLA definitions, revenue management, citizen registry.

---

## 2. Current State Inventory

### 2.1 Modules Implemented (7)

| Module | Doctypes | Business Logic | Status |
|--------|----------|---------------|--------|
| Governance | 12 doctypes | Node Context validation, audit logging, permission queries | Most complete |
| Finance | 4 doctypes | Minimal validation on BudgetProgram and MunicipalInvoice | Schema only |
| Procurement | 3 doctypes | None (empty classes) | Schema only |
| Assets Management | 3 doctypes | None (empty classes) | Schema only |
| HR Management | 2 doctypes | None (empty classes) | Schema only |
| CityOS Projects | 2 doctypes | None (empty classes) | Schema only |
| Compliance | 0 custom doctypes | 9 daily checks logging to Audit Log | Functional |

### 2.2 Integrations Implemented (4)

| Integration | Direction | Entities | Status |
|-------------|-----------|----------|--------|
| Payload CMS | Outbound: 5 entities, Inbound: 13 webhook collections | Vendors, Assets, Governance, Policies, Personas, Tenants, Stores, Categories, Scopes, etc. | Partial |
| Medusa Commerce | Outbound: 2 event types, Inbound: 16 webhook events | Orders, Payments, Products, Customers, Vendors, Tenants, Stores | Functional |
| Temporal Workflow | Outbound: 5 workflow types via outbox | Approval Chain, Procurement Approval, Invoice Settlement, Vendor Onboarding, Budget Approval | Metadata only |
| CMS Client (Hierarchy Sync) | Inbound: daily pull | Countries, Scopes, Categories, Subcategories, Stores, Portals | Functional |

### 2.3 Infrastructure

| Component | Status |
|-----------|--------|
| PostgreSQL database | Active |
| Redis (cache port 11000, queue port 13000) | Active |
| Gunicorn (port 8000) | Active |
| Node.js Socket.IO (port 9000) | Active |
| Reverse proxy (port 5000) | Active |
| Integration Outbox pattern | Active (hourly publish) |
| Workflow Registry (SSE + polling) | Active |
| Audit trail (all document lifecycle) | Active |
| Daily compliance checks | Active |

### 2.4 Testing

| Test Suite | Count | Status |
|-----------|-------|--------|
| Temporal workflow tests | 70 | All passing |
| Other CityOS tests | 35+ | Passing |
| **Total** | **105+** | **All passing** |

---

## 3. Gap Area 1: Doctype Business Logic

### 3.1 Severity: CRITICAL

This is the most significant gap. Most CityOS doctypes are empty Python classes that inherit from `Document` with `pass` — they store data but enforce no business rules, perform no calculations, and have no lifecycle management.

### 3.2 Detailed Gaps by Doctype

#### Finance Module

| Doctype | Current Logic | Missing |
|---------|--------------|---------|
| **Budget Program** | Basic `validate` method with amount calculation | Budget ceiling enforcement, multi-year budgeting, allocation vs. expenditure tracking, fiscal year validation, approval workflow states, budget revision history, link to ERPNext Budget for actuals comparison |
| **Municipal Invoice** | Basic `validate` method | Invoice lifecycle (Draft → Submitted → Approved → Paid → Cancelled), payment tracking, overdue calculations, late fee computation, link to ERPNext Sales Invoice, tenant-scoped numbering series, tax calculations, integration with Medusa for e-commerce invoices |
| **Funding Source** | None (`pass`) | Source type classification (grant, tax revenue, federal transfer, loan), utilization percentage tracking, expiry/renewal dates, compliance requirements per funding source, reporting obligations, link to Budget Program allocations |
| **Fiscal Allocation** | None (`pass`) | Allocation limits and validation, period-based allocation (monthly/quarterly/annual), utilization tracking, reallocation workflow, link to Budget Program and Funding Source, over-allocation prevention |

#### Procurement Module

| Doctype | Current Logic | Missing |
|---------|--------------|---------|
| **CityOS Procurement Request** | None (`pass`) | Full procurement lifecycle (Draft → Submitted → Under Review → Approved → RFQ Issued → PO Created → Received → Closed), budget availability check before approval, estimated vs. actual cost tracking, multi-level approval based on amount thresholds, vendor selection criteria, link to ERPNext Purchase Order/RFQ, required documents checklist, emergency procurement flag |
| **Vendor Compliance Profile** | None (`pass`) | Compliance scoring algorithm, certificate management (types, expiry dates, renewal reminders), blacklist/debar management with reason codes, performance rating (delivery time, quality, dispute history), financial health indicators, insurance verification, required certifications by procurement category, automatic status changes on certificate expiry |
| **Contract Register** | None (`pass`) | Contract lifecycle (Draft → Active → Under Amendment → Expired → Renewed → Terminated), value tracking (original, amendments, total), milestone and deliverable management, payment schedule and tracking, performance bond management, penalty/liquidated damages calculation, renewal notifications, SLA compliance tracking, link to Vendor Compliance Profile and Procurement Request |

#### Assets Management Module

| Doctype | Current Logic | Missing |
|---------|--------------|---------|
| **Municipal Asset** | None (`pass`) | Asset lifecycle (Procurement → In Service → Under Maintenance → Decommissioned → Disposed), depreciation calculations (straight-line, declining balance), condition assessment tracking, location/transfer management, custodian assignment, insurance tracking, warranty management, QR/barcode generation, link to ERPNext Asset for financial tracking |
| **Municipal Facility** | None (`pass`) | Facility classification (office, park, utility, public space), capacity tracking, operating hours, accessibility compliance, utility consumption tracking, occupancy management, inspection scheduling, renovation/upgrade project links |
| **Maintenance Plan** | None (`pass`) | Maintenance scheduling (preventive, corrective, predictive), work order generation and tracking, cost accumulation, spare parts/inventory requirements, contractor assignment, completion verification, next-due-date auto-calculation, overdue escalation, asset downtime tracking |

#### HR Management Module

| Doctype | Current Logic | Missing |
|---------|--------------|---------|
| **Position Control** | None (`pass`) | Position grade/step structure, authorized vs. filled headcount, budget allocation per position, reporting hierarchy, job description and requirements, position freeze/unfreeze, link to ERPNext Designation and Department, position history tracking |
| **Staff Assignment** | None (`pass`) | Assignment validation (position must exist and be vacant), effective date management, acting/interim assignment support, concurrent assignment rules, transfer management, assignment approval workflow, link to ERPNext Employee, leave/absence impact on assignments |

#### CityOS Projects Module

| Doctype | Current Logic | Missing |
|---------|--------------|---------|
| **Capital Project** | None (`pass`) | Project lifecycle (Planning → Design → Procurement → Construction → Commissioning → Operational), multi-year budget tracking, phase management with milestones, contractor management, progress reporting (% complete), risk register, stakeholder management, environmental impact tracking, link to ERPNext Project |
| **Community Impact Report** | None (`pass`) | Impact assessment framework (social, economic, environmental), KPI tracking, beneficiary counting, survey/feedback integration, before/after metrics, cost-benefit analysis, link to Capital Project |

### 3.3 What "Business Logic" Means in Practice

For each doctype, implementing business logic means adding:

1. **`validate` method** — Field-level validation, cross-field consistency checks, required field enforcement based on status
2. **`before_save` / `after_save`** — Derived field calculations, auto-numbering, related record updates
3. **`before_submit` / `on_submit`** — Approval checks, downstream document creation, integration triggers
4. **`on_cancel`** — Reversal logic, linked document status updates
5. **`before_insert` / `after_insert`** — Default value assignment, related record creation
6. **Status transition methods** — Valid transition validation, role-based guards, SLA checks
7. **Custom methods** — Domain-specific calculations, aggregations, report data

---

## 4. Gap Area 2: CMS (Payload CMS) Integration Completeness

### 4.1 Severity: HIGH

The Payload CMS serves as the "Content Truth" for the CityOS platform. The current integration handles governance hierarchy entities but lacks sync for operational data, conflict resolution, and observability.

### 4.2 Outbound Sync Gaps (ERPNext → Payload CMS)

| Entity | Current Status | Gap |
|--------|---------------|-----|
| Vendors | Synced | Complete |
| Municipal Assets | Synced | Complete |
| Governance Authorities | Synced | Complete |
| Policies | Synced | Complete |
| Personas | Synced | Complete |
| Budget Programs | **Not synced** | CMS cannot display budget data |
| Municipal Invoices | **Not synced** | CMS cannot show financial transactions |
| Fiscal Allocations | **Not synced** | CMS cannot track fund utilization |
| Procurement Requests | **Not synced** | CMS cannot show procurement pipeline |
| Contracts | **Not synced** | CMS cannot display active contracts |
| Capital Projects | **Not synced** | CMS cannot show project status/progress |
| Maintenance Plans | **Not synced** | CMS cannot display maintenance schedules |
| Municipal Facilities | **Not synced** | CMS cannot show facility information |
| Position Control | **Not synced** | CMS cannot display organizational structure |
| Staff Assignments | **Not synced** | CMS cannot show personnel assignments |
| Community Impact Reports | **Not synced** | CMS cannot display impact data |
| Compliance Findings | **Not synced** | CMS cannot show compliance status |

### 4.3 Inbound Sync Gaps (Payload CMS → ERPNext)

| Collection | Current Status | Gap |
|-----------|---------------|-----|
| Tenants | Handled (create/update/delete) | Needs conflict detection when ERPNext also modifies |
| Stores | Handled (create/update/delete) | Needs conflict detection |
| Categories | Handled (create/update/delete) | Complete |
| Scopes | Handled (create/update/delete) | Complete |
| Subcategories | Handled (create/update/delete) | Complete |
| Portals | Handled (create/update/delete) | Complete |
| Governance Authorities | Handled (create/update/delete) | Needs bidirectional conflict detection |
| Policies | Handled (create/update/delete) | Needs bidirectional conflict detection |
| Personas | Handled (create/update/delete) | Needs bidirectional conflict detection |
| Persona Assignments | Handled (create/update/delete) | Complete |
| Countries | Handled (ensure exists) | Complete |
| Compliance Records | Handled (audit log) | Complete |
| Nodes | Handled (dispatch) | Complete |
| **Documents/Media** | **Not handled** | No file/attachment sync between systems |
| **Content Pages** | **Not handled** | No CMS content pulled into ERPNext |
| **Navigation/Menus** | **Not handled** | No CMS navigation structure sync |

### 4.4 Architectural Gaps

| Gap | Description | Impact |
|-----|-------------|--------|
| **No conflict resolution** | If both CMS and ERPNext modify the same record simultaneously, the last write wins without any detection or notification | Data inconsistency between systems |
| **No sync status tracking** | No way to determine which records are in sync, out of sync, or have sync errors | Operational blind spot |
| **No delta/incremental sync** | Daily hierarchy sync (`sync_hierarchy_from_cms`) pulls all records every time; no change tracking or cursor-based pagination | Performance degradation at scale, unnecessary API load |
| **No sync audit trail** | Sync operations don't create CityOS Audit Log entries for traceability | Compliance gap for data lineage |
| **No data ownership rules** | No formal definition of which system "owns" each entity type and what happens on conflicts | Ambiguous update authority |
| **No retry visibility** | Outbox retries are internal; no dashboard or API to see retry status, failure patterns, or dead letters | Operational opacity |
| **No schema validation** | Incoming webhook payloads are not validated against expected schemas | Silent data corruption risk |
| **No bulk sync API** | No endpoint to trigger full or selective re-sync between systems | Recovery after outages requires manual intervention |
| **No attachment/media sync** | Documents, images, and files attached to records are not synchronized | Incomplete data in CMS |
| **No pagination for large datasets** | CMS client limits to 100 records per entity type | Data loss for entities exceeding 100 records |

---

## 5. Gap Area 3: Multi-Tenant Data Isolation

### 5.1 Severity: HIGH

Multi-tenancy is fundamental to CityOS's 5-tier governance model (MASTER → GLOBAL → REGIONAL → COUNTRY → CITY). Current implementation provides basic query-level filtering but lacks comprehensive enforcement.

### 5.2 Current Implementation

- **Permission query conditions** on 21 standard ERPNext doctypes filter by `cityos_tenant`
- **Node Context validation** auto-assigns default tenant on document save
- **5-tier hierarchy validation** in compliance checks

### 5.3 Gaps

| Gap | Description | Impact |
|-----|-------------|--------|
| **Custom doctypes not covered** | Permission query conditions only cover standard ERPNext doctypes (Sales Invoice, Purchase Order, etc.). Custom CityOS doctypes (Budget Program, Municipal Invoice, Procurement Request, etc.) have NO tenant-based query filtering | Users can see all tenants' data for CityOS-specific doctypes |
| **API-level enforcement inconsistent** | Webhook handlers and whitelisted API endpoints don't validate that the requesting user/system has access to the target tenant | Cross-tenant data manipulation possible via API |
| **No hierarchical tenant access** | A REGIONAL-tier user should see data for all COUNTRY and CITY tenants below them. Current filter only matches exact tenant, not hierarchy | Regional managers cannot aggregate data across their jurisdiction |
| **Default tenant fallback weakness** | If `cityos_default_tenant` is not set for a user, the permission query returns empty string (no filtering) — effectively granting access to all tenants | Security hole when tenant defaults are not configured |
| **No tenant context in session** | No middleware to set/enforce tenant context for the duration of a request | Tenant scope must be manually checked in every function |
| **No tenant-scoped API keys** | External systems (Medusa, Payload, Temporal) connect with a single credential, not per-tenant keys | Cannot restrict external system access to specific tenants |
| **No tenant-aware numbering** | Document naming series are not tenant-scoped (e.g., INV-CITY-A-001 vs INV-CITY-B-001) | Confusing document numbering across tenants |
| **No cross-tenant reporting controls** | No mechanism to allow authorized users (e.g., MASTER-tier admin) to run cross-tenant reports while restricting others | Either full access or single-tenant access, no graduated model |

### 5.4 Doctypes Missing Permission Query Conditions

The following custom CityOS doctypes are NOT covered by `permission_query_conditions`:

- Budget Program
- Funding Source
- Municipal Invoice
- Fiscal Allocation
- CityOS Procurement Request
- Vendor Compliance Profile
- Contract Register
- Municipal Asset
- Municipal Facility
- Maintenance Plan
- Position Control
- Staff Assignment
- Capital Project
- Community Impact Report
- CityOS Audit Log (should allow cross-tenant for admins)
- Integration Outbox Event (should allow cross-tenant for admins)

---

## 6. Gap Area 4: ERPNext Standard Module Integration

### 6.1 Severity: HIGH

CityOS doctypes currently operate in isolation from ERPNext's built-in modules. This means the system cannot leverage ERPNext's mature accounting, HR, asset management, and procurement capabilities.

### 6.2 Gaps by ERPNext Module

#### Accounts Module

| Gap | Description | Impact |
|-----|-------------|--------|
| **No accounting dimensions** | CityOS tenant, scope, and category are not configured as ERPNext accounting dimensions | Cannot generate P&L or Balance Sheet by tenant, scope, or category |
| **No cost center mapping** | CityOS hierarchy (Scope → Category → Subcategory) not mapped to ERPNext Cost Centers | Cannot track costs by organizational unit |
| **No GL entry linkage** | Municipal Invoice doesn't create or link to ERPNext GL Entries | Financial data not reflected in ERPNext accounting |
| **No budget tracking** | Budget Program doesn't connect to ERPNext Budget module | Cannot compare actual vs. budgeted expenditure |
| **No fiscal year awareness** | CityOS finance doctypes don't validate against ERPNext fiscal year settings | Period-based reporting not possible |

#### HR Module

| Gap | Description | Impact |
|-----|-------------|--------|
| **No Employee linkage** | Staff Assignment doesn't link to ERPNext Employee | Cannot track which employee holds which CityOS position |
| **No Department mapping** | Position Control doesn't connect to ERPNext Department | Organizational structure not unified |
| **No Designation mapping** | Position grades/levels not mapped to ERPNext Designation | Grade/pay structure not integrated |
| **No Payroll integration** | CityOS positions don't feed into ERPNext Payroll | Payroll runs cannot be position-aware |
| **No Leave/Attendance** | Staff assignments don't consider ERPNext leave or attendance | No visibility into assignment gaps due to leave |

#### Asset Module

| Gap | Description | Impact |
|-----|-------------|--------|
| **No ERPNext Asset linkage** | Municipal Asset doesn't link to ERPNext Asset | Cannot use ERPNext's depreciation, maintenance schedule, or asset movement features |
| **No asset capitalization** | No flow from procurement to asset creation | Assets not tracked financially from acquisition |
| **No disposal workflow** | No connection to ERPNext Asset disposal/write-off | Financial impact of asset disposal not recorded |

#### Buying Module

| Gap | Description | Impact |
|-----|-------------|--------|
| **No Purchase Order creation** | Procurement Request approval doesn't generate ERPNext Purchase Order | Manual PO creation required after approval |
| **No RFQ integration** | No Request for Quotation generation from procurement requests | Vendor quotation process not automated |
| **No Supplier linkage** | Vendor Compliance Profile doesn't link to ERPNext Supplier | Vendor financial and compliance data not unified |
| **No Material Request** | No connection between maintenance needs and ERPNext Material Request | Spare parts procurement not automated |

#### Projects Module

| Gap | Description | Impact |
|-----|-------------|--------|
| **No ERPNext Project linkage** | Capital Project doesn't link to ERPNext Project | Cannot use ERPNext task management, time tracking, or costing |
| **No timesheet integration** | No connection between staff assignments and ERPNext Timesheet | Labor costs not tracked per project |
| **No billing integration** | Capital Project milestones don't trigger billing events | Project billing is manual |

---

## 7. Gap Area 5: Workflow State Machine Completeness

### 7.1 Severity: HIGH

While Temporal workflow orchestration infrastructure exists (5 workflow types, registry integration, outbox pattern), the actual state machine logic — transition rules, guards, and downstream triggers — is not implemented.

### 7.2 Current State

- 5 Temporal workflow types defined in `WORKFLOW_METADATA`
- `cityos_workflow_state` field added to 5 doctypes (Procurement Request, Municipal Invoice, Vendor Compliance Profile, Contract Register, Budget Program)
- Workflow trigger API can set initial "Workflow Started" state
- Webhook handler updates state on completion/failure
- 70 passing tests cover metadata, routing, and API contracts

### 7.3 Gaps

| Gap | Description | Impact |
|-----|-------------|--------|
| **No state transition rules** | No definition of valid state transitions (e.g., "Pending" → "Approved" or "Rejected", but not "Pending" → "Completed") | Any state can be set to any other state without validation |
| **No role-based transition guards** | No rules like "only Finance Manager can approve budget" or "only Procurement Officer can submit procurement request" | Any user with edit access can change workflow state |
| **No ERPNext Workflow integration** | CityOS workflow states bypass ERPNext's built-in Workflow module (which provides visual workflow editor, transition rules, and email alerts) | Two disconnected workflow systems, no unified experience |
| **No SLA tracking** | No time limits on workflow states (e.g., "approval must happen within 48 hours"), no escalation on timeout | No accountability for delayed approvals |
| **No escalation paths** | No automatic escalation when workflow states are stuck (e.g., auto-escalate to supervisor after 72 hours) | Requests can be stuck indefinitely |
| **No parallel approval** | No support for parallel approval paths (e.g., Finance AND Legal must both approve) | Only sequential approval possible |
| **No delegation** | No mechanism for a user to delegate their approval authority during absence | Workflow blocks during vacations |
| **No conditional transitions** | No rules like "if amount > 100,000, require additional approval level" | Same approval path regardless of risk/value |
| **Temporal handlers are stubs** | `handle_approval_chain_completed`, `handle_procurement_completed`, etc. update document state and create audit logs but don't trigger downstream actions (e.g., create PO after procurement approval) | Workflow completion doesn't drive business process |
| **No workflow history** | No record of who transitioned what state and when (beyond generic audit log) | Cannot reconstruct approval chain for audit purposes |
| **No workflow dashboard** | No view of pending approvals, in-progress workflows, or bottleneck analysis | No operational visibility into workflow health |

### 7.4 Required Workflow State Machines

#### Procurement Approval Workflow
```
Draft → Submitted → Budget Check → Under Review → [Amount-based routing]
  → < 50,000: Department Head Approval → Approved
  → 50,000-500,000: Director Approval → Approved
  → > 500,000: Committee Approval → Director Approval → Approved
Approved → RFQ Issued → Vendor Selected → PO Created → Received → Closed
Any state → Rejected (with reason)
Any state → On Hold (with reason)
```

#### Budget Approval Workflow
```
Draft → Submitted → Finance Review → [Tier-based routing]
  → CITY: City Manager Approval → Approved
  → COUNTRY: National Budget Office Approval → Approved
  → REGIONAL: Regional Director Approval → Approved
Approved → Active → Revision Requested → Under Revision → Re-submitted → ...
Active → Closed (at fiscal year end)
```

#### Invoice Settlement Workflow
```
Draft → Submitted → Verification → Approved → Payment Scheduled → Paid → Reconciled
Any state → Disputed (with reason) → Under Investigation → Resolved
Submitted → Rejected (with reason)
```

#### Vendor Onboarding Workflow
```
Application Received → Document Verification → Compliance Check → Background Check
→ [Result-based routing]
  → All Clear: Approved → Active
  → Issues Found: Conditional Approval (with conditions) → Conditions Met → Active
  → Failed: Rejected (with reason)
Active → Under Review (periodic) → Re-approved / Suspended / Debarred
```

---

## 8. Gap Area 6: API Endpoints and External System Contracts

### 8.1 Severity: MEDIUM-HIGH

The system has webhook endpoints for receiving events but lacks structured APIs for external systems to interact with CityOS entities.

### 8.2 Current Endpoints

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/method/cityos.integrations.webhooks.medusa_webhook` | POST | Receive Medusa Commerce webhooks | Active |
| `/api/method/cityos.integrations.webhooks.payload_webhook` | POST | Receive Payload CMS webhooks | Active |
| `/api/method/cityos.integrations.webhooks.temporal_webhook` | POST | Receive Temporal workflow callbacks | Active |
| `/api/method/cityos.integrations.temporal_sync.trigger_workflow` | POST | Trigger a Temporal workflow | Active |
| `/api/method/cityos.integrations.temporal_sync.get_workflow_types` | GET | List available workflow types | Active |
| `/api/method/cityos.integrations.temporal_sync.get_workflow_status` | GET | Get workflow status for a document | Active |
| `/api/method/cityos.integrations.workflow_registry.get_workflow_registry_status` | GET | Get registry connection status | Active |
| `/api/method/cityos.integrations.workflow_registry.trigger_discovery` | POST | Trigger workflow discovery | Active |

### 8.3 Missing API Endpoints

| Category | Endpoint | Purpose |
|----------|----------|---------|
| **Entity CRUD** | `GET/POST /api/cityos/procurement-requests` | External systems cannot manage procurement requests |
| **Entity CRUD** | `GET/POST /api/cityos/budget-programs` | External systems cannot query/create budgets |
| **Entity CRUD** | `GET/POST /api/cityos/municipal-assets` | External systems cannot manage assets |
| **Entity CRUD** | `GET/POST /api/cityos/contracts` | External systems cannot manage contracts |
| **Entity CRUD** | `GET/POST /api/cityos/capital-projects` | External systems cannot manage projects |
| **Governance** | `GET /api/cityos/tenant-hierarchy` | No API to query the full tenant tree |
| **Governance** | `GET /api/cityos/governance-chain/{tenant}` | No API to get governance authority chain for a tenant |
| **Finance** | `GET /api/cityos/budget-utilization/{program}` | No API to check budget availability |
| **Finance** | `GET /api/cityos/fiscal-summary/{period}` | No API for fiscal period summaries |
| **Compliance** | `GET /api/cityos/compliance-status` | No API to check overall compliance health |
| **Compliance** | `GET /api/cityos/audit-log` | No filtered API for audit log queries |
| **Integration** | `GET /api/cityos/sync-status` | No API to check cross-system sync health |
| **Integration** | `POST /api/cityos/resync/{entity_type}` | No API to trigger re-sync for specific entity types |
| **Reporting** | `GET /api/cityos/dashboard-data` | No API for dashboard metrics/KPIs |

### 8.4 API Architectural Gaps

| Gap | Description | Impact |
|-----|-------------|--------|
| **No API versioning** | Endpoints have no version prefix (e.g., `/api/v1/cityos/...`) | Breaking changes affect all consumers simultaneously |
| **No OpenAPI/Swagger documentation** | No machine-readable API contract | External teams cannot auto-generate clients |
| **No rate limiting** | Webhook and API endpoints have no throttling | Vulnerable to abuse or accidental flooding |
| **No idempotency keys** | Duplicate webhook deliveries could create duplicate records | Data duplication risk during network issues |
| **No request/response schema validation** | Incoming payloads not validated against JSON schemas | Silent data corruption from malformed requests |
| **No pagination standards** | No consistent pagination pattern across API endpoints | Inconsistent client experience |
| **No HATEOAS or resource linking** | API responses don't include links to related resources | Clients must hard-code URL patterns |
| **No webhook delivery status API** | No way for external systems to check if their webhooks are being received | Debugging integration issues is difficult |

---

## 9. Gap Area 7: Dashboard and Reporting Capabilities

### 9.1 Severity: MEDIUM-HIGH

Operational visibility is critical for a CityOS platform serving municipal government. Current reporting is minimal.

### 9.2 Current State

- **8 number cards** on workspace pages showing basic counts (tenants, stores, assets, invoices, etc.)
- **6 workspace pages** with doctype shortcuts
- **Compliance check results** logged to CityOS Audit Log (not surfaced in a dashboard)
- **No custom reports**, chart groups, or analytics pages

### 9.3 Missing Dashboards

| Dashboard | Purpose | Key Metrics |
|-----------|---------|-------------|
| **Governance Overview** | Tenant hierarchy health and governance compliance | Tenant count by tier, governance authority coverage, policy compliance %, persona assignment coverage |
| **Financial Dashboard** | Municipal financial health at a glance | Total budget vs. expenditure, budget utilization %, revenue by source, outstanding invoices, overdue payments |
| **Procurement Pipeline** | Track procurement requests through approval stages | Requests by status, average approval time, spending by category, vendor distribution, contract expiry alerts |
| **Asset Management** | Municipal asset health and utilization | Assets by condition, maintenance compliance %, overdue maintenance count, asset utilization rate, depreciation summary |
| **HR Dashboard** | Organizational capacity and staffing | Positions filled vs. authorized, vacancy rate, assignment coverage, staff distribution by department/location |
| **Project Portfolio** | Capital project status and progress | Projects by phase, budget burn rate, milestone completion %, at-risk projects, community impact score |
| **Integration Health** | Cross-system synchronization status | Sync success/failure rates by system, outbox queue depth, dead letter count, average sync latency, last sync timestamp |
| **Compliance Dashboard** | Compliance posture and findings | Finding count by severity, trend over time, unresolved critical findings, policy expiry countdown, sync health score |
| **Workflow Dashboard** | Workflow performance and bottlenecks | Pending approvals by type, average time in each state, SLA compliance %, stuck workflows, escalated items |

### 9.4 Missing Reports

| Report | Type | Description |
|--------|------|-------------|
| **Budget Utilization Report** | Script Report | Budget vs. actual by program, funding source, and period |
| **Procurement Status Report** | Script Report | All procurement requests with current status, assigned vendor, timeline |
| **Asset Register** | Script Report | Complete asset listing with condition, location, custodian, and book value |
| **Maintenance Compliance Report** | Script Report | Scheduled vs. completed maintenance, overdue items |
| **Vendor Performance Report** | Script Report | Vendor compliance scores, delivery performance, dispute history |
| **Contract Expiry Report** | Script Report | Contracts expiring within 30/60/90 days |
| **Tenant Activity Report** | Script Report | Document creation/modification activity by tenant |
| **Integration Sync Report** | Script Report | Sync success/failure breakdown by system and entity type |
| **Governance Hierarchy Report** | Query Report | Full tenant tree with governance authority chain |
| **Compliance Findings Report** | Script Report | All compliance findings by category, severity, and resolution status |

---

## 10. Gap Area 8: Security (RBAC, Permissions, API Auth)

### 10.1 Severity: HIGH

Security gaps in a government ERP system are particularly concerning due to the sensitivity of financial, personnel, and governance data.

### 10.2 Current Security Implementation

- **Custom roles** defined: CityOS Administrator, Finance Manager, Procurement Officer, Asset Manager, HR Manager, Project Manager
- **Permission query conditions** on 21 standard ERPNext doctypes
- **Webhook signature verification** (HMAC) for Medusa and Payload webhooks
- **Audit trail** on all CityOS-aware document operations
- **`@frappe.whitelist()`** decorator on all API endpoints

### 10.3 Gaps

#### Role-Based Access Control (RBAC)

| Gap | Description | Impact |
|-----|-------------|--------|
| **No role permissions on custom doctypes** | CityOS doctypes (Budget Program, Procurement Request, etc.) don't have explicit DocPerm entries defining which roles can read/write/submit/cancel | All users with System Manager role can access everything; custom roles are defined but not enforced |
| **No role hierarchy** | CityOS Administrator should inherit permissions from all other CityOS roles; no inheritance defined | Admin must be manually granted each permission |
| **No workflow-state permissions** | Document permissions don't change based on workflow state (e.g., submitted documents should be read-only except for approvers) | Users can edit documents that are under review |
| **No department-scoped permissions** | No mechanism to restrict access within a tenant by department/section | All users in a tenant see all that tenant's data |

#### Field-Level Permissions

| Gap | Description | Impact |
|-----|-------------|--------|
| **No sensitive field restrictions** | Financial amounts, compliance scores, personnel data not restricted by role | Any user with document read access sees all fields |
| **No computed field protection** | Derived/calculated fields (totals, utilization percentages) not marked as read-only | Users could manually override calculated values |
| **No PII protection** | No field-level encryption or access restriction for personally identifiable information | PII exposure risk in government HR/citizen data |

#### API Security

| Gap | Description | Impact |
|-----|-------------|--------|
| **No API key rotation** | External system credentials (Medusa, Payload, Temporal) are static values in site_config.json | Compromised keys remain valid indefinitely |
| **No tenant-scoped API access** | External systems authenticate with a single credential and can access all tenants' data | Cannot restrict external system access to specific jurisdictions |
| **No request signing for outbound calls** | Outbound API calls to external systems use Bearer tokens only | No message integrity verification for outbound requests |
| **No CORS configuration** | No explicit CORS policy for API endpoints | Browser-based integrations may be unrestricted or blocked |
| **No audit for API access** | API calls from external systems are not logged in CityOS Audit Log | Cannot track what external systems accessed |

#### Data Protection

| Gap | Description | Impact |
|-----|-------------|--------|
| **No data classification** | No framework for classifying data sensitivity (public, internal, confidential, restricted) | Cannot apply appropriate controls by sensitivity level |
| **No data retention policies** | No automatic archival or deletion of old records per retention requirements | Potential regulatory non-compliance |
| **No export controls** | No restrictions on bulk data export from the system | Risk of unauthorized data exfiltration |

---

## 11. Gap Area 9: Missing Doctypes and Fields

### 11.1 Severity: MEDIUM

Several entity types needed for comprehensive CityOS operations are not yet implemented.

### 11.2 Missing Doctypes

| Doctype | Module | Purpose | Priority |
|---------|--------|---------|----------|
| **Service Request** | Governance | Citizen/department service request management (pothole fix, permit application, information request) | High |
| **Permit/License** | Governance | Business permits, construction permits, operational licenses with application/approval/renewal lifecycle | High |
| **Inspection Record** | Assets Management | Facility/asset inspection results, findings, corrective actions | High |
| **SLA Definition** | Governance | Service level agreement templates defining response/resolution timeframes by request type and priority | Medium |
| **Revenue Source** | Finance | Municipal revenue tracking (property taxes, fees, fines, grants, transfers) distinct from ERPNext income | Medium |
| **Fee Schedule** | Finance | Municipal fee definitions with rates, effective dates, and applicability rules | Medium |
| **Citizen/Stakeholder** | Governance | Municipal contact/citizen record extending beyond ERPNext Customer (resident status, ward, demographics) | Medium |
| **Official Document** | Governance | Ordinances, resolutions, council minutes, official communications with version history | Medium |
| **Notification Rule** | Governance | CityOS-specific notification configuration (compliance alerts, SLA breaches, approval reminders) | Medium |
| **Compliance Case** | Compliance | Formal compliance investigation tracking (finding → investigation → resolution → closure) | Medium |
| **Vendor Performance Record** | Procurement | Individual performance entries per vendor per contract/PO for aggregation | Low |
| **Asset Transfer** | Assets Management | Record of asset movement between locations/custodians with approval workflow | Low |
| **Budget Revision** | Finance | Formal budget amendment records with justification and approval chain | Low |
| **Project Milestone** | CityOS Projects | Individual milestone tracking with deliverables, deadlines, and completion evidence | Low |
| **Environmental Impact** | CityOS Projects | Environmental assessment records for capital projects | Low |
| **Public Consultation** | CityOS Projects | Record of public consultation events, attendance, feedback, decisions | Low |

### 11.3 Missing Fields on Existing Doctypes

| Doctype | Missing Fields | Purpose |
|---------|---------------|---------|
| **Budget Program** | `fiscal_year`, `revision_number`, `approved_amount`, `committed_amount`, `actual_amount`, `available_amount`, `approval_status`, `approved_by`, `approved_date` | Financial tracking and approval workflow |
| **Municipal Invoice** | `due_date`, `payment_status`, `paid_amount`, `outstanding_amount`, `overdue_days`, `late_fee`, `payment_terms`, `linked_sales_invoice` | Payment lifecycle management |
| **CityOS Procurement Request** | `estimated_amount`, `approved_amount`, `actual_amount`, `budget_program`, `urgency_level`, `required_by_date`, `procurement_method`, `evaluation_criteria`, `selected_vendor` | Full procurement lifecycle |
| **Vendor Compliance Profile** | `compliance_score`, `last_assessment_date`, `next_assessment_date`, `certificates` (child table), `performance_rating`, `risk_level`, `debarment_status`, `debarment_reason`, `linked_supplier` | Vendor risk management |
| **Contract Register** | `contract_value`, `amended_value`, `total_value`, `start_date`, `end_date`, `renewal_date`, `payment_schedule` (child table), `milestones` (child table), `linked_vendor`, `linked_procurement_request` | Contract lifecycle |
| **Municipal Asset** | `asset_value`, `accumulated_depreciation`, `book_value`, `condition_rating`, `last_inspection_date`, `custodian`, `location`, `gps_coordinates`, `linked_erpnext_asset`, `qr_code` | Asset lifecycle management |
| **Maintenance Plan** | `estimated_cost`, `actual_cost`, `assigned_contractor`, `work_order_number`, `completion_date`, `completion_notes`, `next_scheduled_date`, `recurrence_pattern` | Maintenance scheduling and tracking |
| **Capital Project** | `total_budget`, `spent_amount`, `committed_amount`, `completion_percentage`, `current_phase`, `project_manager`, `contractor`, `start_date`, `expected_end_date`, `actual_end_date`, `risk_level` | Project portfolio management |
| **Position Control** | `position_grade`, `position_step`, `budget_allocation`, `department`, `reporting_to`, `required_qualifications`, `is_frozen`, `freeze_reason` | Organizational structure |
| **Staff Assignment** | `employee`, `effective_from`, `effective_to`, `assignment_type` (permanent/acting/interim), `previous_position`, `approval_status` | Personnel management |

---

## 12. Gap Area 10: Data Migration and Seeding

### 12.1 Severity: MEDIUM

The system needs baseline data to function and migration tools to onboard existing municipal data.

### 12.2 Current State

- `after_install` and `after_migrate` hooks exist in `cityos.setup.install`
- Custom fields are added programmatically during installation
- No seed data, no demo data, no migration utilities

### 12.3 Missing Seed Data

| Data Category | Description | Required For |
|---------------|-------------|-------------|
| **Default Governance Hierarchy** | MASTER tenant with default governance authority | System initialization |
| **Default Scopes** | Standard municipal scopes (Administration, Infrastructure, Social Services, Public Safety, Environment) | Document classification |
| **Default Categories** | Standard categories per scope (e.g., Infrastructure → Roads, Water, Electricity, Buildings) | Document classification |
| **Default Roles and Permissions** | DocPerm entries for all custom doctypes × custom roles | Access control |
| **Default Workflow States** | Standard workflow state definitions for each workflow type | Workflow operation |
| **Default Policy Templates** | Baseline governance policies (data retention, access control, procurement thresholds) | Compliance framework |
| **Default Fee Schedules** | Standard municipal fee types and structures | Revenue management |
| **Default SLA Templates** | Standard service level agreements by request type | Service delivery |
| **Default Number Series** | Tenant-scoped naming series for all doctypes | Document numbering |
| **Default Print Formats** | Municipal-branded print formats for invoices, procurement, contracts | Document output |

### 12.4 Missing Migration Tools

| Tool | Purpose | Impact |
|------|---------|--------|
| **Data Import Templates** | CSV/Excel templates for bulk importing existing municipal data (assets, employees, vendors, budgets) | Cannot onboard existing data without manual entry |
| **Legacy System Migration Script** | Script to map and import data from predecessor ERP/accounting systems | Manual data entry for all historical data |
| **ERPNext Data Enhancement** | Script to add CityOS fields (tenant, scope, category) to existing ERPNext documents | Existing ERPNext data lacks CityOS context |
| **Tenant Provisioning Script** | Automated setup for new tenant (create hierarchy node, default categories, roles, permissions, number series) | Manual multi-step process to add new tenant |
| **Demo Data Generator** | Script to generate realistic test data for all doctypes | Cannot demonstrate system capabilities without manual data creation |
| **Fixture Export/Import** | Tools to export/import CityOS configuration (not data) between environments | No way to replicate configuration across dev/staging/production |

---

## 13. Priority Recommendations

Based on the gap analysis, the following prioritization is recommended:

### Phase 1: Foundation (Critical - Must Have)

| # | Action | Gap Areas | Effort |
|---|--------|-----------|--------|
| 1 | **Add business logic to core doctypes** — Validation, status flows, and calculations for Procurement Request, Municipal Invoice, Budget Program, and Vendor Compliance Profile | 1, 5, 7 | Large |
| 2 | **Harden multi-tenant isolation** — Add permission query conditions for ALL custom doctypes; enforce tenant in API handlers; fix default tenant fallback | 3, 8 | Medium |
| 3 | **Configure RBAC** — Add DocPerm entries for all custom doctypes × custom roles; implement field-level permissions for sensitive data | 8 | Medium |
| 4 | **Add missing fields to core doctypes** — Financial tracking, lifecycle, and linkage fields per Section 11.3 | 9 | Medium |

### Phase 2: Integration (High Priority)

| # | Action | Gap Areas | Effort |
|---|--------|-----------|--------|
| 5 | **Connect CityOS to ERPNext modules** — Link Budget Program → ERPNext Budget, Procurement Request → Purchase Order, Municipal Asset → ERPNext Asset, Staff Assignment → Employee | 4 | Large |
| 6 | **Complete CMS bidirectional sync** — Add outbound sync for finance, procurement, and project entities; implement conflict detection; add sync status tracking | 2 | Large |
| 7 | **Implement workflow state machines** — Define valid transitions, role-based guards, and downstream triggers for procurement and budget approval workflows | 5 | Large |
| 8 | **Add seed data and tenant provisioning** — Default governance hierarchy, scopes, categories, permissions, and automated tenant setup | 10 | Medium |

### Phase 3: Operational Visibility (Medium Priority)

| # | Action | Gap Areas | Effort |
|---|--------|-----------|--------|
| 9 | **Build operational dashboards** — Financial, procurement pipeline, asset management, and integration health dashboards | 7 | Medium |
| 10 | **Create custom reports** — Budget utilization, procurement status, asset register, vendor performance, compliance findings | 7 | Medium |
| 11 | **Add missing operational doctypes** — Service Request, Permit/License, Inspection Record, SLA Definition | 9 | Medium |
| 12 | **Implement API versioning and documentation** — Version prefix, OpenAPI spec, rate limiting, idempotency | 6 | Medium |

### Phase 4: Maturity (Lower Priority)

| # | Action | Gap Areas | Effort |
|---|--------|-----------|--------|
| 13 | **Build remaining doctype business logic** — Assets, HR, Projects, Compliance modules | 1 | Large |
| 14 | **Implement advanced workflow features** — Parallel approval, delegation, SLA tracking, escalation | 5 | Large |
| 15 | **Add data migration tools** — Import templates, legacy migration, demo data generator | 10 | Medium |
| 16 | **Implement advanced security** — API key rotation, data classification, retention policies, export controls | 8 | Medium |

---

## Appendix A: Current Doctype Inventory

### Governance Module (12 doctypes)
1. Node Context — Hierarchical tenant management (5-tier)
2. CityOS Scope — Top-level classification
3. CityOS Category — Second-level classification
4. CityOS Subcategory — Third-level classification
5. CityOS Store — Operational unit
6. CityOS Portal — Public-facing portal
7. Governance Authority — Authority/jurisdiction management
8. Policy Doctrine — Governance policy management
9. CityOS Persona — Role/persona definitions
10. CityOS Persona Assignment — User-persona mapping
11. CityOS Audit Log — Immutable audit trail
12. Integration Outbox Event — Event publishing queue

### Finance Module (4 doctypes)
13. Budget Program — Budget management
14. Funding Source — Revenue/funding tracking
15. Municipal Invoice — Municipal billing
16. Fiscal Allocation — Fund allocation

### Procurement Module (3 doctypes)
17. CityOS Procurement Request — Purchase requests
18. Vendor Compliance Profile — Vendor management
19. Contract Register — Contract tracking

### Assets Management Module (3 doctypes)
20. Municipal Asset — Asset tracking
21. Municipal Facility — Facility management
22. Maintenance Plan — Maintenance scheduling

### HR Management Module (2 doctypes)
23. Position Control — Position management
24. Staff Assignment — Personnel assignment

### CityOS Projects Module (2 doctypes)
25. Capital Project — Infrastructure project management
26. Community Impact Report — Impact assessment

---

## Appendix B: Integration Endpoint Map

### Inbound (External → ERPNext)

```
POST /api/method/cityos.integrations.webhooks.medusa_webhook
  ├── order.placed → Creates Sales Invoice
  ├── order.completed → Updates Invoice status
  ├── order.updated → Updates Invoice details
  ├── order.cancelled → Cancels Invoice
  ├── product.created → Creates Item
  ├── product.updated → Updates Item
  ├── product.deleted → Disables Item
  ├── customer.created → Creates Customer
  ├── payment.captured → Creates Payment Entry
  ├── payment.refunded → Creates reversal Payment Entry
  ├── vendor.created → Creates Supplier
  ├── tenant.created → Creates Node Context
  ├── tenant.updated → Updates Node Context
  ├── store.created → Creates CityOS Store
  ├── store.updated → Updates CityOS Store
  └── store.deleted → Disables CityOS Store

POST /api/method/cityos.integrations.webhooks.payload_webhook
  ├── tenants → Creates/Updates Node Context
  ├── stores → Creates/Updates CityOS Store
  ├── categories → Creates/Updates CityOS Category
  ├── scopes → Creates/Updates CityOS Scope
  ├── subcategories → Creates/Updates CityOS Subcategory
  ├── portals → Creates/Updates CityOS Portal
  ├── governance-authorities → Creates/Updates Governance Authority
  ├── policies → Creates/Updates Policy Doctrine
  ├── personas → Creates/Updates CityOS Persona
  ├── persona-assignments → Creates/Updates CityOS Persona Assignment
  ├── countries → Ensures Country exists
  ├── compliance-records → Creates Audit Log entry
  └── nodes → Dispatches to entity-specific handlers

POST /api/method/cityos.integrations.webhooks.temporal_webhook
  └── Workflow completion/failure → Updates document workflow state + audit log
```

### Outbound (ERPNext → External)

```
ERPNext → Medusa Commerce (via Outbox)
  ├── ERP_INVOICE_SUBMITTED → On Sales Invoice submit
  └── ERP_PAYMENT_RECORDED → On Payment Entry submit

ERPNext → Payload CMS (direct API)
  ├── sync_vendor_to_payload → On Supplier create/update
  ├── sync_asset_to_payload → On Municipal Asset create/update
  ├── sync_governance_authority_to_payload → On Governance Authority create/update
  ├── sync_policy_to_payload → On Policy Doctrine create/update
  └── sync_persona_to_payload → On CityOS Persona create/update

ERPNext → Temporal (via Outbox)
  ├── TEMPORAL_WORKFLOW_APPROVAL_CHAIN → General approval
  ├── TEMPORAL_WORKFLOW_PROCUREMENT_APPROVAL → Procurement approval
  ├── TEMPORAL_WORKFLOW_INVOICE_SETTLEMENT → Invoice settlement
  ├── TEMPORAL_WORKFLOW_VENDOR_ONBOARDING → Vendor onboarding
  └── TEMPORAL_WORKFLOW_BUDGET_APPROVAL → Budget approval

ERPNext → Workflow Registry (direct API)
  ├── discover_workflows → GET registry for available workflows
  ├── register_workflows → POST 5 workflow types to registry
  └── poll_registry_updates → Hourly polling for changes
```

### Scheduled Tasks

```
Every 15 minutes:
  └── sync_pending_orders → Pull pending Medusa orders into ERPNext

Hourly:
  ├── publish_pending_events → Dispatch outbox events to target systems
  └── poll_registry_updates → Check workflow registry for changes

Daily:
  ├── run_daily_compliance_checks → 9 compliance checks → Audit Log
  └── sync_hierarchy_from_cms → Pull full hierarchy from Payload CMS

On Login:
  └── on_boot_discovery → Discover + register workflows with registry
```

---

*End of Gap Analysis Document*
