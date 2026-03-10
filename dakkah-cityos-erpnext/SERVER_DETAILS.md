# Dakkah CityOS ERP — Server Details & Integration Reference

## Table of Contents
1. [Server Architecture](#server-architecture)
2. [Authentication](#authentication)
3. [Frappe REST API Reference](#frappe-rest-api-reference)
4. [CityOS Custom API Endpoints](#cityos-custom-api-endpoints)
5. [Webhook Endpoints](#webhook-endpoints)
6. [CityOS DocType Schema Reference](#cityos-doctype-schema-reference)
7. [NodeContext Fields on Core ERPNext DocTypes](#nodecontext-fields-on-core-erpnext-doctypes)
8. [Event-Driven Architecture (Outbox Pattern)](#event-driven-architecture-outbox-pattern)
9. [Scheduled Tasks](#scheduled-tasks)
10. [Integration Configuration](#integration-configuration)
11. [Roles & Permissions](#roles--permissions)
12. [Temporal Workflow Integration](#temporal-workflow-integration)

---

## Server Architecture

### Public URL
```
https://ff049349-609e-450d-ab42-e289d89960bb-00-ujg6lz7mnzcy.pike.replit.dev
```

### Internal Port Layout

| Service        | Port  | Bind Address | Purpose                          |
|----------------|-------|-------------|----------------------------------|
| Reverse Proxy  | 5000  | 0.0.0.0     | Public entry point (Node.js)     |
| Gunicorn       | 8000  | 127.0.0.1   | Frappe/ERPNext application       |
| Socket.IO      | 9000  | 127.0.0.1   | Real-time WebSocket server       |
| Redis Cache    | 11000 | 127.0.0.1   | Caching                         |
| Redis Queue    | 13000 | 127.0.0.1   | Message queue / Socket.IO pub-sub |

### Proxy Routing Rules (proxy.js on port 5000)
- `/socket.io/*` → Socket.IO server (port 9000)
- All other requests → Gunicorn (port 8000)
- WebSocket upgrades are handled for both targets

### Stack
- **Framework:** Frappe v15.99.0
- **Application:** ERPNext v17.0.0-dev
- **Custom App:** CityOS v0.1.0
- **Runtime:** Python 3.12
- **Database:** PostgreSQL (Neon-backed)
- **Cache/Queue:** Redis

---

## Authentication

### Method 1: Session Cookie (Recommended for browsers)
```bash
# Login
POST /api/method/login
Content-Type: application/x-www-form-urlencoded

usr=Administrator&pwd=admin

# Response sets session cookies (sid, system_user, user_id, etc.)
# Use cookies for subsequent requests
```

### Method 2: Token Authentication (Recommended for API integrations)
```bash
# Header format
Authorization: token <api_key>:<api_secret>

# Generate API keys via:
# 1. Frappe desk: User > API Access > Generate Keys
# 2. API call (as Administrator):
POST /api/resource/User
{
  "name": "api-user@example.com",
  "api_key": "auto-generated",
  "api_secret": "auto-generated"
}
```

### Method 3: Basic Authentication
```bash
Authorization: Basic base64(username:password)
```

### Default Credentials
- **Username:** `Administrator`
- **Password:** `admin`

### CORS & CSRF
- CORS: Enabled for all origins (`allow_cors: "*"`)
- CSRF: Disabled (`ignore_csrf: 1`)
- All hosts trusted for Replit proxy compatibility

---

## Frappe REST API Reference

### Base URL
```
https://ff049349-609e-450d-ab42-e289d89960bb-00-ujg6lz7mnzcy.pike.replit.dev
```

### CRUD Operations (Resource API)

#### List Records
```
GET /api/resource/{DocType}
  ?fields=["name","field1","field2"]
  &filters=[["field","operator","value"]]
  &order_by=modified desc
  &limit_start=0
  &limit_page_length=20
```

**Filter Operators:** `=`, `!=`, `>`, `<`, `>=`, `<=`, `like`, `not like`, `in`, `not in`, `is`, `between`

#### Get Single Record
```
GET /api/resource/{DocType}/{name}
```

#### Create Record
```
POST /api/resource/{DocType}
Content-Type: application/json

{
  "field1": "value1",
  "field2": "value2"
}
```

#### Update Record
```
PUT /api/resource/{DocType}/{name}
Content-Type: application/json

{
  "field_to_update": "new_value"
}
```

#### Delete Record
```
DELETE /api/resource/{DocType}/{name}
```

### RPC Methods (Method API)
```
GET/POST /api/method/{dotted.path.to.method}
```

### Bulk Operations
```
POST /api/method/frappe.client.get_list
Content-Type: application/json
{
  "doctype": "Node Context",
  "fields": ["name", "tenant", "country"],
  "filters": {"tenant_tier": "CITY"},
  "limit_page_length": 0
}
```

### Count Records
```
GET /api/method/frappe.client.get_count
  ?doctype={DocType}
  &filters=[["status","=","Active"]]
```

### Response Format
```json
{
  "data": { ... }        // For single record GET
  "message": [ ... ]     // For method calls & lists
}
```

### Error Format
```json
{
  "exc_type": "ValidationError",
  "exception": "...",
  "_server_messages": "[{\"message\": \"...\"}]"
}
```

### HTTP Status Codes
| Code | Meaning |
|------|---------|
| 200  | Success |
| 201  | Created |
| 403  | Permission denied / Not logged in |
| 404  | Not found |
| 409  | Duplicate entry |
| 417  | Validation error |
| 500  | Server error |

---

## CityOS Custom API Endpoints

### Integration Status
```
GET /api/method/cityos.integrations.webhooks.get_integration_status

# Response:
{
  "message": {
    "medusa": { "configured": true, "url": "..." },
    "payload_cms": { "configured": true, "url": "..." },
    "outbox": {
      "Pending": 0, "Processing": 0, "Published": 0,
      "Failed": 0, "Dead Letter": 0
    },
    "hierarchy": {
      "scopes": 0, "categories": 0, "subcategories": 0,
      "stores": 0, "portals": 0
    }
  }
}
```
**Auth:** Requires login (session/token)

### Test CMS Connection
```
GET /api/method/cityos.integrations.cms_client.test_cms_connection
```

### Fetch CMS Hierarchy
```
GET /api/method/cityos.integrations.cms_client.fetch_cms_hierarchy
```

### Fetch CMS Workflows
```
GET /api/method/cityos.integrations.cms_client.fetch_cms_workflows
```

### Test Temporal Connection
```
GET /api/method/cityos.integrations.temporal_sync.test_temporal_connection
```

---

## Webhook Endpoints

All webhook endpoints accept `POST` requests with JSON body. They are `allow_guest=True` (no session auth required) but validate via HMAC-SHA256 signatures.

**Note on Signature Validation:** If the corresponding webhook secret is not configured (empty string), signature validation is skipped. When a secret is set, the signature header is required.

### Medusa Commerce Webhook
```
POST /api/method/cityos.integrations.webhooks.medusa_webhook

Headers:
  Content-Type: application/json
  x-medusa-signature: <HMAC-SHA256 hex digest>  (required when medusa_webhook_secret is set)

Signature Computation:
  HMAC-SHA256(
    key = medusa_webhook_secret (UTF-8),
    message = raw request body
  ).hexdigest()
```

**Expected Payload Format:**
```json
{
  "event": "order.placed",
  "data": { ... }
}
```

**Handled Events (verified from code):**
| Event Type | Handler | Description |
|------------|---------|-------------|
| `order.placed` | `_handle_order_placed` | Creates Sales Invoice from Medusa order |
| `order.completed` | `_handle_order_completed` | Updates order completion status |
| `order.updated` | `_handle_order_updated` | Updates existing order records |
| `order.cancelled` | `_handle_order_cancelled` | Handles order cancellation |
| `product.created` | `_handle_product_created` | Creates Item in ERPNext |
| `product.updated` | `_handle_product_updated` | Updates existing Item |
| `product.deleted` | `_handle_product_deleted` | Handles product deletion |
| `customer.created` | `_handle_customer_created` | Creates Customer in ERPNext |
| `payment.captured` | `_handle_payment_captured` | Creates Payment Entry |
| `payment.refunded` | `_handle_payment_refunded` | Handles payment refund |
| `vendor.created` | `_handle_vendor_created` | Creates Supplier in ERPNext |
| `tenant.created` | `_handle_tenant_created` | Creates Node Context for tenant |
| `tenant.updated` | `_handle_tenant_updated` | Updates Node Context |
| `store.created` | `_handle_store_created` | Creates CityOS Store |
| `store.updated` | `_handle_store_updated` | Updates CityOS Store |
| `store.deleted` | `_handle_store_deleted` | Disables CityOS Store (soft delete) |

### Payload CMS Webhook
```
POST /api/method/cityos.integrations.webhooks.payload_webhook

Headers:
  Content-Type: application/json
  x-payload-signature: <HMAC-SHA256 hex digest>  (required when payload_webhook_secret is set)

Signature Computation:
  HMAC-SHA256(
    key = payload_webhook_secret (UTF-8),
    message = raw request body
  ).hexdigest()
```

**Expected Payload Format:**
```json
{
  "collection": "tenants",
  "operation": "create",
  "doc": { ... }
}
```

**Handled Collections (verified from code):**
| Collection | Operations | Description |
|------------|-----------|-------------|
| `tenants` | create/update/delete | Syncs Node Context records |
| `stores` | create/update/delete | Syncs CityOS Store records |
| `categories` | create/update/delete | Syncs CityOS Category records |
| `scopes` | create/update/delete | Syncs CityOS Scope records |
| `subcategories` | create/update/delete | Syncs CityOS Subcategory records |
| `portals` | create/update/delete | Syncs CityOS Portal records |
| `governance-authorities` | create/update | Syncs Governance Authority records |
| `policies` | create/update | Syncs Policy Doctrine records |
| `personas` | create/update | Syncs CityOS Persona records |
| `persona-assignments` | create/update | Syncs CityOS Persona Assignment records |
| `countries` | create/update | Validates Country exists in ERPNext |
| `compliance-records` | create | Creates CityOS Audit Log entry |
| `nodes` | create/update | Routes to scope/category/subcategory/store/portal handlers based on `nodeType` field |

### Temporal Workflow Webhook
```
POST /api/method/cityos.integrations.webhooks.temporal_webhook

Headers:
  Content-Type: application/json
  x-temporal-signature: <HMAC-SHA256 hex digest>  (required when temporal_webhook_secret is set)

Signature Computation:
  HMAC-SHA256(
    key = temporal_webhook_secret (UTF-8),
    message = raw request body
  ).hexdigest()
```

**Expected Payload Format:**
```json
{
  "workflow_id": "wf_abc123",
  "workflow_type": "approval_chain",
  "status": "completed",
  "result": {
    "doctype": "Purchase Order",
    "name": "PO-001",
    "approved": true,
    "approved_by": "admin@dakkah.io"
  }
}
```

**Handled Workflow Types (verified from code):**
| Workflow Type | Handler | Description |
|---------------|---------|-------------|
| `approval_chain` | `_handle_approval_result` | General document approval/rejection workflow |
| `procurement_approval` | `_handle_procurement_approval` | Procurement-specific approval workflow |
| `invoice_settlement` | `_handle_invoice_settlement` | Invoice settlement/reconciliation workflow |
| `vendor_onboarding` | `_handle_vendor_onboarding` | Vendor onboarding process workflow |
| `budget_approval` | `_handle_budget_approval` | Budget approval workflow |

Unrecognized `workflow_type` values are logged to the CityOS Audit Log without specific handling.

---

## CityOS DocType Schema Reference

### Governance Module

#### Node Context
The central multi-tenant context record. All CityOS-aware documents link to a Node Context.

| Field | Type | Description |
|-------|------|-------------|
| `context_name` | Data | **Required.** Unique identifier |
| `enabled` | Check | Active flag (default: 1) |
| `tenant_tier` | Select | MASTER / GLOBAL / REGIONAL / COUNTRY / CITY |
| **Tenant Hierarchy & Governance** | | |
| `parent_context` | Link → Node Context | Hierarchical parent |
| `parent_tenant` | Link → Node Context | Tenant parent |
| `governance_authority` | Link → Governance Authority | Governing body |
| `residency_zone` | Select | GCC / EU / MENA / APAC / AMERICAS / GLOBAL |
| `default_persona` | Link → CityOS Persona | Default persona |
| `status` | Select | Active / Suspended / Pending / Archived |
| `domain` | Data | Domain URL |
| `slug` | Data | Unique slug |
| `default_locale` | Data | Default: `en-SA` |
| `supported_locales` | Small Text | Comma-separated locales |
| `timezone` | Data | Default: `Asia/Riyadh` |
| `default_currency` | Link → Currency | |
| **CityOS Hierarchy** | | |
| `country` | Link → Country | **Required** |
| `scope` | Link → CityOS Scope | |
| `category` | Link → CityOS Category | |
| `subcategory` | Link → CityOS Subcategory | |
| **Business Hierarchy** | | |
| `tenant` | Data | **Required.** Tenant identifier |
| `store` | Link → CityOS Store | |
| `portal` | Link → CityOS Portal | |
| `organization_unit` | Data | |
| **ERPNext Links** | | |
| `cost_center` | Link → Cost Center | |
| `project` | Link → Project | |
| `city_or_theme` | Data | |
| `sector` | Data | |
| **Channel & Surface** | | |
| `channel` | Data | |
| `surface` | Data | |
| `persona` | Link → CityOS Persona | |
| `brand` | Data | |
| **Locale & Versioning** | | |
| `locale` | Data | Default: `en-SA` |
| `theme` | Data | |
| `version` | Data | Default: `1.0` |
| `description` | Small Text | |

**Naming Rule:** `field:context_name` (auto-name from context_name field)

#### CityOS Scope
| Field | Type | Description |
|-------|------|-------------|
| `scope_name` | Data | **Required** |
| `enabled` | Check | Active flag |
| `country` | Link → Country | **Required** |
| `scope_code` | Data | Short code |
| `description` | Small Text | |
| `medusa_scope_id` | Data | Cross-reference to Medusa |
| `payload_scope_id` | Data | Cross-reference to Payload CMS |

#### CityOS Category
| Field | Type | Description |
|-------|------|-------------|
| `category_name` | Data | **Required** |
| `enabled` | Check | Active flag |
| `scope` | Link → CityOS Scope | **Required** |
| `category_code` | Data | Short code |
| `sort_order` | Int | Display order |
| `icon` | Data | Icon identifier |
| `medusa_category_id` | Data | Cross-reference to Medusa |
| `payload_category_id` | Data | Cross-reference to Payload CMS |

#### CityOS Subcategory
| Field | Type | Description |
|-------|------|-------------|
| `subcategory_name` | Data | **Required** |
| `enabled` | Check | Active flag |
| `category` | Link → CityOS Category | **Required** |
| `subcategory_code` | Data | Short code |
| `sort_order` | Int | Display order |
| `medusa_subcategory_id` | Data | Cross-reference to Medusa |
| `payload_subcategory_id` | Data | Cross-reference to Payload CMS |

#### CityOS Store
| Field | Type | Description |
|-------|------|-------------|
| `store_name` | Data | **Required** |
| `store_handle` | Data | URL handle |
| `enabled` | Check | Active flag |
| `status` | Select | Active / Suspended / Archived |
| `tenant` | Link | **Required** |
| `scope` | Link → CityOS Scope | |
| `category` | Link → CityOS Category | |
| `storefront_type` | Select | Storefront type |
| `sales_channel` | Data | |
| `medusa_store_id` | Data | Cross-reference to Medusa |
| `medusa_sales_channel_id` | Data | |
| `medusa_vendor_id` | Data | |
| `payload_store_id` | Data | Cross-reference to Payload CMS |
| `publishable_api_key` | Data | |
| `domain` | Data | |
| `logo_url` | Data | |
| `theme_config` | JSON | |

#### CityOS Portal
| Field | Type | Description |
|-------|------|-------------|
| `portal_name` | Data | **Required** |
| `portal_handle` | Data | URL handle |
| `enabled` | Check | Active flag |
| `portal_type` | Select | Portal type |
| `store` | Link → CityOS Store | |
| `tenant` | Link | |
| `scope` | Link → CityOS Scope | |
| `domain` | Data | |
| `default_locale` | Data | |
| `theme` | Data | |
| `medusa_portal_id` | Data | Cross-reference to Medusa |
| `payload_portal_id` | Data | Cross-reference to Payload CMS |

#### Governance Authority
| Field | Type | Description |
|-------|------|-------------|
| `authority_name` | Data | **Required** |
| `authority_type` | Select | Type classification |
| `jurisdiction_level` | Select | Level of jurisdiction |
| `parent_authority` | Link → Governance Authority | |
| `jurisdiction_countries` | Small Text | |
| `residency_zone` | Select | GCC / EU / MENA / APAC / AMERICAS / GLOBAL |
| `status` | Select | Active / Suspended / Archived |
| `contact_name` | Data | |
| `contact_email` | Data | |
| `website` | Data | |
| `cms_ref_id` | Data | Payload CMS reference |

**Sync:** Auto-synced to Payload CMS on create/update.

#### Policy Doctrine
| Field | Type | Description |
|-------|------|-------------|
| `policy_name` | Data | **Required** |
| `policy_code` | Data | Unique code |
| `policy_type` | Select | Classification |
| `scope_level` | Select | Scope level |
| `enforcement_level` | Select | How strictly enforced |
| `inheritance_mode` | Select | How policies inherit down the hierarchy |
| `governance_authority` | Link → Governance Authority | |
| `status` | Select | Active / Suspended / Archived |
| `effective_date` | Date | |
| `expiry_date` | Date | |
| `review_frequency` | Select | |
| `last_reviewed` | Date | |
| `policy_rules` | Code (JSON) | Structured policy rules |
| `cms_ref_id` | Data | Payload CMS reference |

**Sync:** Auto-synced to Payload CMS on create/update.

#### CityOS Persona
| Field | Type | Description |
|-------|------|-------------|
| `persona_name` | Data | **Required** |
| `persona_code` | Data | Short code |
| `persona_type` | Select | Classification |
| `status` | Select | Active / Suspended / Archived |
| `default_locale` | Data | |
| `default_currency` | Link → Currency | |
| `default_timezone` | Data | |
| `permissions_json` | Code (JSON) | Permission configuration |
| `cms_ref_id` | Data | Payload CMS reference |

**Sync:** Auto-synced to Payload CMS on create/update.

#### CityOS Persona Assignment
| Field | Type | Description |
|-------|------|-------------|
| Links a CityOS Persona to a User and Node Context |

#### CityOS Audit Log
Immutable audit trail for all CityOS-aware document events.

| Field | Type | Description |
|-------|------|-------------|
| `document_type` | Data | DocType name |
| `document_name` | Data | Record name |
| `action` | Select | Created / Updated / Submitted / Cancelled / Deleted |
| `user` | Link → User | Who performed the action |
| `timestamp` | Datetime | When |
| `tenant` | Data | CityOS Tenant |
| `country` | Data | |
| `city` | Data | |
| `correlation_id` | Data | Request correlation ID |
| `details` | Long Text | JSON snapshot of changes |

#### Integration Outbox Event
Transactional outbox for reliable event publishing.

| Field | Type | Description |
|-------|------|-------------|
| `event_type` | Data | e.g., `ERP_INVOICE_SUBMITTED` |
| `status` | Select | Pending / Processing / Published / Failed / Dead Letter |
| `target_system` | Select | Medusa Commerce / Payload CMS / Temporal |
| `priority` | Select | Low / Normal / High / Critical |
| `source_doctype` | Data | Source document type |
| `source_name` | Data | Source document name |
| `correlation_id` | Data | Request tracing ID |
| `idempotency_key` | Data | Deduplication key |
| `tenant` | Data | |
| `country` | Data | |
| `city` | Data | |
| `sector` | Data | |
| `event_payload` | JSON | Full event data |
| `retry_count` | Int | Number of attempts |
| `max_retries` | Int | Maximum retries (default: 5) |
| `last_attempt` | Datetime | |
| `next_retry_at` | Datetime | Exponential backoff |
| `error_message` | Long Text | Last error details |

---

### Finance Module

#### Budget Program
| Field | Type | Description |
|-------|------|-------------|
| `program_name` | Data | **Required** |
| `status` | Select | **Required.** Draft / Active / Closed / Frozen |
| `budget_type` | Select | Operating / Capital / Special |
| `fiscal_year` | Link → Fiscal Year | |
| `department` | Link → Department | |
| `total_budget` | Currency | |
| `allocated_amount` | Currency | |
| `spent_amount` | Currency | |
| `remaining_amount` | Currency | |
| `approval_status` | Select | Pending / Approved / Rejected |
| `approved_by` | Link → User | |
| `approved_date` | Date | |
| + Standard CityOS context fields | | |

#### Funding Source
| Field | Type | Description |
|-------|------|-------------|
| `source_name` | Data | **Required** |
| `source_type` | Select | Government / Grant / Loan / Revenue / Donation |
| `status` | Select | **Required** |
| `annual_amount` | Currency | |
| `utilized_amount` | Currency | |
| `available_amount` | Currency | |
| + Standard CityOS context fields | | |

#### Fiscal Allocation
| Field | Type | Description |
|-------|------|-------------|
| `allocation_name` | Data | |
| `budget_program` | Link → Budget Program | |
| `fiscal_year` | Link → Fiscal Year | |
| `department` | Link → Department | |
| `project` | Link → Project | |
| `cost_center` | Link → Cost Center | |
| `allocated_amount` | Currency | |
| `spent_amount` | Currency | |
| + Standard CityOS context fields | | |

#### Municipal Invoice
| Field | Type | Description |
|-------|------|-------------|
| `invoice_number` | Data | **Required** |
| `invoice_type` | Select | Citizen Service / Vendor Payment / Government Fee / Tax Assessment / Utility Bill / Grant Disbursement |
| `status` | Select | **Required.** Draft / Pending Approval / Approved / Paid / Overdue / Cancelled |
| `linked_sales_invoice` | Link → Sales Invoice | |
| `linked_purchase_invoice` | Link → Purchase Invoice | |
| `party_type` | Select | Citizen / Vendor / Government Entity / Department |
| `party_name` | Data | |
| `due_date` | Date | |
| `grand_total` | Currency | |
| `outstanding_amount` | Currency | |
| `budget_program` | Link → Budget Program | |
| `funding_source` | Link → Funding Source | |
| + Standard CityOS context fields | | |

---

### Procurement Module

#### Vendor Compliance Profile
| Field | Type | Description |
|-------|------|-------------|
| `supplier` | Link → Supplier | **Required** |
| `compliance_status` | Select | Compliant / Non-Compliant / Under Review / Blacklisted |
| `overall_risk_rating` | Select | Low / Medium / High / Critical |
| `license fields` | Various | Trade license, insurance, tax registration |
| `performance fields` | Various | Quality/delivery/cost ratings |
| + Standard CityOS context fields | | |

#### Contract Register
| Field | Type | Description |
|-------|------|-------------|
| `contract_title` | Data | **Required** |
| `contract_number` | Data | **Required** |
| `supplier` | Link → Supplier | |
| `contract_type` | Select | Service / Supply / Construction / Consulting / Lease |
| `status` | Select | Draft / Active / Expired / Terminated / Under Review |
| `contract_value` | Currency | |
| `start_date` / `end_date` | Date | |
| `budget_program` | Link → Budget Program | |
| `payment_terms` | Select | |
| + Standard CityOS context fields | | |

#### CityOS Procurement Request
| Field | Type | Description |
|-------|------|-------------|
| `request_title` | Data | **Required** |
| `department` | Link → Department | **Required** |
| `requested_by` | Link → Employee | |
| `urgency` | Select | Low / Normal / High / Emergency |
| `procurement_method` | Select | Direct Purchase / Competitive Bid / RFQ / Framework Agreement |
| `estimated_value` | Currency | |
| `budget_program` | Link → Budget Program | |
| + Standard CityOS context fields | | |

---

### Assets Management Module

#### Municipal Asset
| Field | Type | Description |
|-------|------|-------------|
| `asset_name` | Data | **Required** |
| `asset_code` | Data | **Required** |
| `asset_type` | Select | Infrastructure / Vehicle / Equipment / Building / Land / Technology / Utility |
| `linked_asset` | Link → Asset | Links to ERPNext Asset |
| `status` | Select | Active / Under Maintenance / Retired / Disposed / Lost |
| `gps_latitude` / `gps_longitude` | Float | Geographic coordinates |
| `acquisition_date` | Date | |
| `acquisition_cost` | Currency | |
| `current_value` | Currency | |
| `condition` | Select | Excellent / Good / Fair / Poor / Decommissioned |
| + Standard CityOS context fields | | |

#### Municipal Facility
| Field | Type | Description |
|-------|------|-------------|
| `facility_name` | Data | **Required** |
| `facility_type` | Select | Office / School / Hospital / Park / Library / Sports / Cultural / Infrastructure |
| `capacity` | Int | |
| `operating_hours` | Data | |
| + Standard CityOS context fields | | |

#### Maintenance Plan
| Field | Type | Description |
|-------|------|-------------|
| `plan_name` | Data | **Required** |
| `linked_asset` | Link → Municipal Asset | |
| `linked_facility` | Link → Municipal Facility | |
| `maintenance_type` | Select | Preventive / Corrective / Predictive |
| `frequency` | Select | Daily / Weekly / Monthly / Quarterly / Annually |
| + Standard CityOS context fields | | |

---

### HR Management Module

#### Position Control
| Field | Type | Description |
|-------|------|-------------|
| `position_title` | Data | **Required** |
| `position_number` | Data | **Required** |
| `department` | Link → Department | **Required** |
| `designation` | Link → Designation | |
| `grade` | Data | Pay grade |
| `min_salary` / `max_salary` | Currency | Salary range |
| `incumbent` | Link → Employee | Current holder |
| `reports_to` | Link → Position Control | Reporting hierarchy |
| `budget_program` | Link → Budget Program | |
| `security_clearance` | Select | None / Basic / Enhanced / Top Secret |
| + Standard CityOS context fields | | |

#### Staff Assignment
| Field | Type | Description |
|-------|------|-------------|
| `assignment_title` | Data | **Required** |
| `employee` | Link → Employee | **Required** |
| `from_position` | Link → Position Control | |
| `to_department` | Link → Department | |
| `to_project` | Link → Project | |
| `assignment_type` | Select | Temporary / Detail / Acting / Special Project / Emergency |
| `start_date` | Date | **Required** |
| `end_date` | Date | |
| `status` | Select | Proposed / Active / Completed / Cancelled |
| + Standard CityOS context fields | | |

---

### Projects Module

#### Capital Project
| Field | Type | Description |
|-------|------|-------------|
| `project_name` | Data | **Required** |
| `project_code` | Data | **Required** |
| `linked_project` | Link → Project | Links to ERPNext Project |
| `department` | Link → Department | |
| `project_manager` | Link → Employee | |
| `total_budget` | Currency | |
| `spent_amount` | Currency | |
| `phase` | Select | Planning / Design / Procurement / Construction / Commissioning / Completed |
| `priority` | Select | Low / Normal / High / Critical |
| `gps_latitude` / `gps_longitude` | Float | Geographic coordinates |
| `environmental_assessment` | Select | Not Required / Pending / Approved / Rejected |
| + Standard CityOS context fields | | |

#### Community Impact Report
| Field | Type | Description |
|-------|------|-------------|
| `report_title` | Data | **Required** |
| `linked_project` | Link → Capital Project | **Required** |
| `report_type` | Select | Classification |
| `beneficiaries_count` | Int | |
| `jobs_created` | Int | |
| `environmental_impact` | Select | Positive / Neutral / Negative |
| `economic_impact` | Select | Positive / Neutral / Negative |
| `social_impact` | Select | Positive / Neutral / Negative |
| + Standard CityOS context fields | | |

---

## Standard CityOS Context Fields

Every CityOS module doctype includes these fields for multi-tenant data isolation:

| Field | Type | Description |
|-------|------|-------------|
| `cityos_tenant` | Data | Tenant identifier |
| `cityos_country` | Data | Country code |
| `cityos_city` | Data | City name |
| `cityos_sector` | Data | Sector classification |
| `cityos_correlation_id` | Data | Request correlation ID for tracing |
| `cityos_source_system` | Data | Origin system (ERPNext / Medusa / Payload / Temporal) |
| `cityos_workflow_state` | Data | Current workflow state |

---

## NodeContext Fields on Core ERPNext DocTypes

The following 21 ERPNext doctypes have CityOS NodeContext custom fields injected:

| DocType | Fields Added |
|---------|-------------|
| Sales Invoice | cityos_tenant, cityos_country, cityos_scope, cityos_category, cityos_subcategory, cityos_store, cityos_portal, cityos_correlation_id, cityos_source_system, cityos_source_ref_id |
| Purchase Invoice | (same as above) |
| Purchase Order | (same as above) |
| Purchase Receipt | (same as above) |
| Supplier | (same as above) |
| Customer | (same as above) |
| Item | (same as above) |
| Asset | (same as above) |
| Project | (same as above) |
| Employee | (same as above) |
| Journal Entry | (same as above) |
| Payment Entry | (same as above) |
| Sales Order | (same as above) |
| Delivery Note | (same as above) |
| Material Request | (same as above) |
| Quotation | (same as above) |
| Budget Program | (same as above) |
| Municipal Invoice | (same as above) |
| Municipal Asset | (same as above) |
| Capital Project | (same as above) |
| Contract Register | (same as above) |

**Data Isolation:** All these doctypes are filtered by `cityos_tenant` via `permission_query_conditions` — users only see records matching their tenant.

---

## Event-Driven Architecture (Outbox Pattern)

### Overview
CityOS uses the **Transactional Outbox Pattern** for reliable event publishing to external systems. Events are written to the `Integration Outbox Event` doctype within the same database transaction as the business operation, then published asynchronously.

### Event Flow
```
1. Business Operation (e.g., Invoice Submit)
   └─ doc_event handler creates Outbox Event (status: Pending)
      └─ Same DB transaction ensures atomicity

2. Hourly Scheduler: publish_pending_events()
   └─ Picks up Pending events
   └─ Sets status → Processing
   └─ Dispatches to target system (HTTP POST)
   └─ Success → Published
   └─ Failure → Failed (retry with exponential backoff)
   └─ 5 failures → Dead Letter

3. Retry Logic:
   - Max retries: 5
   - Backoff: 2^retry_count minutes (2, 4, 8, 16, 32 min)
   - Dead Letter after 5 failures (manual intervention required)
```

### Outbound Event Types

| Event Type | Target | Trigger |
|------------|--------|---------|
| `ERP_INVOICE_SUBMITTED` | Medusa Commerce | Sales Invoice submit |
| `ERP_PAYMENT_RECORDED` | Medusa Commerce | Payment Entry submit |
| `GOVERNANCE_AUTHORITY_SYNCED` | Payload CMS | Governance Authority create/update |
| `POLICY_DOCTRINE_SYNCED` | Payload CMS | Policy Doctrine create/update |
| `PERSONA_SYNCED` | Payload CMS | CityOS Persona create/update |

### Event Payload Example (Invoice Submitted)
```json
{
  "event_type": "ERP_INVOICE_SUBMITTED",
  "target_system": "Medusa Commerce",
  "source_doctype": "Sales Invoice",
  "source_name": "ACC-SINV-2026-00001",
  "tenant": "dakkah",
  "country": "Saudi Arabia",
  "event_payload": {
    "invoice_name": "ACC-SINV-2026-00001",
    "customer": "CUST-001",
    "customer_name": "Dakkah Municipality",
    "grand_total": 50000.00,
    "currency": "SAR",
    "posting_date": "2026-02-10",
    "items": [
      {
        "item_code": "SVC-001",
        "item_name": "Municipal Service Fee",
        "qty": 1.0,
        "rate": 50000.0,
        "amount": 50000.0
      }
    ],
    "correlation_id": "corr_abc123",
    "source_ref_id": "medusa_order_456"
  }
}
```

---

## Scheduled Tasks

| Schedule | Task | Description |
|----------|------|-------------|
| Every 15 minutes | `cityos.integrations.medusa_sync.sync_pending_orders` | Pulls new orders from Medusa Commerce |
| Hourly | `cityos.integrations.outbox.publish_pending_events` | Publishes outbox events to target systems |
| Daily | `cityos.compliance.checks.run_daily_compliance_checks` | Runs governance chain, policy, hierarchy, and sync health checks |
| Daily | `cityos.integrations.cms_client.sync_hierarchy_from_cms` | Syncs hierarchy data from Payload CMS |

---

## Integration Configuration

All integration settings are stored in `sites/site1.local/site_config.json`:

### Payload CMS (Content Truth)
```json
{
  "cityos_cms_api_url": "https://<payload-cms-domain>",
  "cityos_cms_api_key": "<api-key>",
  "payload_webhook_secret": "<hmac-secret>"
}
```

### Medusa Commerce (Transaction Truth)
```json
{
  "medusa_api_url": "https://<medusa-domain>",
  "medusa_api_key": "<api-key>",
  "medusa_webhook_secret": "<hmac-secret>"
}
```

### Temporal Cloud (Execution Truth)
```json
{
  "temporal_endpoint": "ap-northeast-1.aws.api.temporal.io:7233",
  "temporal_namespace": "quickstart-dakkah-cityos.djvai",
  "temporal_task_queue": "cityos-erp",
  "temporal_webhook_secret": "<hmac-secret>"
}
```
**Note:** Temporal API key is stored as a Replit secret (`TEMPORAL_API_KEY`), not in site_config.json.

---

## Roles & Permissions

### CityOS Custom Roles
| Role | Description |
|------|-------------|
| CityOS Administrator | Full access to all CityOS doctypes |
| Finance Manager | Budget, funding, fiscal allocation, municipal invoices |
| Procurement Manager | Vendor compliance, contracts, procurement requests |
| Asset Manager | Municipal assets, facilities, maintenance plans |
| HR Manager | Position control, staff assignments |
| Project Manager | Capital projects, community impact reports |
| Governance Authority | Read-only access to governance doctypes |

### Permission Matrix (Node Context)
| Role | Read | Write | Create | Delete |
|------|------|-------|--------|--------|
| System Manager | Yes | Yes | Yes | Yes |
| CityOS Administrator | Yes | Yes | Yes | No |
| Governance Authority | Yes | No | No | No |

---

## Temporal Workflow Integration

### Connection Details
```
Endpoint: ap-northeast-1.aws.api.temporal.io:7233
Namespace: quickstart-dakkah-cityos.djvai
Task Queue: cityos-erp
Auth: API Key (TEMPORAL_API_KEY secret)
```

### Workflow Use Cases
| Workflow | Description |
|----------|-------------|
| Approval Chains | Multi-level document approval with configurable steps |
| Settlement Runs | Batch payment reconciliation and settlement |
| Compliance Checks | Long-running compliance validation workflows |
| Procurement Cycles | End-to-end procurement from request to payment |

---

## Quick Start: Integration Checklist

### For Payload CMS
1. Configure `cityos_cms_api_url` and `cityos_cms_api_key` in site_config.json
2. Set `payload_webhook_secret` for HMAC validation
3. Register webhook URL: `https://<erp-domain>/api/method/cityos.integrations.webhooks.payload_webhook`
4. Sync hierarchy: `GET /api/method/cityos.integrations.cms_client.sync_hierarchy_from_cms`

### For Medusa Commerce
1. Configure `medusa_api_url` and `medusa_api_key` in site_config.json
2. Set `medusa_webhook_secret` for HMAC validation
3. Register webhook URL: `https://<erp-domain>/api/method/cityos.integrations.webhooks.medusa_webhook`
4. Events: order.placed, order.completed, payment.captured, product.created/updated, customer.created

### For Temporal Cloud
1. Set `TEMPORAL_API_KEY` as Replit secret
2. Configure endpoint, namespace, task_queue in site_config.json
3. Register webhook URL: `https://<erp-domain>/api/method/cityos.integrations.webhooks.temporal_webhook`
4. Set `temporal_webhook_secret` for HMAC validation
