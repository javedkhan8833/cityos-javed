# Fleetbase — Detailed Implementation Plan for Remaining Gaps

**Date:** February 13, 2026  
**Reference:** BACKEND_MODELS_ASSESSMENT.md  
**Priority Scale:** P0 (Critical/Blocker) → P1 (High) → P2 (Medium) → P3 (Low/Nice-to-have)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Gap 1: Fleet Maintenance UI Completion](#2-gap-1-fleet-maintenance-ui-completion)
3. [Gap 2: IoT/Telematics UI & Integration](#3-gap-2-iottelematics-ui--integration)
4. [Gap 3: Report Builder Frontend](#4-gap-3-report-builder-frontend)
5. [Gap 4: OutboxEvent Admin Dashboard](#5-gap-4-outboxevent-admin-dashboard)
6. [Gap 5: IntegrationLog Admin Dashboard](#6-gap-5-integrationlog-admin-dashboard)
7. [Gap 6: LoginAttempt Security Audit UI](#7-gap-6-loginattempt-security-audit-ui)
8. [Gap 7: Storefront Reviews/Votes UI](#8-gap-7-storefront-reviewsvotes-ui)
9. [Gap 8: Medusa E-Commerce Integration](#9-gap-8-medusa-e-commerce-integration)
10. [Gap 9: walt.id Decentralized Identity](#10-gap-9-waltid-decentralized-identity)
11. [Gap 10: Temporal Workflow Engine Connection](#11-gap-10-temporal-workflow-engine-connection)
12. [Gap 11: Payload CMS Full Sync](#12-gap-11-payload-cms-full-sync)
13. [Gap 12: ERPNext Financial Integration](#13-gap-12-erpnext-financial-integration)
14. [Gap 13: Twilio Production SMS](#14-gap-13-twilio-production-sms)
15. [Gap 14: Architectural Hardening](#15-gap-14-architectural-hardening)
16. [Timeline & Dependency Map](#16-timeline--dependency-map)

---

## 1. Executive Summary

This plan covers 14 identified gaps across 4 categories:

| Category | Gaps | Combined Effort |
|----------|------|-----------------|
| **Frontend UI Completion** | Gaps 1–7 | ~18–24 weeks |
| **External Integrations** | Gaps 8–12 | ~16–22 weeks |
| **Operational** | Gap 13 | ~1 week |
| **Architectural** | Gap 14 | ~6–8 weeks |

**Total estimated effort:** 41–55 weeks (with parallel execution across teams, compresses to ~16–20 weeks)

---

## 2. Gap 1: Fleet Maintenance UI Completion

**Priority:** P1 (High)  
**Effort:** 4–6 weeks  
**Current State:** Backend models fully implemented (Maintenance, WorkOrder, Part, Warranty). Frontend has routes and basic controllers (`maintenance/equipment`, `maintenance/parts`, `maintenance/work-orders`) with ~129 lines per controller. Components exist (`maintenance/details.js` — 3 lines, `maintenance/form.js` — 18 lines) but are minimal stubs.

### 2.1 Backend API Gaps

The backend already has internal API controllers. Verify and extend:

**Task 2.1.1 — Maintenance API Controller Review**
- **File:** `api/vendor/fleetbase/fleetops-api/server/src/Http/Controllers/Internal/v1/MaintenanceController.php`
- **Actions:**
  - Verify standard CRUD endpoints exist (index, create, show, update, delete)
  - Add `POST /{id}/complete` — triggers `complete()` on model, updates odometer/engine hours
  - Add `POST /{id}/schedule-next` — calls `scheduleNext()` to auto-create follow-up maintenance
  - Add `GET /overdue` — returns overdue maintenance items (uses `scopeOverdue()`)
  - Add `GET /upcoming` — returns upcoming maintenance (uses `scopeUpcoming(days)`)
  - Add `GET /{id}/cost-summary` — returns `calculateTotalCost()` breakdown
  - Add `POST /bulk-complete` — batch completion
  - Add `GET /export` — CSV/Excel export

**Task 2.1.2 — WorkOrder API Controller Review**
- **File:** `api/vendor/fleetbase/fleetops-api/server/src/Http/Controllers/Internal/v1/WorkOrderController.php`
- **Actions:**
  - Verify standard CRUD
  - Add `POST /{id}/complete` — triggers `complete()`, sets actual hours
  - Add `PATCH /{id}/checklist` — update checklist items individually (calls `getCompletionPercentage()`)
  - Add `GET /open` — returns open work orders (uses `scopeOpen()`)
  - Add `GET /overdue` — returns overdue work orders
  - Add `GET /{id}/progress` — returns completion percentage

**Task 2.1.3 — Part API Controller Review**
- **Actions:**
  - Add `POST /{id}/adjust-stock` — calls `adjustStock()`, auto-triggers low-stock alerts via `isLowStock()`
  - Add `GET /low-stock` — returns parts below reorder point (uses `scopeLowStock()`)
  - Add `POST /{id}/reorder` — calls `reorder()` to trigger purchase order creation

**Task 2.1.4 — Warranty API Controller Review**
- **Actions:**
  - Add `GET /expiring-soon` — uses `scopeExpiringSoon(30)` for 30-day lookahead
  - Add `GET /{id}/coverage-check` — calls `hasCoverage()` and `coversAmount()`
  - Add `GET /active` — uses `scopeActive()`

### 2.2 Frontend UI Implementation

**Task 2.2.1 — Maintenance List View**
- **Location:** `@fleetbase/fleetops-engine/addon/templates/maintenance/index.hbs`
- **Features:**
  - Filterable/sortable table: vehicle/asset name, type, priority, status, scheduled date, next due date, total cost
  - Status badges (scheduled, in-progress, completed, overdue) with color coding
  - Quick-action buttons: Complete, Schedule Next, View Work Orders
  - Filter sidebar: by status, priority, vehicle, date range, overdue toggle
  - Bulk actions: complete, delete, export
  - Summary cards at top: Total active, Overdue count, Upcoming (7 days), Monthly cost

**Task 2.2.2 — Maintenance Detail/Form Panel**
- **Location:** `@fleetbase/fleetops-engine/addon/components/maintenance/details.js` (currently 3 lines — needs full implementation)
- **Features:**
  - Slide-out panel or full-page detail view
  - Header: vehicle/asset info with avatar, status badge
  - Sections:
    1. **General:** Name, type (preventive/corrective/inspection), priority, status, scheduled/completed dates
    2. **Service Details:** Odometer at service, engine hours, next due date, assigned vendor, assigned technician
    3. **Cost Breakdown:** Labor cost, parts cost, tax, total cost (auto-calculated)
    4. **Parts Used:** Linked parts with quantity and cost (from `morphMany parts`)
    5. **Work Orders:** Child work orders list with status and completion percentage
    6. **Notes:** Free-text notes field
    7. **Activity Log:** Timeline of changes (from Spatie ActivityLog)
  - Actions: Save, Complete, Schedule Next, Delete, Print

**Task 2.2.3 — Work Order List & Detail**
- **Features:**
  - List view with: name, maintenance reference, assignee, status, priority, scheduled date, completion %
  - Detail panel:
    1. **Info:** Name, type, description, assignee, estimated vs actual hours
    2. **Checklist:** Interactive checklist with checkbox items, auto-updates completion percentage
    3. **Parts Used:** Linked parts
    4. **Cost:** Labor, parts, total
    5. **Timeline:** Status change history

**Task 2.2.4 — Parts Inventory Management**
- **Features:**
  - List view: part name, part number, manufacturer, quantity on hand, reorder point, unit cost, total value
  - Visual indicator for low-stock (quantity ≤ reorder point)
  - Detail panel:
    1. **Part Info:** Name, part number, serial, manufacturer, type, condition
    2. **Stock:** Current quantity, minimum quantity, reorder point with stock adjustment modal
    3. **Cost:** Unit cost, total value
    4. **Usage History:** Where this part is used (via `morphTo partable`)
    5. **Vendor:** Linked vendor for reordering
  - Actions: Adjust Stock, Reorder, Export

**Task 2.2.5 — Equipment Management**
- **Features:**
  - List view: name, serial number, type, condition, installed on (vehicle/asset), warranty status
  - Detail panel: equip/unequip actions, maintenance history, warranty info
  - Actions: Equip to Vehicle/Asset, Unequip, Schedule Maintenance

**Task 2.2.6 — Warranty Tracker**
- **Features:**
  - Dashboard widget: warranties expiring in 30/60/90 days
  - List view: provider, policy number, subject (vehicle/asset), start/end date, days remaining, coverage summary
  - Detail panel: full coverage details, claim history
  - Alert: auto-notification when warranty expiring soon

### 2.3 Data Model Connections

```
Vehicle/Asset
  └── Maintenance (polymorphic via maintainable)
       ├── WorkOrder (1:N)
       │    └── Part (morphMany)
       └── Part (morphMany)
  └── Equipment (1:N)
  └── Warranty (polymorphic via subject)
```

### 2.4 Testing

- Unit tests for new API endpoints (complete, schedule-next, cost-summary)
- Integration test: create maintenance → add work orders → complete work orders → complete maintenance → verify cost rollup
- UI smoke test: CRUD operations on each model via console

---

## 3. Gap 2: IoT/Telematics UI & Integration

**Priority:** P2 (Medium)  
**Effort:** 5–7 weeks  
**Current State:** Backend models exist (Device, DeviceEvent, Sensor, Telematic, VehicleDevice, VehicleDeviceEvent). Frontend has component directories with form/details/card/manager/panel-header components for device, sensor, telematic. Routes exist for `connectivity/devices`. Controllers exist but may need enhancement.

### 3.1 Backend API Enhancements

**Task 3.1.1 — Device API Enhancements**
- Add `POST /{id}/update-location` — updates device location and creates position record
- Add `GET /{id}/events` — paginated event history with severity filtering
- Add `GET /{id}/latest-reading` — last sensor reading
- Add `POST /bulk-provision` — batch device onboarding
- Add WebSocket/SSE endpoint for real-time device status (or polling fallback)

**Task 3.1.2 — Sensor API Enhancements**
- Add `POST /{id}/record-reading` — calls `recordReading()` and `checkThresholds()`
- Add `GET /{id}/readings` — historical readings with date range filter
- Add `GET /{id}/alerts` — alerts triggered by this sensor
- Add `GET /requires-calibration` — uses `scopeRequiresCalibration()`

**Task 3.1.3 — Telematic Provider Framework**
- Add `GET /providers` — list registered telematics providers
- Add `POST /{id}/sync` — calls `syncWithProvider()` to pull latest data
- Add `POST /webhooks/telematics/{providerKey}` — already exists, verify it processes events correctly
- Document provider registration pattern for adding new telematics integrations

**Task 3.1.4 — DeviceEvent Alert Pipeline**
- Verify `shouldTriggerAlert()` correctly creates Alert records for errors/warnings/threshold violations
- Add `POST /events/{id}/acknowledge` — mark event as processed
- Add batch processing endpoint for high-volume event ingestion

### 3.2 Frontend UI Implementation

**Task 3.2.1 — Device Management Dashboard (Connectivity Section)**
- **Location:** `@fleetbase/fleetops-engine/addon/templates/connectivity/devices/index.hbs`
- **Features:**
  - Grid/list toggle view of all devices
  - Device cards showing: name, type, provider, status (online/offline badge), last seen, assigned vehicle/asset
  - Real-time status indicators (green dot = online, red = offline, yellow = warning)
  - Map view showing device locations (integrate with existing FleetOps map component)
  - Filter by: type, provider, status, vehicle assignment
  - Summary bar: total devices, online count, offline count, devices with alerts

**Task 3.2.2 — Device Detail Panel**
- **Existing component:** `device/details.js`, `device/form.js`, `device/card.js`, `device/manager.js`
- **Enhance:**
  - Device info: ID, type, provider, model, manufacturer, IMEI, firmware, serial number
  - Location: mini-map showing current position
  - Status: online/offline with last contact timestamp
  - Sensors tab: linked sensors with current readings and threshold status
  - Events tab: recent events with severity badges (critical/warning/info)
  - Configuration: data frequency, metadata

**Task 3.2.3 — Sensor Monitoring View**
- **Features:**
  - Per-device sensor list with current values, thresholds, and status
  - Threshold visualization: gauge/progress bar showing current value relative to min/max
  - Historical chart: line chart of sensor readings over time (last 24h, 7d, 30d)
  - Calibration status: next calibration date, overdue indicator
  - Alert history: triggered alerts from this sensor

**Task 3.2.4 — Telematics Integration Panel**
- **Features:**
  - Provider configuration: connect to telematics providers (API keys, webhook URLs)
  - Per-vehicle telematics: linked provider, sync status, last sync timestamp
  - Manual sync button
  - Data preview: latest data from provider

**Task 3.2.5 — Alert Center Integration**
- Link Device/Sensor alerts to the existing Alert model
- Show device-triggered alerts in a unified alert center
- Allow acknowledging/resolving alerts from the UI

### 3.3 External Telematics Provider Integration Pattern

```
External Provider (e.g., Samsara, Geotab, CalAmp)
       │
       ▼ (webhook POST)
/webhooks/telematics/{providerKey}
       │
       ▼
TelematicWebhookController
       │
       ├── Create/Update Device record
       ├── Create DeviceEvent record
       ├── Update Device location
       ├── Check Sensor thresholds → Create Alert
       └── Broadcast real-time update (if WebSocket available)
```

### 3.4 Testing

- Mock telematics webhook payloads for testing without external provider
- Threshold alert tests: send reading above max → verify Alert created
- Device online/offline status transition tests
- Sensor calibration reminder tests

---

## 4. Gap 3: Report Builder Frontend

**Priority:** P2 (Medium)  
**Effort:** 3–4 weeks  
**Current State:** Backend has full Report model with `execute()`, `export()`, `validateQueryConfig()`, `getQueryComplexity()`, plus API endpoints for table introspection, query validation, execution, and export. Frontend has route structure at `analytics/reports` but likely needs significant UI work.

### 4.1 Backend API (Already Exists — Verify)

The following endpoints exist and should be verified:
- `GET /reports/tables` — list available database tables
- `GET /reports/table-schema/{table}` — get table column definitions
- `GET /reports/table-columns/{table}` — get column list
- `GET /reports/table-relationships/{table}` — get relationships
- `POST /reports/validate-query` — validate query configuration
- `POST /reports/validate-computed-column` — validate computed columns
- `POST /reports/execute-query` — execute a query and return results
- `POST /reports/analyze-query` — get query complexity analysis
- `POST /reports/export-query` — export results to CSV/Excel/PDF
- `POST /reports/{id}/execute` — execute a saved report
- `POST /reports/{id}/export` — export a saved report
- `GET /reports/query-recommendations` — AI/heuristic query suggestions
- `GET /reports/export-formats` — available export formats

### 4.2 Frontend UI Implementation

**Task 4.2.1 — Report Builder (Main UI)**
- **Location:** `@fleetbase/fleetops-engine/addon/templates/analytics/reports/index.hbs` (or create as core-api component if cross-engine)
- **Features:**
  - **Step 1 — Table Selection:** Visual schema browser showing available tables with icons per engine (FleetOps, Storefront, Pallet, CityOS)
  - **Step 2 — Column Selection:** Checkbox list of columns from selected table(s), with type indicators (text, number, date, spatial, JSON)
  - **Step 3 — Filters:** Visual filter builder (column + operator + value) with AND/OR grouping
  - **Step 4 — Joins:** Visual relationship connector for multi-table queries (auto-suggest joins from `table-relationships`)
  - **Step 5 — Computed Columns:** Formula editor for calculated fields
  - **Step 6 — Preview & Execute:** Run query, show results in sortable/filterable data grid
  - **Save/Schedule:** Save report with name, description, schedule (optional)

**Task 4.2.2 — Report List View**
- Saved reports list with: name, description, last executed, row count, execution time, status
- Quick actions: Execute, Export, Clone, Edit, Delete
- Filter by: category, creator, date range

**Task 4.2.3 — Report Detail View**
- Results data grid with column sorting, filtering, pagination
- Chart view toggle (bar, line, pie — auto-detect from data types)
- Export buttons: CSV, Excel, PDF
- Execution history: past runs with row counts and timing
- Query complexity indicator (simple/moderate/complex/expensive)

**Task 4.2.4 — Report Scheduling**
- Schedule configuration: frequency (daily, weekly, monthly), time, recipients
- Email delivery of report results
- Execution log: past scheduled runs

### 4.3 UI Component Architecture

```
ReportBuilder
  ├── TableSelector (schema browser)
  ├── ColumnPicker (checkbox list + drag-reorder)
  ├── FilterBuilder (visual query filters)
  ├── JoinEditor (relationship connector)
  ├── ComputedColumnEditor (formula builder)
  ├── QueryPreview (SQL preview — read-only)
  ├── ResultsGrid (data table with sorting/filtering)
  ├── ChartView (visualization)
  └── ExportPanel (format selection + download)
```

---

## 5. Gap 4: OutboxEvent Admin Dashboard

**Priority:** P1 (High)  
**Effort:** 2–3 weeks  
**Current State:** Backend model exists with full lifecycle management (pending, published, failed, dead_letter). Backend has routes for stats, dispatch, publish, recent. No frontend UI.

### 5.1 Backend API (Verify/Extend)

Existing routes at `cityos/integrations/outbox/*`:
- `GET /stats` — event counts by status
- `POST /dispatch` — dispatch pending events
- `POST /publish` — force-publish events
- `GET /recent` — recent events

**Additional needed:**
- `GET /events` — paginated list with status/type/tenant filtering
- `GET /events/{id}` — single event detail with full payload
- `POST /events/{id}/retry` — manual retry of failed event
- `POST /events/retry-all-failed` — batch retry all failed events
- `POST /events/{id}/dead-letter` — manually move to dead letter queue
- `GET /dead-letter` — list dead-letter events for manual investigation
- `DELETE /events/{id}` — purge old/dead events

### 5.2 Frontend UI Implementation

**Task 5.2.1 — Event Bridge Dashboard (CityOS Engine)**
- **Location:** New route in `@fleetbase/cityos-engine` under integration/monitoring section
- **Features:**
  - **Status Overview Cards:**
    - Total events (24h)
    - Pending count (with warning if > threshold)
    - Published count
    - Failed count (red if > 0)
    - Dead letter count (red if > 0)
  - **Event Stream:** Real-time scrolling list of recent events with:
    - Event type (e.g., `order.created`, `driver.updated`)
    - Tenant handle
    - Status badge (pending → published → failed → dead_letter)
    - Timestamp
    - Source module tag (fleetops/pallet/storefront/core)
  - **Filters:** By status, event type, tenant, source module, date range
  - **Failed Events Panel:**
    - List of failed events with error messages
    - Retry button per event
    - Retry All button
    - Move to Dead Letter button
  - **Dead Letter Queue:**
    - List of events that exceeded max retries
    - Full payload inspection
    - Manual republish option
    - Purge option (with confirmation)

**Task 5.2.2 — Event Detail Modal**
- Full event payload (JSON viewer)
- Node context details
- Correlation ID for tracing
- Retry history (count, next retry time)
- Error message (if failed)

### 5.3 Monitoring & Alerts

- Dashboard widget for console home: "Event Bridge Health" showing pending/failed counts
- Auto-alert when failed events exceed threshold (integrate with existing Alert model)
- Configurable thresholds via CityOS settings

---

## 6. Gap 5: IntegrationLog Admin Dashboard

**Priority:** P1 (High)  
**Effort:** 1–2 weeks  
**Current State:** Backend model exists with `logRequest()` static factory. No frontend UI.

### 6.1 Backend API

**New endpoints needed in CityOS integration controller:**
- `GET /integration-logs` — paginated list with integration/operation/status filtering
- `GET /integration-logs/{id}` — single log detail with full request/response data
- `GET /integration-logs/stats` — aggregated stats (success rate, avg duration, error count per integration)
- `DELETE /integration-logs/purge` — purge logs older than N days

### 6.2 Frontend UI Implementation

**Task 6.2.1 — Integration Logs Dashboard (CityOS Engine)**
- **Location:** CityOS > Integrations > Logs
- **Features:**
  - **Summary Cards:**
    - Total requests (24h/7d/30d toggle)
    - Success rate %
    - Average response time
    - Error count
    - Per-integration breakdown (CMS, ERPNext, Temporal)
  - **Log Table:**
    - Integration name, operation, direction (inbound/outbound), status, response code, duration (ms), timestamp
    - Color-coded status: green (success), red (error), yellow (timeout)
    - Click to expand: full request/response data in JSON viewer
  - **Filters:** By integration, operation, status, date range, response code
  - **Error Analysis:**
    - Top errors by frequency
    - Error trend chart (last 7 days)
    - Correlation ID search for tracing related operations

---

## 7. Gap 6: LoginAttempt Security Audit UI

**Priority:** P2 (Medium)  
**Effort:** 1–2 weeks  
**Current State:** Backend model stores `session_uuid`, `identity`, `password` (all hidden). No API endpoints. No frontend UI.

### 7.1 Backend API

**New endpoints in Core API (Admin-only):**
- `GET /login-attempts` — paginated list (NEVER expose identity/password — only show: timestamp, session ID, success/failure status, IP address if available)
- `GET /login-attempts/stats` — failed attempts count by time period, geographic distribution
- `GET /login-attempts/suspicious` — attempts matching suspicious patterns (>5 failures from same IP in 10 min, brute force detection)
- `DELETE /login-attempts/purge` — purge old attempts (retention policy)

**Security considerations:**
- LoginAttempt stores `identity` and `password` as hidden fields — API must NEVER return these
- Only return: UUID, timestamp, success boolean, masked identity (first 3 chars + ***), IP address, session reference
- Require admin role for access

### 7.2 Frontend UI Implementation

**Task 7.2.1 — Security Audit Dashboard**
- **Location:** Settings > Security or Admin > Security Audit
- **Features:**
  - **Summary Cards:**
    - Total login attempts (24h)
    - Failed attempts (24h) with trend
    - Unique IPs with failed attempts
    - Suspicious activity flag (if threshold exceeded)
  - **Attempt Timeline:** Chart showing login attempts over time (success vs. failure)
  - **Recent Failures Table:**
    - Masked identity, timestamp, IP address (if available)
    - No password data ever shown
  - **Suspicious Activity Alert:** When > N failures from same source in short period
  - **Data Retention Settings:** Configurable purge age (30/60/90 days)

---

## 8. Gap 7: Storefront Reviews/Votes UI

**Priority:** P3 (Low)  
**Effort:** 2–3 weeks  
**Current State:** Backend models exist (Review, Vote). Review has customer, rating, content, rejected fields. Vote has customer, subject, type. Some API support exists. UI is partial.

### 8.1 Backend API Enhancements

- `GET /reviews` — with filters: rating, status (approved/rejected/pending), store, product, date range
- `PATCH /reviews/{id}/approve` — approve a review
- `PATCH /reviews/{id}/reject` — reject a review with reason
- `GET /reviews/stats` — average rating, total reviews, rating distribution (1-5 stars)
- `GET /reviews/flagged` — reviews with reports/flags
- `POST /reviews/{id}/respond` — store/admin response to review

### 8.2 Frontend UI Implementation

**Task 8.2.1 — Review Management Dashboard (Storefront Engine)**
- **Location:** Storefront > Reviews
- **Features:**
  - **Summary:** Average rating (stars), total reviews, rating distribution bar chart, approval rate
  - **Review List:**
    - Customer name, product/store, rating (star display), content preview, date, status
    - Quick actions: Approve, Reject, Respond, View Full
  - **Review Detail Panel:**
    - Full review content
    - Customer info
    - Product/store context
    - Attached photos/videos
    - Admin response editor
    - Approve/Reject buttons
  - **Moderation Queue:** Pending reviews needing approval
  - **Filters:** By rating, status, product, store, date range

**Task 8.2.2 — Product/Store Rating Display**
- Update product and store detail views to show aggregate rating
- Star display component with review count
- "View Reviews" link to filtered review list

---

## 9. Gap 8: Medusa E-Commerce Integration

**Priority:** P1 (High)  
**Effort:** 4–6 weeks  
**Current State:** ID-mapping fields exist on Tenant (`medusa_tenant_id`), Channel (`medusa_sales_channel_id`), Portal (`medusa_store_id`). No dedicated MedusaService. No automated sync.

### 9.1 Backend Implementation

**Task 9.1.1 — Create MedusaService**
- **File:** `api/vendor/fleetbase/cityos-api/src/Services/MedusaService.php`
- **Pattern:** Follow existing `PayloadCMSService.php` and `ERPNextService.php` patterns
- **Config:**
  - `MEDUSA_API_URL` — Medusa backend URL
  - `MEDUSA_API_KEY` — API key (stored as secret)
  - `MEDUSA_PUBLISHABLE_KEY` — Public key for storefront
- **Methods:**
  - `testConnection()` — verify connectivity
  - `syncTenant($tenant)` — create/update Medusa store for tenant
  - `syncChannel($channel)` — create/update Medusa sales channel
  - `syncPortal($portal)` — link portal to Medusa store
  - `syncProducts($tenant)` — push Storefront products to Medusa (Product → Medusa Product)
  - `syncOrders($tenant)` — pull Medusa orders into FleetOps for fulfillment
  - `syncInventory($tenant)` — push Pallet inventory levels to Medusa
  - `syncCustomers($tenant)` — bidirectional customer sync
  - `handleWebhook($payload)` — process Medusa webhook events

**Task 9.1.2 — Medusa Webhook Controller**
- **File:** `api/vendor/fleetbase/cityos-api/src/Http/Controllers/MedusaWebhookController.php`
- **Route:** `POST /api/webhooks/cityos/medusa`
- **Events to handle:**
  - `order.placed` → create FleetOps Order for fulfillment
  - `order.updated` → sync status back
  - `product.updated` → update local product
  - `inventory.updated` → update Pallet inventory
  - `customer.created` → create Storefront Customer

**Task 9.1.3 — Medusa Data Mapping**

| Medusa Entity | Fleetbase Entity | Sync Direction |
|---------------|------------------|----------------|
| Store | CityOS Tenant + Portal | Fleetbase → Medusa |
| Sales Channel | CityOS Channel | Fleetbase → Medusa |
| Product | Storefront Product | Bidirectional |
| Product Variant | ProductVariant | Bidirectional |
| Order | FleetOps Order | Medusa → Fleetbase (fulfillment) |
| Customer | Storefront Customer | Bidirectional |
| Inventory Level | Pallet Inventory | Fleetbase → Medusa |
| Region | CityOS Region | Fleetbase → Medusa |

**Task 9.1.4 — Scheduled Sync**
- Add Medusa sync to Laravel scheduler (similar to CMS sync)
- Configurable interval via `MEDUSA_SYNC_INTERVAL` env var
- Dependency-order sync: Regions → Stores → Sales Channels → Products → Inventory

### 9.2 Frontend UI

**Task 9.2.1 — Medusa Integration Dashboard (CityOS Engine)**
- **Location:** CityOS > Integrations > Medusa
- **Features:**
  - Connection status indicator
  - Sync controls: full sync, per-entity sync
  - Last sync timestamp per entity type
  - Sync log viewer
  - Configuration panel: API URL, API key, sync interval

### 9.3 Environment Variables

| Variable | Purpose | Type |
|----------|---------|------|
| `MEDUSA_API_URL` | Medusa backend URL | env |
| `MEDUSA_API_KEY` | Medusa API key | secret |
| `MEDUSA_PUBLISHABLE_KEY` | Medusa storefront key | env |
| `MEDUSA_SYNC_INTERVAL` | Sync frequency | env |
| `MEDUSA_WEBHOOK_SECRET` | Webhook signature verification | secret |

---

## 10. Gap 9: walt.id Decentralized Identity

**Priority:** P3 (Low)  
**Effort:** 4–6 weeks  
**Current State:** No integration exists anywhere in the codebase. This is a greenfield implementation.

### 10.1 Use Cases

1. **Driver Verifiable Credentials:** Issue digital driver licenses/certifications as W3C Verifiable Credentials
2. **Company DID:** Decentralized identifier for each Fleetbase company
3. **Compliance Attestation:** Machine-verifiable compliance records for CityOS governance
4. **Customer Identity Verification:** KYC via verifiable presentations

### 10.2 Backend Implementation

**Task 10.2.1 — Create WaltIdService**
- **File:** `api/vendor/fleetbase/cityos-api/src/Services/WaltIdService.php`
- **Config:**
  - `WALTID_API_URL` — walt.id API endpoint
  - `WALTID_API_KEY` — API key (secret)
- **Methods:**
  - `createDID($subject)` — create Decentralized Identifier for company/user
  - `issueCredential($subject, $credentialType, $claims)` — issue VC
  - `verifyCredential($presentation)` — verify a Verifiable Presentation
  - `revokeCredential($credentialId)` — revoke a VC
  - `listCredentials($subject)` — list credentials for a subject
  - `createPresentation($credentialIds)` — create VP for sharing

**Task 10.2.2 — Database Schema**

New migration:
```sql
CREATE TABLE verifiable_credentials (
    uuid UUID PRIMARY KEY,
    company_uuid UUID REFERENCES companies(uuid),
    subject_uuid UUID,
    subject_type VARCHAR(255),
    credential_id VARCHAR(255) UNIQUE,
    did VARCHAR(500),
    credential_type VARCHAR(255),
    credential_data JSONB,
    issued_at TIMESTAMP,
    expires_at TIMESTAMP,
    revoked_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active',
    meta JSONB,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE TABLE decentralized_identifiers (
    uuid UUID PRIMARY KEY,
    company_uuid UUID REFERENCES companies(uuid),
    subject_uuid UUID,
    subject_type VARCHAR(255),
    did VARCHAR(500) UNIQUE,
    did_document JSONB,
    method VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    meta JSONB,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

**Task 10.2.3 — Models**
- `VerifiableCredential` model with polymorphic `subject` (Driver, Company, User)
- `DecentralizedIdentifier` model with polymorphic `subject`

**Task 10.2.4 — Integration Points**
- Driver model: add `credentials()` relationship, `issueDriverCredential()` method
- Company model: add `did()` relationship, `createDID()` method
- CityOS GovernanceAuthority: issue compliance attestation credentials
- CityOS Tenant: verify tenant compliance via VPs

### 10.3 Frontend UI

- CityOS > Integrations > Digital Identity
- Driver detail: "Credentials" tab showing issued VCs
- Company settings: DID management
- Verification request panel

### 10.4 External Dependencies

| Dependency | Purpose |
|-----------|---------|
| walt.id Community Stack or Cloud | Credential issuance and verification |
| W3C DID standard | Identifier format |
| W3C VC standard | Credential format |

---

## 11. Gap 10: Temporal Workflow Engine Connection

**Priority:** P1 (High)  
**Effort:** 3–4 weeks  
**Current State:** Full gRPC client implementation exists (`TemporalService.php`, `CloudServiceClient.php`, `WorkflowServiceClient.php`, proto files). `WorkflowRegistryService.php` and `TemporalCliBridge.php` exist. Routes exist. Need: Temporal Cloud provisioning and connection configuration.

### 11.1 Infrastructure

**Task 11.1.1 — Temporal Cloud Account Setup**
- Create Temporal Cloud namespace (or self-hosted Temporal server)
- Generate API key / mTLS certificates
- Configure namespace retention policy

**Task 11.1.2 — Environment Configuration**

| Variable | Purpose | Type |
|----------|---------|------|
| `TEMPORAL_ADDRESS` | Temporal gRPC endpoint | env |
| `TEMPORAL_NAMESPACE` | Temporal namespace | env |
| `TEMPORAL_API_KEY` | Temporal Cloud API key | secret |
| `TEMPORAL_TLS_CERT` | mTLS certificate (if used) | secret |
| `TEMPORAL_TLS_KEY` | mTLS private key (if used) | secret |
| `TEMPORAL_TASK_QUEUE` | Default task queue name | env |

### 11.2 Backend Implementation

**Task 11.2.1 — Verify TemporalService Connection**
- Test `TemporalService::testConnection()` with real Temporal endpoint
- Verify gRPC proto compatibility with Temporal server version
- Test workflow listing, execution, and sync

**Task 11.2.2 — Define Core Workflows**

| Workflow | Trigger | Steps |
|----------|---------|-------|
| `OrderFulfillment` | Order dispatched | Assign driver → Track pickup → Track delivery → Complete → Settlement |
| `MaintenanceSchedule` | Maintenance completed | Calculate next due → Create scheduled maintenance → Send reminder |
| `InventoryReorder` | Stock below reorder point | Create PO → Notify supplier → Track delivery → Update inventory |
| `ComplianceCheck` | Periodic / tenant onboarding | Check governance policies → Verify credentials → Issue attestation |
| `CMSSync` | Periodic / webhook | Fetch CMS data → Transform → Upsert records → Log results |
| `ERPNextSettlement` | Order completed | Calculate settlement → Create ERPNext entry → Confirm |

**Task 11.2.3 — Workflow Workers**
- PHP Temporal SDK workers for each workflow (or Node.js/Go workers if PHP SDK limitations)
- Worker deployment configuration
- Task queue mapping per workflow type

### 11.3 Frontend UI

**Task 11.3.1 — Workflow Dashboard (CityOS Engine)**
- **Location:** CityOS > Integrations > Temporal
- **Features:**
  - Connection status (green/red indicator with latency)
  - Registered workflows list: type, execution count, status counts, last seen
  - Active executions: running workflow instances with progress
  - Workflow detail: execution history, input/output, retry policy
  - Manual workflow trigger (for admin operations)

---

## 12. Gap 11: Payload CMS Full Sync

**Priority:** P1 (High)  
**Effort:** 2–3 weeks  
**Current State:** `PayloadCMSService.php` exists with sync methods. Routes exist. Scheduler configured for 15-min sync. Known issue: CMS API key lacks read permissions.

### 12.1 Immediate Fixes

**Task 12.1.1 — CMS API Key Permissions**
- Update Payload CMS API key to grant read access to all required collections
- Collections needing access: countries, governance-authorities, scopes, categories, subcategories, tenants, stores, portals, nodes, policies, personas, persona-assignments, compliance-records

**Task 12.1.2 — Missing Collection Schemas**
- Verify/create missing CMS collections: scopes, categories, subcategories, stores, portals
- Ensure collection field schemas match expected mapping in `CmsMappingService.php`

### 12.2 Sync Enhancements

**Task 12.2.1 — Conflict Resolution**
- Current: create-or-update by CMS reference ID
- Add: last-modified timestamp comparison to avoid overwriting newer local changes
- Add: conflict log when CMS and local data diverge
- Add: manual conflict resolution UI

**Task 12.2.2 — Sync Monitoring**
- Use IntegrationLog for all sync operations (currently may not log granularly)
- Add per-collection sync status tracking: last sync time, records synced, errors
- Dashboard widget showing sync health

**Task 12.2.3 — Webhook Reliability**
- Verify webhook endpoint `POST /api/webhooks/cityos/cms` handles all 13 collections
- Add webhook signature verification (if Payload CMS supports it)
- Add webhook delivery retry logic (dead-letter queue for failed webhooks)

### 12.3 Frontend UI

- CityOS > Integrations > CMS dashboard already partially exists
- Enhance with: per-collection sync status, manual sync triggers, conflict viewer, sync log

---

## 13. Gap 12: ERPNext Financial Integration

**Priority:** P2 (Medium)  
**Effort:** 3–4 weeks  
**Current State:** `ERPNextService.php` exists. Routes exist for status and settlement. Tenant has `erpnext_company` field. Requires external ERPNext instance.

### 13.1 Infrastructure

**Task 13.1.1 — ERPNext Instance**
- Deploy ERPNext instance (cloud or self-hosted)
- Configure API keys and user permissions

**Task 13.1.2 — Environment Configuration**

| Variable | Purpose | Type |
|----------|---------|------|
| `ERPNEXT_URL` | ERPNext API endpoint | env |
| `ERPNEXT_API_KEY` | ERPNext API key | secret |
| `ERPNEXT_API_SECRET` | ERPNext API secret | secret |

### 13.2 Backend Implementation

**Task 13.2.1 — ERPNext Data Mapping**

| ERPNext DocType | Fleetbase Model | Sync Direction |
|-----------------|-----------------|----------------|
| Company | CityOS Tenant | Fleetbase → ERPNext |
| Customer | Storefront Customer / FleetOps Contact | Bidirectional |
| Supplier | Pallet Supplier / FleetOps Vendor | Bidirectional |
| Sales Invoice | Transaction (from completed orders) | Fleetbase → ERPNext |
| Purchase Invoice | Pallet PurchaseOrder (completed) | Fleetbase → ERPNext |
| Journal Entry | COD collection, penalties, payouts | Fleetbase → ERPNext |
| Item | Storefront Product / Pallet Product | Bidirectional |
| Stock Entry | Pallet StockTransaction | Fleetbase → ERPNext |
| Employee | Driver (for payroll) | Fleetbase → ERPNext |

**Task 13.2.2 — Settlement Workflow**
When an order is completed:
1. Calculate driver payout (base + tips - penalties)
2. Calculate platform commission
3. Calculate COD collection amount
4. Create ERPNext Sales Invoice for the order
5. Create ERPNext Journal Entry for driver payout
6. Create ERPNext Journal Entry for COD reconciliation
7. Log via IntegrationLog

**Task 13.2.3 — Scheduled Financial Sync**
- Daily settlement batch: aggregate completed orders → create ERPNext entries
- Monthly reconciliation: verify ERPNext balances match Fleetbase transactions
- Add to Laravel scheduler

### 13.3 Frontend UI

- CityOS > Integrations > ERPNext
- Connection status, last sync, error log
- Settlement dashboard: pending settlements, completed, failed
- Manual settlement trigger for specific orders/date ranges

---

## 14. Gap 13: Twilio Production SMS

**Priority:** P0 (Critical — blocks driver onboarding)  
**Effort:** 1 week  
**Current State:** Trial account configured. Cannot send SMS to Saudi Arabia (+966). Bypass code (999000) available for testing.

### 14.1 Implementation Steps

**Task 14.1.1 — Upgrade Twilio Account**
- Upgrade from trial to paid account
- Verify sending to Saudi Arabia (+966) is enabled
- Consider adding Saudi Arabia A2P 10DLC registration if required for high volume

**Task 14.1.2 — Phone Number Selection**
- Current FROM number: +14244966966 (US number)
- For Saudi Arabia delivery: consider purchasing a Saudi local number or Alphanumeric Sender ID
- Alphanumeric sender IDs (e.g., "Fleetbase") have better delivery rates in Saudi Arabia

**Task 14.1.3 — SMS Template Compliance**
- Ensure verification SMS content meets Saudi CITC regulations
- Template: "Your Fleetbase verification code is: {code}. Valid for 10 minutes."
- No marketing content in verification SMS

**Task 14.1.4 — Fallback Provider**
- Current: SmsService routes +976 (Mongolia) to CallPro
- Consider adding a Saudi-local SMS provider as fallback for +966 numbers
- Update SmsService provider routing if needed

**Task 14.1.5 — Remove Bypass Code for Production**
- The bypass code (999000) should only work in non-production environments
- Add environment check: `if (app()->environment('production') && $code === $bypass) return false;`

### 14.2 Testing

- Send test SMS to Saudi Arabia number after upgrade
- Verify delivery receipt
- Test rate limiting (prevent SMS bombing)
- Test verification flow end-to-end: request code → receive SMS → verify code → auth token

---

## 15. Gap 14: Architectural Hardening

**Priority:** P2 (Medium)  
**Effort:** 6–8 weeks  

### 15.1 Spatial/PostGIS Stability

**Task 15.1.1 — Fork and Rename Spatial Package**
- Current: `fleetbase/laravel-mysql-spatial` with PostgreSQL patches in vendor
- Problem: Vendor patches are fragile and may be overwritten by composer update
- Solution:
  1. Fork package as `fleetbase/laravel-spatial` (drop "mysql" from name)
  2. Add proper database driver detection in all spatial methods
  3. Add PostGIS-specific test suite
  4. Publish as composer package
  5. Update `composer.json` to use new package

**Task 15.1.2 — Database Connection Naming**
- Rename connection from `mysql` to `pgsql` or `database` in config
- Update all references across all engine packages
- This prevents confusion and catches any MySQL-specific code paths

### 15.2 Observer Consolidation

**Task 15.2.1 — Observer Audit**
- Document all observer side effects in a single reference
- Identify redundant observers (e.g., multiple CompanyObservers across engines)
- Consolidate where possible

**Task 15.2.2 — Observer Performance**
- Add database query counting in observers to identify N+1 issues
- Cache `Schema::hasColumn()` calls (some already cached, ensure consistency)
- Consider replacing some observers with database triggers for performance-critical paths

### 15.3 Cascade Deletion Consistency

**Task 15.3.1 — Audit Cascade Patterns**
- Map all cascade deletions (observer-based vs. database FK constraints)
- Identify orphan risk: models that use SoftDeletes where related models do not
- Standardize: use database-level CASCADE for simple relations, observers only for complex business logic

**Task 15.3.2 — Implement Missing Cascades**
- Add cascading soft deletes where parent uses SoftDeletes but children don't
- Add orphan detection query for maintenance/cleanup

### 15.4 Event Bridge Performance

**Task 15.4.1 — Selective Event Logging**
- Current: OutboxLoggingObserver logs ALL model changes when enabled
- Add configuration for which models to log (whitelist approach)
- Add event batching for high-volume operations (imports, bulk updates)

**Task 15.4.2 — Event Archival**
- Published events older than N days → archive to cold storage
- Configurable retention policy
- Purge command for old events

### 15.5 UUID Generation

**Task 15.5.1 — Database-Level UUID Defaults**
- Add `DEFAULT gen_random_uuid()` to UUID columns in new migrations
- Prevents null UUID issues if model boot fails
- Keep model-level generation as primary, database as fallback

---

## 16. Timeline & Dependency Map

### Phase 1: Critical Path (Weeks 1–4)

| Week | Gap | Task | Dependencies |
|------|-----|------|-------------|
| 1 | Gap 13 | Twilio production upgrade + SMS testing | None |
| 1–2 | Gap 4 | OutboxEvent admin dashboard | None |
| 1–2 | Gap 5 | IntegrationLog admin dashboard | None |
| 2–3 | Gap 11 | CMS API key fix + sync verification | CMS instance access |
| 3–4 | Gap 10 | Temporal Cloud provisioning + connection test | Cloud account |

### Phase 2: Core UI (Weeks 3–10)

| Week | Gap | Task | Dependencies |
|------|-----|------|-------------|
| 3–6 | Gap 1 | Fleet Maintenance full UI | None |
| 5–8 | Gap 2 | IoT/Telematics UI + provider framework | None |
| 7–10 | Gap 3 | Report Builder frontend | None |

### Phase 3: Integrations (Weeks 6–14)

| Week | Gap | Task | Dependencies |
|------|-----|------|-------------|
| 6–10 | Gap 8 | Medusa e-commerce integration | Medusa instance |
| 8–12 | Gap 12 | ERPNext financial integration | ERPNext instance |
| 10–14 | Gap 10 | Temporal workflow definitions + workers | Phase 1 Temporal connection |

### Phase 4: Enhancement (Weeks 10–16)

| Week | Gap | Task | Dependencies |
|------|-----|------|-------------|
| 10–12 | Gap 7 | Reviews/Votes UI completion | None |
| 10–12 | Gap 6 | LoginAttempt security audit | None |
| 12–16 | Gap 14 | Architectural hardening | All other work stable |
| 14–18 | Gap 9 | walt.id decentralized identity | walt.id instance |

### Dependency Graph

```
Gap 13 (Twilio) ─────────── standalone, do first
     │
Gap 4 (Outbox UI) ────────── standalone
Gap 5 (IntLog UI) ────────── standalone
     │
Gap 11 (CMS Fix) ─────────── requires CMS access
     │
Gap 10 (Temporal) ─────────── requires Cloud account
     │                            │
     │                    Gap 10b (Workflow defs)
     │                            │
Gap 1 (Maintenance UI) ──── standalone
Gap 2 (IoT/Telematics) ──── standalone
Gap 3 (Report Builder) ──── standalone
     │
Gap 8 (Medusa) ───────────── requires Medusa instance
     │
Gap 12 (ERPNext) ─────────── requires ERPNext instance
     │                            │
     │              uses Temporal workflows (if available)
     │
Gap 7 (Reviews UI) ──────── standalone
Gap 6 (LoginAttempt) ─────── standalone
     │
Gap 14 (Architecture) ────── do after all features stable
     │
Gap 9 (walt.id) ──────────── requires walt.id instance, lowest priority
```

### Resource Estimates

| Role | Gaps | Weeks |
|------|------|-------|
| Backend PHP Developer | 1, 2, 4, 5, 6, 8, 9, 10, 12, 14 | 16–20 |
| Frontend Ember.js Developer | 1, 2, 3, 4, 5, 6, 7, 8 | 12–16 |
| DevOps / Infrastructure | 10, 11, 13 | 2–3 |
| Integration Specialist | 8, 9, 12 | 8–12 |

**With 2 developers working in parallel:** ~16–20 weeks total  
**With 4 developers (2 backend + 2 frontend):** ~10–12 weeks total

---

*End of Implementation Plan*
