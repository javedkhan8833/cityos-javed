# Fleetbase Features vs. CityOS Backend: Complete Analysis & Implementation Plan

**Document Version:** 1.0
**Date:** February 10, 2026
**Status:** Planning Phase

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Fleetbase Existing Engines — Detailed Breakdown](#2-fleetbase-existing-engines--detailed-breakdown)
3. [CityOS Backend — Full Capability Inventory](#3-cityos-backend--full-capability-inventory)
4. [CityOS Frontend — Current State Audit](#4-cityos-frontend--current-state-audit)
5. [Gap Analysis — What's Missing](#5-gap-analysis--whats-missing)
6. [Cross-Engine Integration Points](#6-cross-engine-integration-points)
7. [Implementation Plan](#7-implementation-plan)
8. [Risk Assessment](#8-risk-assessment)

---

## 1. Executive Summary

Fleetbase is a modular logistics and supply chain operating system composed of six engines (FleetOps, Pallet WMS, Storefront, IAM, Developers, Extensions). The CityOS extension adds multi-hierarchy tenant management, cascading governance policies, Payload CMS synchronization, and Temporal Cloud workflow orchestration.

**Current state:** The CityOS backend is fully built with 50+ API endpoints covering CRUD, governance, hierarchy, integrations, and platform context. The CityOS frontend is a skeleton — it has sidebar navigation and basic data tables, but no live governance views, no workflow management, no CMS sync UI, no hierarchy trees, no detail views, and 5 out of 13 data models are missing entirely.

**Goal:** Build the complete CityOS frontend to expose all backend capabilities, then integrate CityOS awareness (NodeContext scoping, tenant tier permissions, governance policy enforcement) across the existing Fleetbase engines.

---

## 2. Fleetbase Existing Engines — Detailed Breakdown

### 2.1 FleetOps Engine (Logistics Operations)

The most comprehensive engine. Handles end-to-end fleet and logistics management.

**Operations Module:**
| Feature | Route | Description |
|---------|-------|-------------|
| Orders | `operations.orders` | Full order lifecycle: create, view, detail, status tracking |
| Routes | `operations.routes` | Route planning with details view |
| Scheduler | `operations.scheduler` | Schedule management for dispatching |
| Service Rates | `operations.service-rates` | Rate configuration with create/edit/detail |
| Order Config | `operations.order-config` | Order template configuration |

**Fleet Management Module:**
| Feature | Route | Description |
|---------|-------|-------------|
| Fleets | `management.fleets` | Fleet CRUD with vehicles/drivers sub-views |
| Vehicles | `management.vehicles` | Vehicle management with positions, devices, equipment tracking |
| Drivers | `management.drivers` | Driver management with positions and schedule tracking |
| Vendors | `management.vendors` | Vendor management including integrated vendors |
| Contacts | `management.contacts` | Contact directory |
| Customers | `management.customers` | Customer management |
| Places | `management.places` | Location/place management |

**Assets & Maintenance Module:**
| Feature | Route | Description |
|---------|-------|-------------|
| Service Areas | `management.service-areas` | Geographic service zone definition |
| Fuel Reports | `management.fuel-reports` | Fuel consumption tracking |
| Issues | `management.issues` | Issue/incident reporting |
| Maintenance | `management.maintenance` | Vehicle/equipment maintenance schedules |
| Sensors | `management.sensors` | IoT/telematic sensor data |
| Equipment | `management.equipment` | Equipment tracking |
| Parts | `management.parts` | Spare parts inventory |

**Map & GIS Module:**
| Component | Description |
|-----------|-------------|
| Live Map | Real-time vehicle/driver tracking on map |
| Map Drawer | Side panel for contextual map information |
| Order List Overlay | Map overlay showing order locations |
| Map Toolbar | Map interaction controls |

**Analytics Module:**
| Feature | Route | Description |
|---------|-------|-------------|
| Reports | `analytics.reports` | Custom report builder with results view |

**Settings Module:**
| Feature | Route | Description |
|---------|-------|-------------|
| Navigator App | `settings.navigator-app` | Mobile navigator app configuration |
| Notifications | `settings.notifications` | Notification settings |
| Custom Fields | `settings.custom-fields` | Custom field definitions |
| Routing | `settings.routing` | Routing algorithm settings |
| Payments | `settings.payments` | Payment gateway integration (with onboarding) |

**UI Components (43 component directories):**
- Order components: form, details, sub-header, list overlay
- Entity components: driver, vehicle, fleet, contact, customer, place, vendor
- Map components: drawer, toolbar, order list overlay
- Cell components: table cell renderers
- Admin components: navigator app, avatar management
- Widgets: fleet-ops-key-metrics

**Data Models:** Order, Route, Fleet, Vehicle, Driver, Place, Contact, Customer, Vendor, ServiceRate, ServiceArea, FuelReport, Issue, MaintenanceRecord, Sensor, Equipment, Part

---

### 2.2 Pallet Engine (Warehouse Management System)

Full WMS solution for inventory, purchasing, and sales operations.

**Core Modules:**
| Feature | Route | Description |
|---------|-------|-------------|
| Products | `products` | Product catalog CRUD with details |
| Warehouses | `warehouses` | Warehouse location management |
| Suppliers | `suppliers` | Supplier directory |

**Inventory Module:**
| Feature | Route | Description |
|---------|-------|-------------|
| All Inventory | `inventory` | Complete inventory view with stock adjustments |
| Low Stock | `inventory.low-stock` | Items below reorder point |
| Expired Stock | `inventory.expired-stock` | Items past expiration date |

**Transactions Module:**
| Feature | Route | Description |
|---------|-------|-------------|
| Sales Orders | `sales-orders` | Outbound sales order management |
| Purchase Orders | `purchase-orders` | Inbound purchase order management |

**Operations Module:**
| Feature | Route | Description |
|---------|-------|-------------|
| Batch | `batch` | Batch/lot processing |
| Audits | `audits` | Inventory audit trails |
| Reports | `reports` | WMS-specific reporting |

**UI Components:**
- Panel components: product-panel, inventory-panel, batch-panel, purchase-order-panel, sales-order-panel, warehouse-panel, supplier-panel
- Form panels: product-form-panel, inventory-form-panel, stock-adjustment-form-panel, purchase-order-form-panel, sales-order-form-panel
- Context panel: contextual detail view
- Cell components: table cell renderers
- Admin components: settings panels

**Data Models:** Product, Warehouse, Supplier, Inventory, StockAdjustment, SalesOrder, PurchaseOrder, Batch

---

### 2.3 Storefront Engine (Commerce & Marketplace)

Multi-channel commerce platform with network/store management.

**Product & Catalog Module:**
| Feature | Route | Description |
|---------|-------|-------------|
| Products | `products` | Product management with category browsing |
| Catalogs | `catalogs` | Catalog/collection management |

**Commerce Module:**
| Feature | Route | Description |
|---------|-------|-------------|
| Orders | `orders` | Storefront order management with create/edit/view |
| Customers | `customers` | Storefront customer management |

**Network Module:**
| Feature | Route | Description |
|---------|-------|-------------|
| Networks | `networks` | Multi-store network management |
| Network Detail | `networks.network` | Individual network with stores, customers, orders sub-views |
| Food Trucks | `food-trucks` | Mobile vendor management |

**Marketing Module:**
| Feature | Route | Description |
|---------|-------|-------------|
| Promotions | `promotions` | Push notification campaigns |
| Coupons | `coupons` | Discount coupon management |
| Broadcast | `broadcast` | Broadcast messaging |
| Pages | `pages` | Content page management |

**Settings Module:**
| Feature | Route | Description |
|---------|-------|-------------|
| API Settings | `settings.api` | Storefront API configuration |
| Locations | `settings.locations` | Store location management |
| Gateways | `settings.gateways` | Payment gateway configuration |
| Notifications | `settings.notifications` | Notification preferences |

**Data Models:** Product, Category, Catalog, Order, Customer, Network, Store, FoodTruck, Promotion, Coupon, Page

---

### 2.4 IAM Engine (Identity & Access Management)

Core access control and user management.

| Feature | Route | Description |
|---------|-------|-------------|
| Dashboard | `home` | IAM overview metrics |
| Users | `users` | User account management |
| Groups | `groups` | Organizational group management |
| Roles | `roles` | Role definition and assignment |
| Policies | `policies` | Access policy management |

**UI Components:**
- Admin panels for user/group/role/policy CRUD
- Metrics widget: IAM usage dashboard
- Permission-gated sidebar items (`@permission`, `@visible={{can ...}}`)

**Data Models:** User, Group, Role, Policy

**Integration Pattern:** Uses `@permission` and `{{can}}` helpers for route-level and component-level access control.

---

### 2.5 Developer Engine (API & Integration Tools)

Developer-facing tools for API management and debugging.

| Feature | Route | Description |
|---------|-------|-------------|
| Dashboard | `home` | Developer overview |
| API Keys | `api-keys` | API key generation and management |
| Webhooks | `webhooks` | Webhook endpoint configuration with detail view |
| Sockets | `sockets` | WebSocket channel management with detail view |
| Events | `events` | Event log with detail view |
| Logs | `logs` | API request/response logs with detail view |

**Data Models:** ApiKey, Webhook, Socket, Event, Log

---

### 2.6 Extensions/Registry Bridge Engine

Manages installable extensions and the engine registry.

| Feature | Description |
|---------|-------------|
| Extension Discovery | Browse and search available extensions |
| Installation | Install/uninstall engine extensions |
| Configuration | Per-extension settings |

---

### 2.7 Shared UI Framework (`@fleetbase/ember-ui`)

All engines share a common component library with 60+ components:

**Layout Components:**
- `Layout::Section::Container` — Main content area
- `Layout::Sidebar::Panel` / `Layout::Sidebar::Item` — Sidebar navigation
- `Layout::Header` — Section headers
- `Layout::YieldSidebar` — Dynamic sidebar injection
- `EmberWormhole` — Portal-based sidebar rendering

**Data Display:**
- `Dashboard` — Dashboard layout with widgets
- `Chart` — Chart/visualization component
- `Badge` — Status badges
- `ClickToCopy` / `ClickToReveal` — Interactive display
- `ActivityLog` — Activity timeline

**Form Components:**
- `AutocompleteInput`, `ComboBox`, `DatePicker`, `CoordinatesInput`
- `CountrySelect`, `CurrencySelect`
- `Checkbox`, `ArrayInput`
- `CustomField` / `CustomFieldsManager`

**Communication:**
- `ChatContainer` / `ChatWindow` / `ChatTray`
- `CommentThread`
- `Notifications`

**Shared Services (`@fleetbase/ember-core`):**
- `crud` — Standard CRUD operations
- `fetch` — HTTP client
- `current-user` — Authentication context
- `universe` — Engine registry and inter-engine communication
- `abilities` — Permission checking
- `filters` — Query filter management
- `notifications` — Toast/notification management
- `socket` — WebSocket client
- `theme` — Dark/light mode

---

## 3. CityOS Backend — Full Capability Inventory

### 3.1 Data Models (13 Models)

#### Core Hierarchy Models (8 — Country→Portal path)
| Model | Table | Key Fields | Relationships |
|-------|-------|------------|---------------|
| **Country** | `cityos_countries` | code, name, name_ar, currency_code, default_locale, processing_region, residency_class, cms_country_id, policies (JSON), settings (JSON) | hasMany: Cities; belongsTo: Region |
| **City** | `cityos_cities` | name, name_ar, slug, theme, timezone, geo_boundary (JSON), status | belongsTo: Country; hasMany: Sectors |
| **Sector** | `cityos_sectors` | name, name_ar, slug, status | hasMany: Categories |
| **Category** | `cityos_categories` | name, name_ar, slug, description, level, icon, sort_order, parent_uuid | self-referential parent/children |
| **Tenant** | `cityos_tenants` | name, name_ar, handle, tenant_tier (MASTER/GLOBAL/REGIONAL/COUNTRY/CITY), parent_tenant_uuid, category_uuid, company_uuid, region_uuid, residency_zone, medusa_tenant_id, payload_tenant_id, erpnext_company | belongsTo: Country, Region, Category, Parent Tenant; hasMany: Channels, Child Tenants |
| **Channel** | `cityos_channels` | name, slug, type, tenant_uuid, medusa_sales_channel_id, config (JSON) | belongsTo: Tenant; hasMany: Surfaces |
| **Surface** | `cityos_surfaces` | name, name_ar, slug, channel_uuid, medusa_store_id, payload_store_id, status | belongsTo: Channel; hasMany: Portals |
| **Portal** | `cityos_portals` | name, name_ar, slug, surface_uuid, url, status | belongsTo: Surface |

#### Governance Models (4)
| Model | Table | Key Fields | Relationships |
|-------|-------|------------|---------------|
| **Region** | `cityos_regions` | code, name, name_ar, residency_zone, data_residency_policy (JSON), compliance_policy (JSON), classification_policy (JSON) | hasMany: Countries, Policies, Tenants |
| **GovernanceAuthority** | `cityos_governance_authorities` | code, name, name_ar, type, country_uuid, parent_authority_uuid, jurisdiction (JSON), mandates (JSON), compliance_requirements (JSON), data_handling_rules (JSON) | belongsTo: Country, Parent Authority; hasMany: Child Authorities, Policies |
| **Policy** | `cityos_policies` | name, slug, type, scope, priority, authority_uuid, region_uuid, country_uuid, tenant_uuid, policy_data (JSON), enforced (boolean) | belongsTo: Authority, Region, Country, Tenant |
| **FeatureFlag** | `cityos_feature_flags` | key, name, description, enabled (boolean), conditions (JSON), status | Evaluated by FeatureGateService |

#### Infrastructure Model (1)
| Model | Table | Key Fields | Relationships |
|-------|-------|------------|---------------|
| **Node** | `cityos_nodes` | name, slug, type (9 levels), code, parent_uuid, depth, status, coordinates_lat, coordinates_lng, payload_node_id, metadata (JSON) | self-referential parent/children |

#### Supporting Models (2)
| Model | Table | Key Fields |
|-------|-------|------------|
| **IntegrationLog** | `cityos_integration_logs` | integration, operation, status, request (JSON), response (JSON), duration_ms, error_message |
| **OutboxEvent** | `cityos_outbox_events` | event_id, event_type, tenant_id, payload (JSON), correlation_id, node_context (JSON), status (pending/published/failed/dead_letter), retry_count, max_retries, error_message |
| **WorkflowRegistry** | `cityos_workflow_registry` | workflow_type, display_name, description, domain_pack, source, source_system, is_active, execution_count, task_queues (JSON), tags (JSON), status_counts (JSON), input_schema (JSON), output_schema (JSON), retry_policy (JSON) |

### 3.2 Node Hierarchy (9-Level Payload CMS Mirror)

```
GLOBAL
  └── CONTINENT
        └── REGION
              └── COUNTRY
                    └── CITY
                          └── DISTRICT
                                └── ZONE
                                      └── FACILITY
                                            └── ASSET
```

Each node has coordinates, Payload CMS ID, metadata, and parent/child relationships. The hierarchy mirrors the content structure in Payload CMS and provides the spatial context for all operations.

### 3.3 Tenant Hierarchy (5-Tier Multi-Tenancy)

```
MASTER (Platform Owner)
  └── GLOBAL (Global Operator)
        └── REGIONAL (Regional Manager — e.g., GCC)
              └── COUNTRY (Country Manager — e.g., Saudi Arabia)
                    └── CITY (City Operator — e.g., Riyadh)
```

Each tenant tier inherits governance policies from parent tiers. The `getAncestryChain()` method traverses the full lineage.

### 3.4 API Endpoints (50+ Endpoints)

#### CRUD Resource Endpoints (13 resources × ~5 operations each)
All under `cityos/int/v1/` with `fleetbase.protected` middleware:

| Resource | Endpoint | Operations |
|----------|----------|------------|
| Countries | `/countries` | index, store, show, update, destroy |
| Cities | `/cities` | index, store, show, update, destroy |
| Sectors | `/sectors` | index, store, show, update, destroy |
| Categories | `/categories` | index, store, show, update, destroy |
| Tenants | `/tenants` | index, store, show, update, destroy, `{id}/node-context` |
| Channels | `/channels` | index, store, show, update, destroy |
| Surfaces | `/surfaces` | index, store, show, update, destroy |
| Portals | `/portals` | index, store, show, update, destroy |
| Regions | `/regions` | index, store, show, update, destroy |
| Governance Authorities | `/governance-authorities` | index, store, show, update, destroy |
| Policies | `/policies` | index, store, show, update, destroy |
| Feature Flags | `/feature-flags` | index, store, show, update, destroy |
| Nodes | `/nodes` | index, store, show, update, destroy |

#### Hierarchy Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/hierarchy/tree` | GET | Full Country→City→Sector→Category hierarchy tree |
| `/hierarchy/resolve` | GET | Resolve NodeContext from request parameters |
| `/hierarchy/stats` | GET | Count of all entity types |

#### Governance Endpoints
| Endpoint | Method | Parameters | Description |
|----------|--------|------------|-------------|
| `/governance/resolve` | GET | country, tenant | Build governance chain with cascading policies |
| `/governance/tenant-hierarchy` | GET | tenant, mode (tree/ancestry) | Tenant hierarchy tree or ancestry chain |
| `/governance/compliance` | GET | tenant, operation | Check compliance violations for a tenant |
| `/governance/feature-flags` | GET | tenant_tier, node_type | Evaluate feature flags for context |
| `/governance/node-tree` | GET | type, parent | Node hierarchy tree browser |

#### Integration Endpoints — Temporal Cloud
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/integrations/temporal/connection` | GET | Connection health and namespace info |
| `/integrations/temporal/workflows` | GET | List running/completed workflows |
| `/integrations/temporal/workflows/start` | POST | Start a new workflow |
| `/integrations/temporal/workflows/{id}` | GET | Describe a specific workflow |
| `/integrations/temporal/workflows/{id}/signal` | POST | Send signal to workflow |
| `/integrations/temporal/workflows/{id}/terminate` | POST | Terminate a workflow |
| `/integrations/temporal/sync/trigger` | POST | Trigger workflow registry sync |
| `/integrations/temporal/sync/status` | GET | Get sync status |
| `/integrations/temporal/registry` | GET | List workflow registry entries |
| `/integrations/temporal/registry/stats` | GET | Workflow registry statistics |

#### Integration Endpoints — Payload CMS
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/integrations/cms/health` | GET | CMS connection health |
| `/integrations/cms/nodes` | GET | CMS node collections |
| `/integrations/cms/tenants` | GET | CMS tenant data |
| `/integrations/cms/pois` | GET | Points of interest |
| `/integrations/cms/collections` | GET | All CMS collections |
| `/integrations/cms/governance` | GET | CMS governance data |
| `/integrations/cms/storage` | GET | CMS storage status |
| `/integrations/cms/storage/info` | GET | Detailed storage info |

#### Integration Endpoints — ERPNext
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/integrations/erpnext/status` | GET | ERPNext connection status |
| `/integrations/erpnext/settlement` | POST | Trigger settlement processing |

#### Integration Endpoints — Outbox/CityBus
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/integrations/outbox/stats` | GET | Outbox queue statistics |
| `/integrations/outbox/dispatch` | POST | Dispatch pending events (batch_size param) |
| `/integrations/outbox/publish` | POST | Publish a new event (event_type, payload, node_context, tenant_id) |
| `/integrations/outbox/recent` | GET | Recent outbox events (limit param) |

#### Platform Context Endpoints (Public)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/platform/context` | GET | Current platform context |
| `/api/platform/tenants/default` | GET | Default tenant |
| `/api/platform/capabilities` | GET | Platform capabilities |

#### Workflow Registry Endpoints (Public)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/workflow-registry` | GET/POST | List/create workflow registry entries |
| `/api/workflow-definitions` | GET | Workflow type definitions |
| `/api/queue-system-map` | GET | Queue-to-system mappings |
| `/api/workflow-registry/sync` | POST | Sync registry from Temporal |

#### Webhook Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/webhooks/cityos/cms` | POST | Payload CMS incoming webhook |

### 3.5 Backend Services (12 Services)

| Service | File | Purpose |
|---------|------|---------|
| **GovernanceChainBuilder** | `Support/GovernanceChainBuilder.php` | Builds cascading governance chain: Region → Country → Authority → Tenant. Resolves region from country code, fetches authorities, builds policy stack, merges via PolicyMerger |
| **PolicyMerger** | `Support/PolicyMerger.php` | Merges policies from multiple levels with priority-based cascading. Returns effective policies with a trace of which policy came from which level |
| **ComplianceCheckService** | `Services/ComplianceCheckService.php` | Checks tenant compliance against governance chain. Detects violations for: data residency (cross-border transfer, encryption), compliance (audit requirements), classification (access level restrictions). Returns violations with severity (WARNING/CRITICAL) |
| **FeatureGateService** | `Services/FeatureGateService.php` | Evaluates feature flags for tenant tier + node type + user role context. Supports conditional evaluation with caching |
| **TemporalCliBridge** | `Services/TemporalCliBridge.php` | CLI subprocess bridge for Temporal Cloud gRPC operations (avoids segfault from PHP gRPC extension in web server). Supports: health, namespace, list, start, describe, signal, terminate, sync |
| **TemporalService** | `Services/TemporalService.php` | Direct Temporal gRPC client with TLS + Bearer auth. Same operations as CliBridge but direct |
| **PayloadCMSService** | `Services/PayloadCMSService.php` | HTTP client for Payload CMS. Fetches nodes, tenants, POIs, collections, governance data, storage info |
| **CmsMappingService** | `Services/CmsMappingService.php` | Syncs CMS data to local database: regions, countries, authorities, policies, nodes, feature flags, tenants. Maps CMS schema to local models |
| **ERPNextService** | `Services/ERPNextService.php` | ERPNext integration for settlement processing, COD collection, penalties, payouts (stub mode) |
| **CityBusService** | `Services/CityBusService.php` | Outbox event bus. Publishes events with CloudEvents envelope, handles retries with exponential backoff, dead letter queue. Dispatches pending events in batches |
| **CapabilitiesService** | `Services/CapabilitiesService.php` | Reports platform capabilities and feature availability |
| **QueueSystemMapService** | `Services/QueueSystemMapService.php` | Maps Temporal task queues to CityOS systems and domain packs |

### 3.6 Middleware (3 Custom Middleware)

| Middleware | Purpose |
|------------|---------|
| **ResolveNodeContext** | Parses request headers/params for node context (country, city, sector, tenant). Attaches `NodeContext` instance to request |
| **EnforceDataResidency** | Checks data residency zone requirements. Blocks cross-zone operations when policy prohibits |
| **EnforceDataClassification** | Validates data classification level against user/tenant permissions. Blocks access to data above classification threshold |

---

## 4. CityOS Frontend — Current State Audit

### 4.1 What Exists

**Navigation (application.hbs):**
- 4 sidebar panels: CityOS (Dashboard, Hierarchy), Entities (Countries/Cities/Sectors/Categories), Operations (Tenants/Channels/Surfaces/Portals), Platform (Integrations, Governance)

**Templates (26 files):**
- `home.hbs` — Dashboard with hardcoded stats, hierarchy preview, integration cards
- `hierarchy/` — Index + Countries/Cities/Sectors/Categories index pages (basic tables)
- `tenants/index.hbs` — Basic tenant table
- `channels/index.hbs`, `surfaces/index.hbs`, `portals/index.hbs` — Basic tables
- `integrations/` — Index + Temporal/CMS/ERPNext/Outbox sub-pages
- `governance/` — Index + Policies/Residency sub-pages

**Models (8):**
- cityos-country, cityos-city, cityos-sector, cityos-category, cityos-tenant, cityos-channel, cityos-surface, cityos-portal

**Adapters (9):**
- Base `cityos` adapter (namespace: `cityos/int/v1`) + one per model

**Controllers (2):**
- `home.js` — Dashboard controller
- `hierarchy/index.js` — Hierarchy overview controller

**Services (1):**
- `cityos.js` — Service for API calls

**Components (0):**
- No custom components exist

### 4.2 What's Missing (Detailed)

#### Missing Data Models (5)
| Model Needed | Backend Resource | Key Fields Not Represented |
|-------------|-----------------|---------------------------|
| `cityos-region` | Region | code, residency_zone, data_residency_policy, compliance_policy, classification_policy |
| `cityos-governance-authority` | GovernanceAuthority | code, type, jurisdiction, mandates, compliance_requirements, data_handling_rules, parent hierarchy |
| `cityos-policy` | Policy | type, scope, priority, authority_uuid, region_uuid, policy_data, enforced |
| `cityos-feature-flag` | FeatureFlag | key, enabled, conditions |
| `cityos-node` | Node | type (9 levels), code, depth, coordinates, payload_node_id, parent hierarchy |

#### Missing Fields on Existing Models
| Model | Missing Fields |
|-------|---------------|
| `cityos-tenant` | tenant_tier, parent_tenant_uuid, region_uuid, residency_zone, company_uuid |
| `cityos-country` | currency_code, default_locale, processing_region, residency_class, region_uuid, policies (JSON), settings (JSON), cms_country_id |
| `cityos-city` | theme, timezone, geo_boundary |
| `cityos-channel` | type, config (JSON) |

#### Missing Adapters (5)
- cityos-region, cityos-governance-authority, cityos-policy, cityos-feature-flag, cityos-node

#### Missing Templates (Detail Views)
Every entity has a `details` route defined but NO template:
- countries/details, cities/details, sectors/details, categories/details
- tenants/details, channels/details, surfaces/details, portals/details

#### Missing Functional Views
| View | Backend Endpoint | Current State |
|------|-----------------|---------------|
| Governance Chain Resolver | `/governance/resolve` | Page shows static text descriptions |
| Tenant Hierarchy Tree | `/governance/tenant-hierarchy` | No tree visualization |
| Node Hierarchy Browser | `/governance/node-tree` | Not implemented |
| Compliance Checker | `/governance/compliance` | Not implemented |
| Feature Flag Manager | `/governance/feature-flags` + CRUD | Not implemented |
| Temporal Workflow Console | `/integrations/temporal/*` | Shows connection info only |
| CMS Sync Dashboard | `/integrations/cms/*` | Shows static descriptions |
| Integration Logs | `/integrations/logs` | Not implemented |
| Outbox Event Manager | `/integrations/outbox/*` | Shows static descriptions |
| Live Dashboard Stats | `/hierarchy/stats` | Stats are hardcoded in controller |

---

## 5. Gap Analysis — What's Missing

### 5.1 Gap Summary Matrix

| Category | Backend Ready | Frontend Built | Gap |
|----------|:------------:|:--------------:|:---:|
| Country/City/Sector/Category CRUD | Yes | Partial (list only) | Detail views, extended fields |
| Tenant CRUD | Yes | Partial (list only) | Detail view, hierarchy fields |
| Channel/Surface/Portal CRUD | Yes | Partial (list only) | Detail views |
| Region CRUD | Yes | No | Model + adapter + views |
| Governance Authority CRUD | Yes | No | Model + adapter + views |
| Policy CRUD | Yes | No | Model + adapter + views |
| Feature Flag CRUD | Yes | No | Model + adapter + views |
| Node CRUD | Yes | No | Model + adapter + views |
| Hierarchy Tree | Yes | Partial (basic preview) | Full tree browser |
| Governance Chain Resolution | Yes | No | Chain resolver UI |
| Tenant Hierarchy Tree | Yes | No | Tree visualization |
| Node Hierarchy Browser | Yes | No | 9-level tree browser |
| Compliance Checking | Yes | No | Checker UI + results |
| Feature Flag Evaluation | Yes | No | Context-aware evaluation UI |
| Temporal Workflows | Yes | Static only | Live workflow console |
| CMS Sync | Yes | No | Sync trigger + status UI |
| Integration Logs | Yes | No | Log viewer |
| Outbox Management | Yes | No | Event viewer + dispatch |
| Dashboard Live Stats | Yes | Hardcoded | Wire to API |
| Cross-Engine Scoping | Backend ready | No | NodeContext integration |

### 5.2 Technical Debt

1. **No components directory** — All UI is inline in templates; no reusable components
2. **Only 2 controllers** — Most views have no controller logic
3. **No route models** — Routes don't load data via model hooks
4. **Hardcoded data** — Dashboard stats and integration descriptions are static
5. **No error handling** — No loading/error states in any view
6. **No serializers** — Custom backend responses (governance, hierarchy) need serializers

---

## 6. Cross-Engine Integration Points

### 6.1 How CityOS Should Interact with Each Engine

#### FleetOps Integration
| FleetOps Feature | CityOS Integration | Implementation |
|-----------------|-------------------|----------------|
| Orders | Scoped by tenant + city + country via NodeContext | Add NodeContext header to FleetOps API calls; filter orders by tenant |
| Drivers | Tenant isolation + data residency enforcement | Driver records tagged with tenant_uuid; cross-tenant queries blocked by middleware |
| Vehicles | Same as Drivers | Vehicle records respect tenant boundary |
| Places | Map to CityOS Node hierarchy (FACILITY, ZONE) | Places optionally linked to CityOS nodes |
| Service Areas | Align with CityOS geographic hierarchy | Service areas can reference CityOS city/district/zone nodes |
| Service Rates | Vary by country/region governance | Rates can be scoped by governance policies (currency, tax rules) |

#### Pallet (WMS) Integration
| Pallet Feature | CityOS Integration | Implementation |
|---------------|-------------------|----------------|
| Warehouses | Map to CityOS FACILITY nodes | Warehouse records link to node_uuid; inherit facility governance |
| Products | Data classification per governance policy | Products tagged with classification level; residency-aware storage |
| Inventory | Residency zone enforcement | Inventory movements respect cross-zone transfer policies |
| Purchase Orders | Settlement via ERPNext integration | POs can trigger ERPNext settlement workflows |

#### Storefront Integration
| Storefront Feature | CityOS Integration | Implementation |
|-------------------|-------------------|----------------|
| Products | Scoped by tenant → channel → surface | Product visibility controlled by surface assignment |
| Orders | Route through CityOS tenant hierarchy | Order processing respects tenant tier permissions |
| Networks/Stores | Map to CityOS surface/portal structure | Networks are collections of surfaces; stores are portals |
| Payments | Governed by country-level financial policies | Payment gateway selection based on governance rules |

#### IAM Integration
| IAM Feature | CityOS Integration | Implementation |
|------------|-------------------|----------------|
| Roles | Inherit tenant tier permissions | MASTER tenant roles > GLOBAL > REGIONAL > COUNTRY > CITY |
| Policies | Merge with governance policies | IAM policies + CityOS governance = effective permissions |
| Users | Scoped by tenant + data classification clearance | User access limited by classification level and residency zone |

#### Developer Engine Integration
| Dev Feature | CityOS Integration | Implementation |
|------------|-------------------|----------------|
| API Keys | Scoped by tenant | API keys inherit tenant context |
| Webhooks | CityBus event subscriptions | Webhooks can subscribe to CityOS outbox events |
| Events | Integration with CityBus outbox | CityOS events appear in developer event log |
| Logs | Integration log aggregation | CityOS integration logs merged into developer logs view |

### 6.2 NodeContext Flow

```
Request → ResolveNodeContext Middleware → NodeContext object
  ├── Headers: X-CityOS-Country, X-CityOS-City, X-CityOS-Tenant
  ├── Query params: ?country=SA&city=riyadh&tenant=acme
  └── Resolved: { country, city, sector, category, tenant }

NodeContext → EnforceDataResidency → EnforceDataClassification → Controller
  ├── Residency check: Is data in correct zone?
  ├── Classification check: Does user have clearance?
  └── Controller: Execute with scoped query
```

---

## 7. Implementation Plan

### Phase 1: Foundation — Data Layer & Core Views
**Estimated Effort:** Large
**Priority:** Critical (blocks everything else)

#### Task 1.1: Add Missing Ember Data Models
Create 5 new models with adapters:

**cityos-region:**
```
Fields: code, name, name_ar, residency_zone, data_residency_policy, compliance_policy, classification_policy, status, meta
Relationships: hasMany countries, hasMany policies, hasMany tenants
```

**cityos-governance-authority:**
```
Fields: code, name, name_ar, type, country_uuid, parent_authority_uuid, jurisdiction, mandates, compliance_requirements, data_handling_rules, status, meta
Relationships: belongsTo country, belongsTo parentAuthority, hasMany childAuthorities, hasMany policies
```

**cityos-policy:**
```
Fields: name, slug, type, scope, priority, authority_uuid, region_uuid, country_uuid, tenant_uuid, policy_data, enforced, status, meta
Relationships: belongsTo authority, belongsTo region, belongsTo country, belongsTo tenant
```

**cityos-feature-flag:**
```
Fields: key, name, description, enabled, conditions, status, meta
```

**cityos-node:**
```
Fields: name, slug, type, code, parent_uuid, depth, status, coordinates_lat, coordinates_lng, payload_node_id, metadata
Relationships: belongsTo parent, hasMany children
```

#### Task 1.2: Extend Existing Models
Add missing fields to:
- **cityos-tenant:** tenant_tier, parent_tenant_uuid, region_uuid, residency_zone, company_uuid
- **cityos-country:** currency_code, default_locale, processing_region, residency_class, region_uuid, policies, settings, cms_country_id
- **cityos-city:** theme, timezone, geo_boundary
- **cityos-channel:** type, config

#### Task 1.3: Wire Dashboard to Live API
- Replace hardcoded stats in `home.js` controller with fetch from `/hierarchy/stats`
- Load integration status from `/integrations/status`
- Show live hierarchy tree preview from `/hierarchy/tree`

#### Task 1.4: Build Detail View Templates
For each of the 13 entity types, create a detail view template showing all fields and relationships. Follow the Pallet engine's panel pattern (detail panel with sections).

#### Task 1.5: Update Sidebar Navigation
Add new sidebar items for:
- Regions (under Entities or new Governance panel)
- Nodes (under Hierarchy)
- Governance Authorities, Policies, Feature Flags (under Governance)

---

### Phase 2: Hierarchy & Governance Visualization
**Estimated Effort:** Large
**Priority:** High (core CityOS value)

#### Task 2.1: Tenant Hierarchy Tree
- Create `tenant-tree` component
- Fetch from `/governance/tenant-hierarchy?mode=tree`
- Display 5-tier tree with expand/collapse
- Show tenant tier badges (MASTER/GLOBAL/REGIONAL/COUNTRY/CITY)
- Ancestry mode: click tenant to see full lineage chain
- Add to sidebar navigation

#### Task 2.2: Node Hierarchy Browser
- Create `node-tree` component
- Fetch from `/governance/node-tree`
- Display 9-level tree with type icons
- Filter by node type
- Show coordinates on map (if available)
- Drill-down navigation
- Add to sidebar navigation

#### Task 2.3: Governance Chain Resolver
- Create `governance-resolver` component
- Input: select country + tenant (or auto-detect)
- Fetch from `/governance/resolve`
- Display: Region → Country → Authorities → Policies cascade
- Show effective merged policies with trace (which level set which rule)
- Visual: stacked cards showing policy inheritance

#### Task 2.4: Compliance Checker
- Create `compliance-checker` component
- Input: select tenant + operation type
- Fetch from `/governance/compliance`
- Display violations with severity badges (WARNING/CRITICAL)
- Show specific rules violated and remediation guidance

#### Task 2.5: Feature Flag Manager
- List all feature flags from CRUD endpoint
- Create/edit flags with condition builder
- Context evaluation tool: input tenant_tier + node_type → see which flags are enabled/disabled
- Toggle enabled/disabled status

#### Task 2.6: Governance Authorities View
- CRUD list and detail views for governance authorities
- Show authority hierarchy (parent/child)
- Show associated policies
- Country filter

---

### Phase 3: Integration Dashboards
**Estimated Effort:** Large
**Priority:** High (operational tooling)

#### Task 3.1: Temporal Workflow Console
- **Connection Status:** Live health check from `/integrations/temporal/connection`
- **Workflow List:** Paginated list from `/integrations/temporal/workflows`
  - Columns: Workflow ID, Type, Status, Start Time, Task Queue
  - Filter by status, type
- **Workflow Detail:** Click to view from `/integrations/temporal/workflows/{id}`
  - Show execution history, current state, input/output
- **Start Workflow:** Form to start new workflow
  - Select workflow type (from registry), set ID, input JSON, task queue
- **Signal Workflow:** Send signals to running workflows
- **Terminate Workflow:** Terminate with confirmation dialog
- **Registry View:** Browse workflow registry from `/integrations/temporal/registry`
  - Show: workflow types, domain packs, execution counts, task queues, tags
  - Sync button: trigger `/integrations/temporal/sync/trigger`

#### Task 3.2: CMS Sync Dashboard
- **Health Status:** Live from `/integrations/cms/health`
- **Collections Browser:** View from `/integrations/cms/collections`
  - Tabs: Nodes, Tenants, POIs, Governance
- **Storage Info:** From `/integrations/cms/storage/info`
- **Sync Controls:**
  - Trigger sync (maps to CmsMappingService operations)
  - Show last sync timestamp and status
  - Diff view: what changed since last sync

#### Task 3.3: Integration Logs Viewer
- Fetch from `/integrations/logs`
- Filter by: integration (temporal/cms/erpnext/citybus), status (success/error)
- Show: timestamp, integration, operation, status, duration, request/response expandable
- Auto-refresh toggle

#### Task 3.4: Outbox Event Manager
- **Stats Dashboard:** From `/integrations/outbox/stats`
  - Show: pending, published, failed, dead_letter counts
- **Recent Events:** From `/integrations/outbox/recent`
  - Show: event_type, tenant, status, timestamp, payload preview
- **Dispatch Controls:** Trigger `/integrations/outbox/dispatch` with batch size
- **Publish Event:** Form to publish new event (event_type, payload, node_context)

#### Task 3.5: ERPNext Dashboard
- **Status:** Live from `/integrations/erpnext/status`
- **Settlement:** Trigger settlement from `/integrations/erpnext/settlement`
- Note: ERPNext is in stub mode; UI should show current status and be ready for when it goes live

---

### Phase 4: Cross-Engine CityOS Awareness
**Estimated Effort:** Very Large
**Priority:** Medium (platform-wide enhancement)

#### Task 4.1: NodeContext Service
- Create shared `node-context` service accessible by all engines
- Manages current context: selected country, city, tenant
- Persists context in session/localStorage
- Provides context headers for API requests

#### Task 4.2: Context Selector Component
- Global context picker in console header
- Dropdowns: Country → City → Tenant (cascading)
- Shows current context badge
- Changes filter all engine views

#### Task 4.3: FleetOps Integration
- Orders: filter by tenant context
- Drivers/Vehicles: show tenant assignment
- Service Areas: link to CityOS nodes
- Service Rates: show governance-based currency/rules

#### Task 4.4: Pallet Integration
- Warehouses: link to FACILITY nodes
- Products: show data classification badge
- Inventory: residency zone indicator

#### Task 4.5: Storefront Integration
- Products/Orders: filter by tenant → channel → surface
- Networks: align with CityOS surface structure

#### Task 4.6: IAM Integration
- Roles: show tenant tier scope
- Users: show clearance level and residency zone

---

## 8. Risk Assessment

### Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| gRPC segfault in web context | Temporal features fail | Known issue (mitigated) | CLI Bridge pattern already in place |
| Large hierarchy trees slow to render | Poor UX | Medium | Lazy-load children, virtual scrolling, pagination |
| CMS sync creates data conflicts | Data integrity | Medium | Idempotent sync with conflict detection |
| Cross-engine scoping breaks existing views | Regression | High | Feature-flag the context scoping; phased rollout |
| Ember engine isolation limits shared state | Context sharing fails | Medium | Use universe service for cross-engine communication |

### Dependencies

| Dependency | Required For | Status |
|-----------|-------------|--------|
| PostgreSQL with PostGIS | All backend features | Installed and configured |
| Temporal Cloud | Workflow management | Connected (ap-northeast-1) |
| Payload CMS | CMS sync, node hierarchy | Configured via env vars |
| ERPNext | Settlement processing | Stub mode |
| PHP gRPC extension | Direct Temporal calls | Available via CLI only (segfault in web) |

### Recommended Build Order

```
Phase 1 (Foundation)
  ├── 1.1 Models/Adapters ← START HERE
  ├── 1.2 Extend existing models
  ├── 1.3 Live dashboard
  ├── 1.4 Detail views
  └── 1.5 Updated navigation

Phase 2 (Governance) — after Phase 1
  ├── 2.1 Tenant tree
  ├── 2.2 Node tree
  ├── 2.3 Governance chain resolver
  ├── 2.4 Compliance checker
  ├── 2.5 Feature flags
  └── 2.6 Authorities view

Phase 3 (Integrations) — after Phase 1, parallel with Phase 2
  ├── 3.1 Temporal console
  ├── 3.2 CMS sync
  ├── 3.3 Integration logs
  ├── 3.4 Outbox manager
  └── 3.5 ERPNext dashboard

Phase 4 (Cross-Engine) — after Phase 2 + 3
  ├── 4.1 NodeContext service
  ├── 4.2 Context selector
  ├── 4.3 FleetOps integration
  ├── 4.4 Pallet integration
  ├── 4.5 Storefront integration
  └── 4.6 IAM integration
```

---

*End of Document*
