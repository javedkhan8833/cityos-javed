# CityOS Cross-Engine Integration Design Document

**Document Version:** 1.0
**Date:** February 11, 2026
**Status:** Approved for Implementation
**Authors:** CityOS Engineering Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Core CityOS Components (Built)](#3-core-cityos-components-built)
4. [Fleetbase Module Inventory](#4-fleetbase-module-inventory)
5. [Integration Strategy: Zero Vendor Modification](#5-integration-strategy-zero-vendor-modification)
6. [Detailed Design: NodeContext Propagation](#6-detailed-design-nodecontext-propagation)
7. [Detailed Design: Tenant Data Scoping](#7-detailed-design-tenant-data-scoping)
8. [Detailed Design: Governance Enforcement](#8-detailed-design-governance-enforcement)
9. [Detailed Design: Cross-Module Event Bridge](#9-detailed-design-cross-module-event-bridge)
10. [Database Schema Additions](#10-database-schema-additions)
11. [Implementation Phases](#11-implementation-phases)
12. [Configuration Reference](#12-configuration-reference)
13. [API Contract: Headers & Request Format](#13-api-contract-headers--request-format)
14. [Graceful Degradation & Backward Compatibility](#14-graceful-degradation--backward-compatibility)
15. [Testing Strategy](#15-testing-strategy)
16. [Deployment & Rollback Procedures](#16-deployment--rollback-procedures)
17. [Glossary](#17-glossary)

---

## 1. Executive Summary

### Problem Statement

Fleetbase provides modular logistics engines (FleetOps, Pallet WMS, Storefront) that scope data using a flat, single-level `company_uuid` session value. This does not support:

- Multi-tier franchise hierarchies (Master > Global > Regional > Country > City)
- Geographic data isolation by country, city, sector, or category
- Cascading governance policies (data residency, classification, compliance)
- Regulatory enforcement scoped by jurisdiction
- Cross-module operational context (which tenant, in which city, under which rules)

### Solution

CityOS extends (not replaces) Fleetbase's existing Company-based isolation by adding a **NodeContext** layer — a 15-dimension request envelope that carries geographic, operational, and regulatory context. This context is injected into all Fleetbase modules through Laravel extension points **without modifying any vendor source code**.

### Key Design Principle

```
Company  = WHO is operating    (authentication / identity)
Tenant   = WHERE they operate  (geography / hierarchy / governance)
NodeContext = WHAT context applies (per-request operational dimensions)
```

All three coexist. Company handles auth. Tenant handles hierarchy. NodeContext carries per-request state.

---

## 2. System Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        HTTP Request                                  │
│   Headers: X-CityOS-Tenant, X-CityOS-Country, X-CityOS-City, ...  │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 Laravel Middleware Pipeline                           │
│                                                                      │
│  ┌─────────────────────┐  ┌──────────────────────┐                  │
│  │ SetupFleetbaseSession│  │ AuthorizationGuard   │  (Core)         │
│  │ session('company')   │  │ session('user')      │                  │
│  └─────────────────────┘  └──────────────────────┘                  │
│                                                                      │
│  ┌─────────────────────┐  ┌──────────────────────┐  ┌────────────┐ │
│  │ ResolveNodeContext  │  │ EnforceDataResidency │  │ EnforceData│ │
│  │ (CityOS - injected) │  │ (CityOS - injected)  │  │ Classific. │ │
│  └─────────────────────┘  └──────────────────────┘  └────────────┘ │
│                                                                      │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   FleetOps   │  │    Pallet    │  │  Storefront  │
│              │  │              │  │              │
│ Order        │  │ Warehouse    │  │ Store        │
│ Driver       │  │ Inventory    │  │ Product      │
│ Vehicle      │  │ Product      │  │ Checkout     │
│ Fleet        │  │ Stock        │  │ Cart         │
│ Place        │  │ PO/SO        │  │ Catalog      │
│              │  │              │  │              │
│ [Global      │  │ [Global      │  │ [Global      │
│  Scopes]     │  │  Scopes]     │  │  Scopes]     │
│ [Observers]  │  │ [Observers]  │  │ [Observers]  │
└──────────────┘  └──────────────┘  └──────────────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           ▼
                ┌─────────────────────┐
                │   CityOS Outbox     │
                │   (CityBus Events)  │
                │        │            │
                │   ┌────┼────┐       │
                │   ▼    ▼    ▼       │
                │ Temporal CMS ERPNext│
                └─────────────────────┘
```

### Component Relationship Map

```
┌─────────────────────────────────────────────────────────┐
│                    CityOS Package                        │
│              api/packages/cityos/src/                    │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Providers/CityOSServiceProvider.php              │    │
│  │                                                   │    │
│  │  Registers:                                       │    │
│  │  ├── Middleware → fleetbase.protected group       │    │
│  │  ├── Middleware → storefront.api group            │    │
│  │  ├── Observers  → FleetOps/Pallet/Storefront     │    │
│  │  ├── Scopes     → Global query filters            │    │
│  │  └── Listeners  → Event bridges                   │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────┐ │
│  │  Middleware   │  │   Observers   │  │    Scopes    │ │
│  │              │  │               │  │              │ │
│  │ Resolve      │  │ FleetOps      │  │ NodeContext  │ │
│  │ NodeContext  │  │ NodeContext    │  │ Scope        │ │
│  │              │  │ Observer      │  │              │ │
│  │ Enforce      │  │               │  │ ScopeReg-    │ │
│  │ DataResidency│  │ Pallet        │  │ istrar       │ │
│  │              │  │ NodeContext    │  │              │ │
│  │ Enforce      │  │ Observer      │  └──────────────┘ │
│  │ DataClassif. │  │               │                    │
│  │              │  │ Storefront    │  ┌──────────────┐ │
│  │ Enforce      │  │ NodeContext    │  │  Listeners   │ │
│  │ FeatureGate  │  │ Observer      │  │              │ │
│  └──────────────┘  │               │  │ FleetOps     │ │
│                    │ Outbox        │  │ EventBridge  │ │
│  ┌──────────────┐  │ Logging       │  │              │ │
│  │   Support    │  │ Observer      │  │ Pallet       │ │
│  │              │  └───────────────┘  │ EventBridge  │ │
│  │ NodeContext  │                     │              │ │
│  │ Governance   │  ┌───────────────┐  │ Storefront   │ │
│  │ ChainBuilder │  │   Services    │  │ EventBridge  │ │
│  │ PolicyMerger │  │               │  └──────────────┘ │
│  └──────────────┘  │ FeatureGate   │                    │
│                    │ Compliance    │  ┌──────────────┐ │
│  ┌──────────────┐  │ CityBus       │  │  Migrations  │ │
│  │   Models     │  │ Temporal      │  │              │ │
│  │              │  │ CMS           │  │ add_node_ctx │ │
│  │ Tenant       │  │ ERPNext       │  │ _to_fleetops │ │
│  │ Node         │  └───────────────┘  │ _to_pallet   │ │
│  │ Region       │                     │ _to_store    │ │
│  │ Country      │                     └──────────────┘ │
│  │ City         │                                       │
│  │ Sector       │                                       │
│  │ Policy       │                                       │
│  │ FeatureFlag  │                                       │
│  │ OutboxEvent  │                                       │
│  └──────────────┘                                       │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Core CityOS Components (Built)

### 3.1 NodeContext (15 Dimensions)

**File:** `api/packages/cityos/src/Support/NodeContext.php`

The NodeContext is a value object that carries per-request operational context. It is constructed from HTTP headers, cookies, route parameters, or request body.

| Dimension | Type | Source Header | Default | Purpose |
|---|---|---|---|---|
| `nodeId` | UUID | `X-CityOS-Node-Id` | Auto-generated | Unique request node identifier |
| `correlationId` | UUID | `X-CityOS-Correlation-Id` | Auto-generated | Distributed tracing correlation |
| `contractVersion` | semver | `X-CityOS-Contract-Version` | `1.0.0` | API contract versioning |
| `country` | ISO code | `X-CityOS-Country` | `''` | Operating country |
| `cityOrTheme` | slug | `X-CityOS-City` | `''` | Operating city or theme |
| `sector` | slug | `X-CityOS-Sector` | `''` | Business sector (food, logistics) |
| `category` | slug | `X-CityOS-Category` | `''` | Category within sector |
| `subcategory` | slug | `X-CityOS-Subcategory` | `''` | Sub-category |
| `tenant` | handle/UUID | `X-CityOS-Tenant` | `''` | Operating tenant identifier |
| `channel` | string | `X-CityOS-Channel` | `api` | Distribution channel |
| `surface` | string | `X-CityOS-Surface` | `ops-dashboard` | UI surface type |
| `persona` | string | `X-CityOS-Persona` | `admin` | User persona |
| `brand` | string | `X-CityOS-Brand` | `''` | Brand context |
| `locale` | BCP47 | `X-CityOS-Locale` | `ar-SA` | Language/locale |
| `processingRegion` | AWS region | `X-CityOS-ProcessingRegion` | `me-central-1` | Data processing region |
| `residencyClass` | enum | `X-CityOS-ResidencyClass` | `sovereign` | Data sovereignty level |

**Resolution Priority Order:**
1. HTTP Header (`X-CityOS-{Field}`)
2. Route Parameter
3. Cookie (`cityos_{field}`)
4. Request Body (`node_context.{field}`)

**Tenant Auto-Enrichment:** When a tenant is resolved, any empty NodeContext dimensions are automatically populated from the tenant's geographic linkage (country, city, sector, category, locale, processing region, residency class).

### 3.2 Tenant Hierarchy (5-Tier)

**File:** `api/packages/cityos/src/Models/Tenant.php`

```
MASTER          ← Master franchisor (e.g., Dakkah Global)
  └─ GLOBAL     ← Global operations hub
       └─ REGIONAL   ← Regional operator (e.g., GCC Region)
            └─ COUNTRY    ← Country operator (e.g., Saudi Arabia)
                 └─ CITY       ← City operator (e.g., Riyadh)
```

**Key Properties:**

| Field | Type | Purpose |
|---|---|---|
| `company_uuid` | FK → companies | Links to Fleetbase Company for auth |
| `parent_tenant_uuid` | FK → self | Self-referential tree structure |
| `tenant_tier` | enum | MASTER, GLOBAL, REGIONAL, COUNTRY, CITY |
| `country_uuid` | FK → cityos_countries | Geographic anchoring |
| `city_uuid` | FK → cityos_cities | City-level anchoring |
| `sector_uuid` | FK → cityos_sectors | Business sector |
| `category_uuid` | FK → cityos_categories | Operational category |
| `region_uuid` | FK → cityos_regions | Regulatory region |
| `residency_zone` | string | Data residency zone (GCC, EU, MENA) |
| `data_classification_default` | enum | PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED |
| `handle` | string | Human-readable unique identifier |
| `feature_flags` | JSON | Tenant-specific feature overrides |

**Key Methods:**
- `getAncestryChain()` — Returns ordered array of handles from root to current tenant
- `getAncestryTenants()` — Returns ordered array of Tenant models from root to current
- `getNodeContext()` — Generates a NodeContext array from tenant's geographic linkage
- `isMaster()` / `isGlobal()` — Tier checking helpers

### 3.3 Node Hierarchy (9-Level)

**File:** `api/packages/cityos/src/Models/Node.php`

```
GLOBAL → CONTINENT → REGION → COUNTRY → CITY → DISTRICT → ZONE → FACILITY → ASSET
```

**Stewardship States:** Nodes support a state machine for ownership claims:
```
unclaimed → claim-pending → claimed → disputed → reverted
                ↑                                    │
                └────────────────────────────────────┘
```

**Parent Type Validation:** Each node type has a constrained set of valid parent types. For example, a FACILITY can be parented by ZONE, DISTRICT, or CITY, but not by REGION or COUNTRY. This is enforced via `validateParentType()`.

### 3.4 Governance Chain

**File:** `api/packages/cityos/src/Support/GovernanceChainBuilder.php`

The governance chain resolves cascading policies for a given tenant and country:

```
Region Policies (e.g., GCC data sovereignty)
    ↓  merge
Country Policies (e.g., Saudi PDPL requirements)
    ↓  merge
Authority Mandates (e.g., CITC, NDMO, TGA regulations)
    ↓  merge
Tenant Overrides (e.g., tenant-specific restrictions)
    ↓
Effective Policies (most restrictive wins)
```

**Policy Merger Rules (file: `Support/PolicyMerger.php`):**

| Policy Type | Merge Rule | Example |
|---|---|---|
| `dataResidency.allowedRegions` | Intersection (narrowest) | GCC says [me-central-1, me-south-1], SA says [me-central-1] → Result: [me-central-1] |
| `dataResidency.crossBorderTransfer` | AND (both must allow) | Region allows, Country forbids → Result: false |
| `dataResidency.encryptionRequired` | OR (either requires) | Region requires, Country doesn't → Result: true |
| `compliance.frameworks` | Union (all apply) | Region: [GDPR], Country: [PDPL] → Result: [GDPR, PDPL] |
| `compliance.auditRequired` | OR (either requires) | Any level requires → Result: true |
| `compliance.retentionPeriod` | Longest wins | 3y vs 7y → Result: 7y |
| `classification.defaultLevel` | Highest (most restrictive) | INTERNAL vs CONFIDENTIAL → Result: CONFIDENTIAL |
| `operational.rateLimitPerMinute` | Minimum (most restrictive) | 1000 vs 500 → Result: 500 |

### 3.5 Existing Middleware (3 Built)

#### ResolveNodeContext

**File:** `api/packages/cityos/src/Http/Middleware/ResolveNodeContext.php`

- Extracts NodeContext from request headers/cookies/body
- Resolves tenant by handle or UUID
- Auto-enriches empty dimensions from resolved tenant
- Sets `$request->attributes->set('node_context', $nodeContext)`
- Adds response headers: `X-CityOS-Tenant`, `X-CityOS-Country`, `X-CityOS-Locale`

#### EnforceDataResidency

**File:** `api/packages/cityos/src/Http/Middleware/EnforceDataResidency.php`

- Reads tenant from `X-CityOS-Tenant-Id` header
- Builds governance chain via `GovernanceChainBuilder`
- Checks `X-CityOS-Processing-Region` against `allowedRegions`
- Returns 403 if processing region is not in allowed list
- Adds response headers: `X-Data-Residency-Zone`, `X-Data-Encryption-Required`

#### EnforceDataClassification

**File:** `api/packages/cityos/src/Http/Middleware/EnforceDataClassification.php`

- Reads tenant from `X-CityOS-Tenant-Id` header
- Resolves operation type from HTTP method (POST→create, PUT/PATCH→update, DELETE→delete, GET→read)
- Runs compliance check via `ComplianceCheckService`
- Blocks critical violations on create/update/export operations (403)
- Adds response headers: `X-CityOS-Classification`, `X-CityOS-Residency-Zone`

### 3.6 Services (Built)

| Service | File | Purpose |
|---|---|---|
| **FeatureGateService** | `Services/FeatureGateService.php` | Evaluates feature flags per tenant tier, node type, and user roles. In-memory cache per request. |
| **ComplianceCheckService** | `Services/ComplianceCheckService.php` | Checks tenant compliance (residency, encryption, classification level, audit requirements). Returns violation arrays with severity levels. |
| **GovernanceChainBuilder** | `Support/GovernanceChainBuilder.php` | Builds cascading policy stack from Region → Country → Authorities → Tenant. |
| **PolicyMerger** | `Support/PolicyMerger.php` | Merges policy stack with "most restrictive wins" logic. Returns effective policies + trace. |
| **CityBusService** | `Services/CityBusService.php` | Event bus with outbox pattern. Publishes events, routes to Temporal/CMS/ERPNext. Supports transactional publish. |
| **TemporalService** | `Services/TemporalService.php` | Native gRPC client for Temporal Cloud. Start/describe/signal/terminate workflows. |
| **PayloadCMSService** | `Services/PayloadCMSService.php` | Integration with Payload CMS for content management. |
| **ERPNextService** | `Services/ERPNextService.php` | Integration with ERPNext for settlement, COD, penalties. |
| **TemporalCliBridge** | `Services/TemporalCliBridge.php` | CLI subprocess bridge for gRPC calls from web context (avoids segfault). |

### 3.7 CityOS Database Tables

| Table | Model | Purpose |
|---|---|---|
| `cityos_tenants` | Tenant | 5-tier tenant hierarchy with geographic anchoring |
| `cityos_nodes` | Node | 9-level physical/logical node tree with stewardship |
| `cityos_countries` | Country | Country records with CMS links, settings, policies |
| `cityos_cities` | City | City records with CMS links |
| `cityos_sectors` | Sector | Business sector definitions |
| `cityos_categories` | Category | Category definitions within sectors |
| `cityos_channels` | Channel | Distribution channels per tenant |
| `cityos_surfaces` | Surface | UI surface types per channel |
| `cityos_portals` | Portal | Portal definitions per surface |
| `cityos_regions` | Region | Regulatory regions (GCC, EU, MENA, etc.) |
| `cityos_governance_authorities` | GovernanceAuthority | Regulatory bodies per country |
| `cityos_policies` | Policy | Governance policies with scope and priority |
| `cityos_feature_flags` | FeatureFlag | Feature flags with tier/node/role conditions |
| `cityos_outbox` | OutboxEvent | Event outbox for transactional publishing |
| `cityos_integration_logs` | IntegrationLog | Cross-system integration audit trail |
| `cityos_workflow_registry` | — | Temporal workflow type registry |

---

## 4. Fleetbase Module Inventory

### 4.1 Core API (`vendor/fleetbase/core-api`)

**Scoping mechanism:** `session('company')` set by `SetupFleetbaseSession` middleware via `Auth::setSession()`.

**Key models (47 total):** Company, User, File, Category, Permission, Role, Setting, ApiCredential, ChatChannel, Dashboard, Report, Schedule, Transaction, WebhookEndpoint

**Middleware group:** Defines `fleetbase.protected` (used by all internal routes) and `fleetbase.api` (used by public API routes).

**Extension points:**
- `$middleware` array in `CoreServiceProvider` — used by `registerMiddleware()`
- `$observers` array — used by `registerObservers()`
- `pushMiddlewareToGroup()` — any child provider can add middleware to existing groups

### 4.2 FleetOps API (`vendor/fleetbase/fleetops-api`)

**Scoping mechanism:** `session('company')` + `company_uuid` in fillable arrays.

**Key models (42 total):**

| Priority | Model | company_uuid | Used For |
|---|---|---|---|
| Critical | Order | Yes | Delivery orders — primary transactional entity |
| Critical | Driver | Yes | Driver profiles and assignments |
| Critical | Vehicle | Yes | Vehicle fleet management |
| High | Fleet | Yes | Fleet groupings |
| High | Place | Yes | Addresses and locations |
| High | Contact | Yes | Customer/vendor contacts |
| Medium | Payload | Yes | Order payloads and items |
| Medium | ServiceArea | Yes | Service coverage zones |
| Medium | Zone | Yes | Geographic zones within service areas |
| Medium | Route | Yes | Delivery routes |
| Low | TrackingNumber | Yes | Shipment tracking |
| Low | Entity | Yes | Generic entity records |

**Observers registered:** Order, Payload, Place, ServiceRate, PurchaseRate, ServiceArea, TrackingNumber, Driver, Vehicle, Fleet, Contact, User, Company, CompanyUser, Category

**Routes:** 521 lines, using `fleetbase.protected` and `fleetbase.api` middleware groups.

### 4.3 Pallet API (Warehouse Management) (`vendor/fleetbase/pallet-api` + `packages/pallet-api`)

**Scoping mechanism:** `session('company')` directly in controllers (not in model scopes).

**Key models (15 total):**

| Priority | Model | company_uuid | Used For |
|---|---|---|---|
| Critical | Warehouse | Yes | Physical warehouse locations |
| Critical | Inventory | Yes | Stock levels per product/location |
| High | Product | Yes | Warehouse products |
| High | StockTransaction | Yes | Stock movements (in/out/transfer) |
| Medium | PurchaseOrder | Yes | Inbound purchase orders |
| Medium | SalesOrder | Yes | Outbound sales orders |
| Medium | Batch | Yes | Product batches with expiry |
| Low | WarehouseAisle | Yes | Warehouse aisle layout |
| Low | WarehouseRack | Yes | Rack positions |
| Low | WarehouseBin | Yes | Individual bin locations |
| Low | WarehouseSection | Yes | Warehouse sections |
| Low | WarehouseDock | Yes | Loading dock positions |
| Low | Supplier | Yes | Supplier records |
| Low | StockAdjustment | Yes | Manual stock corrections |
| Low | Audit | Yes | Warehouse audit records |

**Special note:** Pallet uses `session('company')` in controller methods (e.g., `InventoryController`, `WarehouseController`) rather than model-level scopes. Global scopes will handle reads; observers will handle writes. The controller-level `session('company')` calls will continue to work alongside CityOS scoping.

### 4.4 Storefront API (`vendor/fleetbase/storefront-api`)

**Scoping mechanism:** `company_uuid` in models + own `storefront.api` middleware group with `SetStorefrontSession`.

**Key models (28 total):**

| Priority | Model | company_uuid | Used For |
|---|---|---|---|
| Critical | Store | Yes | Storefront/shop definitions |
| Critical | Product | Yes | Product listings |
| High | Checkout | Yes | Purchase checkout sessions |
| High | Cart | Yes | Shopping carts |
| Medium | Catalog | Yes | Product catalogs |
| Medium | CatalogProduct | Yes | Catalog-product associations |
| Medium | Gateway | Yes | Payment gateways |
| Low | Network | Yes | Store networks/marketplaces |
| Low | Review | Yes | Product reviews |
| Low | Customer | Yes | Customer profiles |

**Observers registered:** Product, Network, Catalog, FoodTruck, Company

**Special note:** Storefront has its own middleware group (`storefront.api`) separate from `fleetbase.protected`. CityOS middleware must be injected into BOTH groups.

### 4.5 Registry Bridge (`vendor/fleetbase/registry-bridge`)

**Purpose:** Extension marketplace/registry. Lower priority for NodeContext integration as it manages system-level extension metadata rather than operational data.

---

## 5. Integration Strategy: Zero Vendor Modification

### 5.1 Fundamental Constraint

All Fleetbase modules reside in `vendor/fleetbase/` and are installed via Composer. Any direct modifications to these files would be:
- Lost on `composer update`
- Impossible to merge with upstream changes
- Unmaintainable across environments

**Therefore: ALL CityOS cross-engine integration code lives exclusively in `api/packages/cityos/src/`.**

### 5.2 Laravel Extension Points Used

| Extension Point | Laravel API | What CityOS Does |
|---|---|---|
| **Middleware Injection** | `$router->pushMiddlewareToGroup()` | Adds ResolveNodeContext, EnforceDataResidency, EnforceDataClassification to `fleetbase.protected` and `storefront.api` groups |
| **Model Observers** | `Model::observe()` via `$observers` array | Stamps tenant_uuid, country_code, city_uuid, sector_uuid on create/update for FleetOps, Pallet, Storefront models |
| **Global Query Scopes** | `Model::addGlobalScope()` | Filters queries by tenant_uuid when NodeContext is present |
| **Event Listeners** | `Event::listen()` | Bridges FleetOps/Pallet/Storefront events to CityBus outbox |
| **Service Container** | `$app->singleton()` | Registers CityOS services (already done) |
| **Config Merging** | `$this->mergeConfigFrom()` | Adds CityOS config namespace (already done) |
| **Migration Loading** | `$this->loadMigrationsFrom()` | Adds columns to vendor module tables via CityOS migrations (already done) |

### 5.3 Why This Works

The `CityOSServiceProvider` extends `CoreServiceProvider`, which provides the `registerMiddleware()`, `registerObservers()`, and boot lifecycle methods. Since all Fleetbase module service providers inherit from `CoreServiceProvider`, they all share the same middleware group registry and observer registration pattern.

When CityOS pushes middleware into `fleetbase.protected`, every module that uses that group (FleetOps, Pallet, Core) automatically receives the middleware. When CityOS registers observers on FleetOps models, the observers fire on every create/update — no FleetOps code changes needed.

---

## 6. Detailed Design: NodeContext Propagation

### 6.1 Middleware Injection (Phase 1)

**Modified file:** `api/packages/cityos/src/Providers/CityOSServiceProvider.php`

```php
// In CityOSServiceProvider::boot()
public function boot()
{
    $this->registerObservers();
    $this->loadRoutesFrom(__DIR__ . '/../routes.php');
    $this->loadMigrationsFrom(__DIR__ . '/../../migrations');

    // Phase 1: Inject CityOS middleware into all module middleware groups
    $router = $this->app['router'];

    // Inject into fleetbase.protected (FleetOps, Pallet, Core routes)
    $router->pushMiddlewareToGroup('fleetbase.protected',
        \Fleetbase\CityOS\Http\Middleware\ResolveNodeContext::class);
    $router->pushMiddlewareToGroup('fleetbase.protected',
        \Fleetbase\CityOS\Http\Middleware\EnforceDataResidency::class);
    $router->pushMiddlewareToGroup('fleetbase.protected',
        \Fleetbase\CityOS\Http\Middleware\EnforceDataClassification::class);

    // Inject into storefront.api (Storefront-specific routes)
    $router->pushMiddlewareToGroup('storefront.api',
        \Fleetbase\CityOS\Http\Middleware\ResolveNodeContext::class);
    $router->pushMiddlewareToGroup('storefront.api',
        \Fleetbase\CityOS\Http\Middleware\EnforceDataResidency::class);
    $router->pushMiddlewareToGroup('storefront.api',
        \Fleetbase\CityOS\Http\Middleware\EnforceDataClassification::class);

    // Phase 5: Feature gate middleware (when implemented)
    // $router->pushMiddlewareToGroup('fleetbase.protected',
    //     \Fleetbase\CityOS\Http\Middleware\EnforceFeatureGate::class);

    // Register global scopes and boot event bridges
    $this->registerNodeContextScopes();
    $this->registerEventBridges();

    // ... existing boot code
}
```

**Result:** After this change, EVERY request to FleetOps, Pallet, Storefront, and Core internal routes will have NodeContext resolved and available at `$request->attributes->get('node_context')`. No other code changes required. Modules that don't use it are unaffected.

### 6.2 Request Flow After Integration

```
1. Request arrives with headers: X-CityOS-Tenant: riyadh-ops, X-CityOS-Country: SA
2. SetupFleetbaseSession runs → sets session('company') = company_uuid (existing)
3. AuthorizationGuard runs → validates user permissions (existing)
4. ResolveNodeContext runs → creates NodeContext object, resolves Tenant 'riyadh-ops'
   → Auto-enriches: country=SA, city=riyadh, sector=logistics, locale=ar-SA
   → Sets $request->attributes->set('node_context', $nodeContext)
5. EnforceDataResidency runs → checks processing region against GCC rules
6. EnforceDataClassification runs → checks compliance for operation type
7. Request reaches controller (FleetOps, Pallet, Storefront — unchanged)
8. Global scope filters query by tenant_uuid (if present)
9. Observer stamps tenant_uuid on created/updated records
10. Response includes X-CityOS-* headers
```

---

## 7. Detailed Design: Tenant Data Scoping

### 7.1 Model Observers (Phase 3) — Stamp on Write

**New file:** `api/packages/cityos/src/Observers/NodeContextStampObserver.php`

A single reusable observer class that stamps NodeContext dimensions onto any model that has the appropriate columns:

```php
class NodeContextStampObserver
{
    public function creating(Model $model): void
    {
        $nodeContext = request()?->attributes?->get('node_context');
        if (!$nodeContext || !$nodeContext instanceof NodeContext) {
            return; // Graceful degradation: no context, no stamp
        }

        $tenant = $nodeContext->resolveTenant();

        // Only stamp if the model has these columns AND they are not already set
        if ($model->isFillable('tenant_uuid') && empty($model->tenant_uuid) && $tenant) {
            $model->tenant_uuid = $tenant->uuid;
        }
        if ($model->isFillable('country_code') && empty($model->country_code) && $nodeContext->country) {
            $model->country_code = $nodeContext->country;
        }
        if ($model->isFillable('city_uuid') && empty($model->city_uuid) && $tenant?->city_uuid) {
            $model->city_uuid = $tenant->city_uuid;
        }
        if ($model->isFillable('sector_uuid') && empty($model->sector_uuid) && $tenant?->sector_uuid) {
            $model->sector_uuid = $tenant->sector_uuid;
        }
    }
}
```

**Registration in CityOSServiceProvider:**

```php
public $observers = [
    // FleetOps models
    \Fleetbase\FleetOps\Models\Order::class    => \Fleetbase\CityOS\Observers\NodeContextStampObserver::class,
    \Fleetbase\FleetOps\Models\Driver::class   => \Fleetbase\CityOS\Observers\NodeContextStampObserver::class,
    \Fleetbase\FleetOps\Models\Vehicle::class  => \Fleetbase\CityOS\Observers\NodeContextStampObserver::class,
    \Fleetbase\FleetOps\Models\Fleet::class    => \Fleetbase\CityOS\Observers\NodeContextStampObserver::class,
    \Fleetbase\FleetOps\Models\Place::class    => \Fleetbase\CityOS\Observers\NodeContextStampObserver::class,

    // Pallet models
    \Fleetbase\Pallet\Models\Warehouse::class  => \Fleetbase\CityOS\Observers\NodeContextStampObserver::class,
    \Fleetbase\Pallet\Models\Inventory::class  => \Fleetbase\CityOS\Observers\NodeContextStampObserver::class,
    \Fleetbase\Pallet\Models\Product::class    => \Fleetbase\CityOS\Observers\NodeContextStampObserver::class,

    // Storefront models
    \Fleetbase\Storefront\Models\Store::class    => \Fleetbase\CityOS\Observers\NodeContextStampObserver::class,
    \Fleetbase\Storefront\Models\Product::class  => \Fleetbase\CityOS\Observers\NodeContextStampObserver::class,
    \Fleetbase\Storefront\Models\Checkout::class => \Fleetbase\CityOS\Observers\NodeContextStampObserver::class,
];
```

### 7.2 Global Query Scopes (Phase 4) — Filter on Read

**New file:** `api/packages/cityos/src/Scopes/NodeContextScope.php`

```php
class NodeContextScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $nodeContext = request()?->attributes?->get('node_context');
        if (!$nodeContext || !$nodeContext instanceof NodeContext) {
            return; // No context = no filtering (backward compatible)
        }

        $tenant = $nodeContext->resolveTenant();
        if (!$tenant) {
            return; // No resolved tenant = no filtering
        }

        // If the model table has tenant_uuid, filter by it
        if (Schema::hasColumn($model->getTable(), 'tenant_uuid')) {
            // Include records from this tenant AND its parent tenants (ancestry)
            $ancestorUuids = collect($tenant->getAncestryTenants())->pluck('uuid')->toArray();
            $builder->whereIn($model->qualifyColumn('tenant_uuid'), $ancestorUuids);
        }
        // Fallback: if no tenant_uuid column, scope by company_uuid
        elseif ($tenant->company_uuid && Schema::hasColumn($model->getTable(), 'company_uuid')) {
            $builder->where($model->qualifyColumn('company_uuid'), $tenant->company_uuid);
        }
    }
}
```

**Registration in CityOSServiceProvider:**

```php
protected function registerNodeContextScopes(): void
{
    $scopedModels = [
        // FleetOps
        \Fleetbase\FleetOps\Models\Order::class,
        \Fleetbase\FleetOps\Models\Driver::class,
        \Fleetbase\FleetOps\Models\Vehicle::class,
        \Fleetbase\FleetOps\Models\Fleet::class,
        \Fleetbase\FleetOps\Models\Place::class,

        // Pallet
        \Fleetbase\Pallet\Models\Warehouse::class,
        \Fleetbase\Pallet\Models\Inventory::class,
        \Fleetbase\Pallet\Models\Product::class,

        // Storefront
        \Fleetbase\Storefront\Models\Store::class,
        \Fleetbase\Storefront\Models\Product::class,
        \Fleetbase\Storefront\Models\Checkout::class,
    ];

    foreach ($scopedModels as $modelClass) {
        if (class_exists($modelClass)) {
            $modelClass::addGlobalScope(new NodeContextScope());
        }
    }
}
```

### 7.3 Scope Behavior Matrix

| Scenario | NodeContext Present? | Tenant Resolved? | tenant_uuid column? | Behavior |
|---|---|---|---|---|
| Legacy request (no headers) | No | — | — | No filter applied. Existing `session('company')` scoping works as before. |
| CityOS request, valid tenant | Yes | Yes | Yes | Filters by `tenant_uuid IN (ancestry chain)` |
| CityOS request, valid tenant | Yes | Yes | No (column not yet added) | Falls back to `company_uuid = tenant.company_uuid` |
| CityOS request, no tenant header | Yes | No | — | No additional filter. Existing scoping works as before. |
| CityOS request, invalid tenant | Yes | No (not found) | — | No additional filter. Logged as warning. |

### 7.4 Ancestry-Aware Scoping

A critical design decision: when a REGIONAL tenant queries Orders, they should see orders from ALL their child tenants (COUNTRY and CITY level), not just their own. The scope uses `getAncestryTenants()` to build the UUID list, but for **downward** visibility, the query includes:

- The tenant's own UUID
- All descendant tenant UUIDs (via recursive child query)

The direction of visibility depends on the operation:
- **Reads (GET):** Master/Regional tenants see data from their sub-tenants (downward visibility)
- **Writes (POST/PUT):** Data is stamped with the specific operating tenant, not the parent

---

## 8. Detailed Design: Governance Enforcement

### 8.1 Data Residency Enforcement

When `EnforceDataResidency` middleware is injected into `fleetbase.protected`, it applies to ALL module routes:

```
FleetOps: POST /api/v1/orders → Checks if order creation is allowed in this processing region
Pallet:   POST /api/v1/warehouses → Checks if warehouse can be created in this jurisdiction
Storefront: POST /api/v1/stores → Checks if store data can be stored in this region
```

**Enforcement rules (per governance chain):**

| Rule | Check | HTTP Response |
|---|---|---|
| Processing region not in `allowedRegions` | 403 Forbidden | `"Data residency violation: region X not allowed"` |
| Cross-border transfer disabled + export operation | 403 Forbidden | `"Cross-border data transfer not allowed for zone GCC"` |
| Encryption required | Response header warning | `X-Data-Encryption-Required: true` |

### 8.2 Data Classification Enforcement

When `EnforceDataClassification` middleware is injected, it checks compliance before write operations:

| HTTP Method | Operation | Critical violations block? |
|---|---|---|
| GET | `read` | No (read-only, logged) |
| POST | `create` | Yes — 403 if critical violation |
| PUT/PATCH | `update` | Yes — 403 if critical violation |
| DELETE | `delete` | Logged, not blocked (allow cleanup) |

**Classification levels (from lowest to highest):**
```
PUBLIC (0) < INTERNAL (1) < CONFIDENTIAL (2) < RESTRICTED (3) < TOP_SECRET (4)
```

A tenant with classification level INTERNAL cannot operate on data classified as CONFIDENTIAL or higher.

### 8.3 Feature Gate Enforcement (Phase 5)

**New file:** `api/packages/cityos/src/Http/Middleware/EnforceFeatureGate.php`

The feature gate middleware checks if a specific feature is enabled for the current tenant/context before allowing the operation:

| Feature Key | Controls | Example |
|---|---|---|
| `fleetops.cod_enabled` | Cash-on-delivery orders | Disabled in countries where COD is banned |
| `pallet.multi_warehouse` | Multiple warehouse support | Only for REGIONAL+ tier tenants |
| `storefront.marketplace` | Multi-store marketplace | Only for GLOBAL+ tier tenants |
| `fleetops.international_shipping` | Cross-border deliveries | Requires cross-border transfer policy |

---

## 9. Detailed Design: Cross-Module Event Bridge

### 9.1 Event Bridge Architecture

```
FleetOps Model Events          Pallet Model Events          Storefront Model Events
  (Order created,                (Warehouse created,          (Store created,
   Driver assigned)               Stock moved)                 Product listed)
       │                              │                              │
       ▼                              ▼                              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    CityOS Event Listeners                                 │
│                                                                          │
│  FleetOpsEventBridge    PalletEventBridge    StorefrontEventBridge       │
│                                                                          │
│  Enriches with NodeContext, publishes to CityBus                        │
└──────────────────────────────┬───────────────────────────────────────────┘
                               ▼
                    ┌─────────────────────┐
                    │   CityBusService    │
                    │                     │
                    │  OutboxEvent table  │
                    │  (transactional)    │
                    └─────────┬───────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
       ┌───────────┐  ┌───────────┐  ┌───────────┐
       │  Temporal  │  │  Payload  │  │  ERPNext  │
       │  Cloud     │  │  CMS      │  │           │
       │           │  │           │  │ Settlement│
       │ Workflows │  │ Content   │  │ COD       │
       │ Orchestr. │  │ Sync      │  │ Penalties │
       └───────────┘  └───────────┘  └───────────┘
```

### 9.2 Event-to-Workflow Mapping

| Source Module | Event Type | CityBus Event | Temporal Workflow | ERPNext Action |
|---|---|---|---|---|
| FleetOps | Order created | `DELIVERY_CREATED` | `DeliveryDispatchOrchestration` | — |
| FleetOps | Order dispatched | `DELIVERY_DISPATCHED` | `DeliveryTrackingWorkflow` | — |
| FleetOps | Order completed | `DELIVERY_COMPLETED` | — | `postDeliverySettlement` |
| FleetOps | Order failed | `DELIVERY_FAILED` | `DeliveryExceptionEscalation` | — |
| FleetOps | COD collected | `COD_COLLECTED` | — | `postCODCollection` |
| FleetOps | SLA breached | `SLA_PENALTY` | — | `postPenalty` |
| FleetOps | Driver registered | `PROVIDER_REGISTERED` | `ProviderOnboardingApproval` | — |
| Pallet | Stock moved | `STOCK_MOVEMENT` | `InventoryReconciliation` | — |
| Pallet | PO received | `PURCHASE_ORDER_RECEIVED` | — | `postPurchaseReceipt` |
| Storefront | Order placed | `STOREFRONT_ORDER` | `StorefrontFulfillment` | — |
| Storefront | Payment completed | `PAYMENT_COMPLETED` | — | `postPaymentReceipt` |

### 9.3 Outbox Event Envelope

Every event published through CityBus follows this envelope structure:

```json
{
    "event_id": "uuid",
    "event_type": "DELIVERY_CREATED",
    "version": "1.0",
    "timestamp": "2026-02-11T12:00:00Z",
    "source": {
        "system": "fleetbase",
        "service": "cityos-api"
    },
    "node_context": {
        "country": "SA",
        "cityOrTheme": "riyadh",
        "sector": "logistics",
        "tenant": "riyadh-ops",
        "channel": "api",
        "surface": "ops-dashboard",
        "locale": "ar-SA",
        "processingRegion": "me-central-1",
        "residencyClass": "sovereign"
    },
    "correlation": {
        "correlation_id": "uuid",
        "causation_id": "uuid"
    },
    "payload": { /* event-specific data */ },
    "metadata": {
        "retry_count": 0,
        "first_published": "2026-02-11T12:00:00Z",
        "idempotency_key": "optional"
    }
}
```

---

## 10. Database Schema Additions

### 10.1 Migration: Add NodeContext Columns to FleetOps Tables

**File:** `api/packages/cityos/migrations/2026_02_11_add_node_context_to_fleetops_tables.php`

```sql
-- orders table
ALTER TABLE orders ADD COLUMN tenant_uuid VARCHAR(191) NULL;
ALTER TABLE orders ADD COLUMN country_code VARCHAR(2) NULL;
ALTER TABLE orders ADD COLUMN city_uuid VARCHAR(191) NULL;
ALTER TABLE orders ADD COLUMN sector_uuid VARCHAR(191) NULL;
CREATE INDEX idx_orders_tenant_uuid ON orders(tenant_uuid);
CREATE INDEX idx_orders_country_code ON orders(country_code);

-- drivers table
ALTER TABLE drivers ADD COLUMN tenant_uuid VARCHAR(191) NULL;
ALTER TABLE drivers ADD COLUMN country_code VARCHAR(2) NULL;
ALTER TABLE drivers ADD COLUMN city_uuid VARCHAR(191) NULL;
ALTER TABLE drivers ADD COLUMN sector_uuid VARCHAR(191) NULL;
CREATE INDEX idx_drivers_tenant_uuid ON drivers(tenant_uuid);

-- vehicles table
ALTER TABLE vehicles ADD COLUMN tenant_uuid VARCHAR(191) NULL;
ALTER TABLE vehicles ADD COLUMN country_code VARCHAR(2) NULL;
CREATE INDEX idx_vehicles_tenant_uuid ON vehicles(tenant_uuid);

-- fleets table
ALTER TABLE fleets ADD COLUMN tenant_uuid VARCHAR(191) NULL;
ALTER TABLE fleets ADD COLUMN country_code VARCHAR(2) NULL;
CREATE INDEX idx_fleets_tenant_uuid ON fleets(tenant_uuid);

-- places table
ALTER TABLE places ADD COLUMN tenant_uuid VARCHAR(191) NULL;
ALTER TABLE places ADD COLUMN country_code VARCHAR(2) NULL;
CREATE INDEX idx_places_tenant_uuid ON places(tenant_uuid);

-- service_areas table
ALTER TABLE service_areas ADD COLUMN tenant_uuid VARCHAR(191) NULL;
ALTER TABLE service_areas ADD COLUMN country_code VARCHAR(2) NULL;
CREATE INDEX idx_service_areas_tenant_uuid ON service_areas(tenant_uuid);
```

### 10.2 Migration: Add NodeContext Columns to Pallet Tables

```sql
-- pallet_warehouses table
ALTER TABLE pallet_warehouses ADD COLUMN tenant_uuid VARCHAR(191) NULL;
ALTER TABLE pallet_warehouses ADD COLUMN country_code VARCHAR(2) NULL;
ALTER TABLE pallet_warehouses ADD COLUMN city_uuid VARCHAR(191) NULL;
ALTER TABLE pallet_warehouses ADD COLUMN sector_uuid VARCHAR(191) NULL;
CREATE INDEX idx_warehouses_tenant_uuid ON pallet_warehouses(tenant_uuid);

-- pallet_inventories table
ALTER TABLE pallet_inventories ADD COLUMN tenant_uuid VARCHAR(191) NULL;
ALTER TABLE pallet_inventories ADD COLUMN country_code VARCHAR(2) NULL;
CREATE INDEX idx_inventories_tenant_uuid ON pallet_inventories(tenant_uuid);

-- pallet_products table
ALTER TABLE pallet_products ADD COLUMN tenant_uuid VARCHAR(191) NULL;
ALTER TABLE pallet_products ADD COLUMN country_code VARCHAR(2) NULL;
CREATE INDEX idx_pallet_products_tenant_uuid ON pallet_products(tenant_uuid);

-- pallet_stock_transactions table (if exists)
ALTER TABLE pallet_stock_transactions ADD COLUMN tenant_uuid VARCHAR(191) NULL;
CREATE INDEX idx_stock_tx_tenant_uuid ON pallet_stock_transactions(tenant_uuid);
```

### 10.3 Migration: Add NodeContext Columns to Storefront Tables

```sql
-- storefront_stores table (actual table name varies — check schema)
ALTER TABLE stores ADD COLUMN tenant_uuid VARCHAR(191) NULL;
ALTER TABLE stores ADD COLUMN country_code VARCHAR(2) NULL;
ALTER TABLE stores ADD COLUMN city_uuid VARCHAR(191) NULL;
CREATE INDEX idx_stores_tenant_uuid ON stores(tenant_uuid);

-- storefront products (shares fleetbase products table)
-- May already have columns from FleetOps migration

-- storefront_checkouts table (actual table name varies)
ALTER TABLE checkouts ADD COLUMN tenant_uuid VARCHAR(191) NULL;
CREATE INDEX idx_checkouts_tenant_uuid ON checkouts(tenant_uuid);
```

**Important:** All columns are `NULL` — no existing data is affected. Indexes are added for query performance on the new columns.

---

## 11. Implementation Phases

### Phase 1: Middleware Injection (Foundation)

| Item | Details |
|---|---|
| **Goal** | Make NodeContext available on every request across all modules |
| **Files Modified** | 1: `Providers/CityOSServiceProvider.php` |
| **Files Created** | 0 |
| **Risk** | Very Low — additive only, graceful degradation built into existing middleware |
| **Testing** | Send request with `X-CityOS-Tenant` header to any FleetOps endpoint. Check response has `X-CityOS-Tenant` header. |
| **Rollback** | Remove 6 `pushMiddlewareToGroup()` lines |
| **Duration** | 1 day |

### Phase 2: Database Migrations

| Item | Details |
|---|---|
| **Goal** | Add nullable tenant/country/city/sector columns to key module tables |
| **Files Modified** | 0 |
| **Files Created** | 3 migration files |
| **Risk** | Low — all columns nullable, indexes are non-blocking |
| **Testing** | Run `php artisan migrate`. Verify columns exist. Verify existing queries still work. |
| **Rollback** | `php artisan migrate:rollback --step=3` |
| **Duration** | 1 day |
| **Prerequisite** | Verify actual table names in database before writing migrations |

### Phase 3: Model Observers (Stamp on Write)

| Item | Details |
|---|---|
| **Goal** | Auto-stamp tenant/country/city/sector on record creation |
| **Files Modified** | 1: `CityOSServiceProvider.php` (add observer registrations) |
| **Files Created** | 2: `Observers/NodeContextStampObserver.php`, `Observers/OutboxLoggingObserver.php` |
| **Risk** | Low — observer skips if no NodeContext present |
| **Testing** | Create Order with `X-CityOS-Tenant` header. Verify `tenant_uuid` populated. Create Order without header. Verify `tenant_uuid` is null. |
| **Rollback** | Remove observer registrations from `$observers` array |
| **Duration** | 2 days |
| **Prerequisite** | Phase 2 (columns must exist) |

### Phase 4: Global Query Scopes (Filter on Read)

| Item | Details |
|---|---|
| **Goal** | Auto-filter queries by tenant when NodeContext is present |
| **Files Modified** | 1: `CityOSServiceProvider.php` (add scope registration) |
| **Files Created** | 1: `Scopes/NodeContextScope.php` |
| **Risk** | Medium — incorrect scope could hide data. Requires thorough testing. |
| **Testing** | Query Orders with tenant header → only that tenant's orders. Query without header → all orders (existing behavior). Query as MASTER tenant → see all sub-tenant orders. |
| **Rollback** | Remove `registerNodeContextScopes()` call |
| **Duration** | 3 days (including test coverage) |
| **Prerequisite** | Phase 3 (records must have tenant_uuid populated) |

### Phase 5: Feature Gate Middleware

| Item | Details |
|---|---|
| **Goal** | Control feature availability per tenant/country/tier |
| **Files Modified** | 1: `CityOSServiceProvider.php` (add middleware push) |
| **Files Created** | 1: `Http/Middleware/EnforceFeatureGate.php` |
| **Risk** | Medium — blocking features could disrupt operations if flags misconfigured |
| **Testing** | Set feature flag `fleetops.cod_enabled = false` for tenant. Attempt COD order. Verify blocked. |
| **Rollback** | Remove middleware push line |
| **Duration** | 2 days |
| **Prerequisite** | Phase 1 (middleware injection) |

### Phase 6: Event Bridge

| Item | Details |
|---|---|
| **Goal** | Bridge module events to CityBus for Temporal workflows and ERPNext |
| **Files Modified** | 1: `CityOSServiceProvider.php` (add event listener registration) |
| **Files Created** | 3: Event bridge listeners (one per module) |
| **Risk** | Low — listeners are additive, failures are caught and logged |
| **Testing** | Create Order → verify OutboxEvent created with correct event_type and NodeContext. Trigger dispatch → verify Temporal workflow started. |
| **Rollback** | Remove event listener registrations |
| **Duration** | 3 days |
| **Prerequisite** | Phase 1 (NodeContext must be available) |

### Phase Summary

| Phase | New Files | Modified | Duration | Risk | Dependencies |
|---|---|---|---|---|---|
| 1 - Middleware | 0 | 1 | 1 day | Very Low | None |
| 2 - Migrations | 3 | 0 | 1 day | Low | None |
| 3 - Observers | 2 | 1 | 2 days | Low | Phase 2 |
| 4 - Scopes | 1 | 1 | 3 days | Medium | Phase 3 |
| 5 - Feature Gate | 1 | 1 | 2 days | Medium | Phase 1 |
| 6 - Event Bridge | 3 | 1 | 3 days | Low | Phase 1 |
| **Total** | **10** | **5** | **12 days** | | |

---

## 12. Configuration Reference

### CityOS Configuration File

**File:** `api/packages/cityos/config/cityos.php`

```php
return [
    'api' => [
        'routing' => [
            'prefix' => 'cityos',           // API route prefix
            'internal_prefix' => 'int',      // Internal route prefix
        ],
    ],

    'node_context' => [
        'header_prefix' => 'X-CityOS-',          // HTTP header prefix
        'cookie_prefix' => 'cityos_',             // Cookie prefix
        'required_fields' => ['country', 'tenant'], // Required for isValid()
        'default_locale' => 'ar-SA',               // Default locale
        'default_processing_region' => 'me-central-1', // Default AWS region
        'default_residency_class' => 'sovereign',  // Default sovereignty level
    ],

    'temporal' => [
        'address' => env('TEMPORAL_ADDRESS', ''),
        'namespace' => env('TEMPORAL_NAMESPACE', ''),
        'api_key' => env('TEMPORAL_API_KEY', ''),
        'task_queue' => env('TEMPORAL_TASK_QUEUE', 'cityos-default'),
    ],

    'cms' => [
        'base_url' => env('CITYOS_CMS_BASE_URL', ''),
        'api_key' => env('CITYOS_CMS_API_KEY', ''),
    ],

    'erpnext' => [
        'base_url' => env('ERPNEXT_BASE_URL', ''),
        'api_key' => env('ERPNEXT_API_KEY', ''),
        'api_secret' => env('ERPNEXT_API_SECRET', ''),
    ],

    // Cross-engine integration config (Phase 4+)
    'scoping' => [
        'enabled' => env('CITYOS_SCOPING_ENABLED', true),
        'fallback_to_company' => true,  // Use company_uuid when tenant_uuid missing
        'ancestry_visibility' => true,  // Parent tenants can see child data
    ],

    'feature_gates' => [
        'enabled' => env('CITYOS_FEATURE_GATES_ENABLED', false),
        'strict_mode' => false, // true = block on unknown features
    ],

    'event_bridge' => [
        'enabled' => env('CITYOS_EVENT_BRIDGE_ENABLED', false),
        'modules' => ['fleetops', 'pallet', 'storefront'],
    ],
];
```

### Environment Variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `TEMPORAL_ADDRESS` | For Temporal | `''` | Temporal Cloud gRPC endpoint |
| `TEMPORAL_NAMESPACE` | For Temporal | `''` | Temporal namespace |
| `TEMPORAL_API_KEY` | For Temporal | `''` | Temporal authentication |
| `CITYOS_CMS_BASE_URL` | For CMS | `''` | Payload CMS API URL |
| `CITYOS_CMS_API_KEY` | For CMS | `''` | Payload CMS API key |
| `ERPNEXT_BASE_URL` | For ERPNext | `''` | ERPNext API URL |
| `ERPNEXT_API_KEY` | For ERPNext | `''` | ERPNext API key |
| `ERPNEXT_API_SECRET` | For ERPNext | `''` | ERPNext API secret |
| `CITYOS_SCOPING_ENABLED` | No | `true` | Enable/disable tenant scoping |
| `CITYOS_FEATURE_GATES_ENABLED` | No | `false` | Enable/disable feature gates |
| `CITYOS_EVENT_BRIDGE_ENABLED` | No | `false` | Enable/disable event bridges |

---

## 13. API Contract: Headers & Request Format

### Request Headers

All CityOS context is transmitted via HTTP headers. Frontend applications (Ember.js console) set these headers on every API call based on the user's selected operational context.

| Header | Type | Required | Example | Purpose |
|---|---|---|---|---|
| `X-CityOS-Tenant` | string | Yes* | `riyadh-ops` | Tenant handle or UUID |
| `X-CityOS-Country` | ISO 3166-1 | Yes* | `SA` | Country code |
| `X-CityOS-City` | slug | No | `riyadh` | City identifier |
| `X-CityOS-Sector` | slug | No | `logistics` | Business sector |
| `X-CityOS-Category` | slug | No | `last-mile` | Category |
| `X-CityOS-Subcategory` | slug | No | `express` | Sub-category |
| `X-CityOS-Channel` | string | No | `api` | Channel (api, sdk, webhook) |
| `X-CityOS-Surface` | string | No | `ops-dashboard` | UI surface |
| `X-CityOS-Persona` | string | No | `admin` | User persona |
| `X-CityOS-Brand` | string | No | `dakkah` | Brand context |
| `X-CityOS-Locale` | BCP47 | No | `ar-SA` | Language/locale |
| `X-CityOS-ProcessingRegion` | AWS region | No | `me-central-1` | Processing region |
| `X-CityOS-ResidencyClass` | enum | No | `sovereign` | Data sovereignty |
| `X-CityOS-Node-Id` | UUID | No | Auto | Request trace ID |
| `X-CityOS-Correlation-Id` | UUID | No | Auto | Distributed trace ID |
| `X-CityOS-Contract-Version` | semver | No | `1.0.0` | Contract version |

*Required for `isValid()` to return true. Operations proceed without them but NodeContext-dependent features (scoping, governance) won't activate.

### Response Headers

| Header | Type | When Present | Purpose |
|---|---|---|---|
| `X-CityOS-Tenant` | string | When tenant resolved | Confirms operating tenant |
| `X-CityOS-Country` | ISO | When tenant resolved | Confirms operating country |
| `X-CityOS-Locale` | BCP47 | When tenant resolved | Confirms locale |
| `X-Data-Residency-Zone` | string | When residency enforced | Active residency zone (GCC, EU) |
| `X-Data-Encryption-Required` | boolean | When encryption required | Whether response should be encrypted in transit |
| `X-CityOS-Classification` | enum | When classification enforced | Data classification level |
| `X-CityOS-Residency-Zone` | string | When classification enforced | Residency zone name |

### Alternative Context Sources

In addition to HTTP headers, NodeContext can be provided via:

1. **Cookies:** `cityos_tenant`, `cityos_country`, etc. (useful for browser sessions)
2. **Route Parameters:** Embedded in URL (e.g., `/api/v1/{tenant}/orders`)
3. **Request Body:** `{ "node_context": { "tenant": "riyadh-ops", "country": "SA" } }`

Priority: Header > Route > Cookie > Body

---

## 14. Graceful Degradation & Backward Compatibility

### Design Principle

**Every CityOS integration is additive and optional.** If CityOS headers are absent, the system behaves exactly as stock Fleetbase. This is critical for:

- Existing API consumers that don't send CityOS headers
- Development/testing environments without CityOS setup
- Gradual rollout across tenants and modules

### Degradation Matrix

| Component | CityOS Headers Present | CityOS Headers Absent |
|---|---|---|
| **ResolveNodeContext** | Creates full NodeContext, resolves tenant | Creates empty NodeContext, sets on request (harmless) |
| **EnforceDataResidency** | Checks processing region against governance | No tenant ID header → passes through immediately |
| **EnforceDataClassification** | Checks compliance, may block critical violations | No tenant ID header → passes through immediately |
| **NodeContextStampObserver** | Stamps tenant_uuid, country_code on records | No NodeContext → skips stamping, fields remain null |
| **NodeContextScope** | Filters queries by tenant ancestry | No NodeContext or no resolved tenant → no filter applied |
| **FeatureGateMiddleware** | Checks feature flags per tenant tier | No context → all features allowed |
| **EventBridge Listeners** | Enriches events with NodeContext | No context → events still published without context |

### Backward Compatibility Guarantees

1. **Existing API responses are unchanged** — no fields removed, no response structure changes
2. **Existing queries return same results** — global scopes only filter when NodeContext has resolved tenant
3. **Existing record creation succeeds** — observer stamps are additive (nullable columns)
4. **Existing middleware order preserved** — CityOS middleware is pushed to END of group
5. **No authentication changes** — `session('company')` continues to work as before

---

## 15. Testing Strategy

### Unit Tests

| Test Class | Tests | Purpose |
|---|---|---|
| `NodeContextTest` | fromRequest, toArray, isValid, resolveTenant, setResolvedTenant | Verify context extraction and validation |
| `PolicyMergerTest` | mergeDataResidency, mergeCompliance, mergeClassification, mergeOperational | Verify "most restrictive wins" logic |
| `GovernanceChainBuilderTest` | build with/without region/country/authorities/tenant | Verify cascading policy resolution |
| `ComplianceCheckServiceTest` | checkTenantCompliance for each violation type | Verify violation detection |
| `FeatureGateServiceTest` | isEnabled for various tier/node/role combinations | Verify flag evaluation |

### Integration Tests

| Test Scenario | Steps | Expected Result |
|---|---|---|
| **Middleware propagation** | 1. Send GET to FleetOps endpoint with X-CityOS headers. 2. Check response headers. | Response includes X-CityOS-Tenant, X-CityOS-Country |
| **Observer stamping** | 1. Create Order with X-CityOS-Tenant: riyadh-ops. 2. Read order from DB. | Order has tenant_uuid, country_code populated |
| **Scope filtering** | 1. Create 3 orders (2 for tenant-A, 1 for tenant-B). 2. Query with X-CityOS-Tenant: tenant-A. | Only 2 orders returned |
| **Governance blocking** | 1. Set up SA governance with allowedRegions: [me-central-1]. 2. Send request with X-CityOS-ProcessingRegion: us-east-1. | 403 Forbidden response |
| **Graceful degradation** | 1. Send GET to FleetOps endpoint WITHOUT any CityOS headers. | Normal response, no errors, no filtering |
| **Ancestry visibility** | 1. Create orders under CITY tenant. 2. Query as REGIONAL parent tenant. | Parent sees child tenant orders |

### Regression Tests

- All existing FleetOps, Pallet, Storefront API tests must pass without modification
- No new required headers on any existing endpoint
- No response format changes on any existing endpoint

---

## 16. Deployment & Rollback Procedures

### Pre-Deployment Checklist

- [ ] All 6 phases implemented and tested
- [ ] `CITYOS_SCOPING_ENABLED=false` in production config (start disabled)
- [ ] Database migrations reviewed for nullable columns
- [ ] Backup of production database taken
- [ ] Frontend updated to send CityOS headers (from NodeContext service)

### Deployment Steps

1. **Deploy code** — All changes are in `api/packages/cityos/src/`
2. **Run migrations** — `php artisan migrate` (adds nullable columns)
3. **Verify middleware** — Check that CityOS middleware appears in route middleware list
4. **Enable scoping** — Set `CITYOS_SCOPING_ENABLED=true`
5. **Monitor** — Watch for 403 errors from governance middleware (may indicate misconfigured policies)
6. **Enable feature gates** — Set `CITYOS_FEATURE_GATES_ENABLED=true` (when ready)
7. **Enable event bridge** — Set `CITYOS_EVENT_BRIDGE_ENABLED=true` (when ready)

### Rollback Procedures

**Level 1 — Disable features (no code change):**
```bash
# Disable scoping
CITYOS_SCOPING_ENABLED=false

# Disable feature gates
CITYOS_FEATURE_GATES_ENABLED=false

# Disable event bridge
CITYOS_EVENT_BRIDGE_ENABLED=false
```

**Level 2 — Remove middleware injection (code change):**
Remove the `pushMiddlewareToGroup()` calls from `CityOSServiceProvider::boot()`. All modules revert to stock behavior immediately.

**Level 3 — Rollback migrations (schema change):**
```bash
php artisan migrate:rollback --step=3
```
This removes the added columns. Any data stamped in those columns is lost.

**Level 4 — Full rollback (package removal):**
Remove `packages/cityos` from `composer.json`. This removes all CityOS functionality. Not recommended unless critical failure.

### Rollback Impact Matrix

| Rollback Level | Data Loss | Downtime | Recovery |
|---|---|---|---|
| Level 1 (env vars) | None | None | Immediate |
| Level 2 (middleware) | None | Seconds | Deploy + restart |
| Level 3 (migrations) | Stamped tenant data | Minutes | Migration rollback |
| Level 4 (package) | All CityOS data | Minutes | Composer + migrate |

---

## 17. Glossary

| Term | Definition |
|---|---|
| **Company** | Fleetbase's built-in organization entity. Handles authentication, user membership, API keys, billing. One company = one login context. |
| **Tenant** | CityOS operational context entity. Links to a Company but adds geographic anchoring, hierarchy tier, and governance context. One company can have multiple tenants. |
| **NodeContext** | A 15-dimension value object carried per-request. Contains geographic, operational, and regulatory context for the current operation. |
| **Node** | A physical or logical entity in the 9-level CityOS hierarchy (GLOBAL → ASSET). Represents countries, cities, districts, zones, facilities, and assets. |
| **Governance Chain** | The cascading sequence of policies that apply to a tenant: Region → Country → Authorities → Tenant. |
| **PolicyMerger** | The service that combines multiple governance policies using "most restrictive wins" logic. |
| **Stewardship** | The ownership model for Nodes. A tenant can claim stewardship of a node through a state machine (unclaimed → claimed). |
| **CityBus** | The event bus service that publishes domain events to an outbox table and routes them to Temporal, CMS, and ERPNext. |
| **Outbox Pattern** | A transactional event publishing pattern where events are written to a database table in the same transaction as the business operation, then dispatched asynchronously. |
| **Feature Gate** | A mechanism to enable/disable features per tenant tier, node type, or user role. |
| **Data Residency** | Rules governing where data can be stored and processed, based on geographic jurisdiction (e.g., Saudi data must stay in GCC regions). |
| **Data Classification** | Security labeling system: PUBLIC < INTERNAL < CONFIDENTIAL < RESTRICTED < TOP_SECRET. |
| **Global Query Scope** | A Laravel feature that automatically applies WHERE clauses to all queries on a model, without modifying the model's source code. |
| **Model Observer** | A Laravel feature that hooks into model lifecycle events (creating, updating, deleting) from an external class. |
| **Middleware Group** | A named collection of HTTP middleware that can be applied to routes. `fleetbase.protected` covers all authenticated internal routes. |
| **Graceful Degradation** | The design principle that all CityOS features are optional — if context headers are absent, the system behaves as stock Fleetbase. |

---

## Appendix A: File Inventory

### Existing Files (CityOS Package)

```
api/packages/cityos/
├── config/
│   └── cityos.php                              # Configuration
├── migrations/                                  # Database migrations
├── src/
│   ├── Console/Commands/
│   │   └── TemporalCommand.php                 # CLI: cityos:temporal
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── CountryController.php
│   │   │   ├── CityController.php
│   │   │   ├── SectorController.php
│   │   │   ├── CategoryController.php
│   │   │   ├── TenantController.php
│   │   │   ├── ChannelController.php
│   │   │   ├── SurfaceController.php
│   │   │   ├── PortalController.php
│   │   │   ├── RegionController.php
│   │   │   ├── GovernanceAuthorityController.php
│   │   │   ├── PolicyController.php
│   │   │   ├── FeatureFlagController.php
│   │   │   ├── NodeController.php
│   │   │   ├── HierarchyController.php
│   │   │   ├── GovernanceController.php
│   │   │   └── IntegrationController.php
│   │   └── Middleware/
│   │       ├── ResolveNodeContext.php           # NodeContext extraction
│   │       ├── EnforceDataResidency.php         # Residency enforcement
│   │       └── EnforceDataClassification.php    # Classification enforcement
│   ├── Models/
│   │   ├── Tenant.php                           # 5-tier hierarchy
│   │   ├── Node.php                             # 9-level hierarchy
│   │   ├── Country.php
│   │   ├── City.php
│   │   ├── Sector.php
│   │   ├── Category.php
│   │   ├── Channel.php
│   │   ├── Surface.php
│   │   ├── Portal.php
│   │   ├── Region.php
│   │   ├── GovernanceAuthority.php
│   │   ├── Policy.php
│   │   ├── FeatureFlag.php
│   │   ├── OutboxEvent.php
│   │   └── IntegrationLog.php
│   ├── Providers/
│   │   └── CityOSServiceProvider.php            # Service provider (MODIFY)
│   ├── Services/
│   │   ├── TemporalService.php
│   │   ├── TemporalCliBridge.php
│   │   ├── PayloadCMSService.php
│   │   ├── ERPNextService.php
│   │   ├── CityBusService.php
│   │   ├── CmsMappingService.php
│   │   ├── FeatureGateService.php
│   │   ├── ComplianceCheckService.php
│   │   ├── CapabilitiesService.php
│   │   ├── SystemsRegistryService.php
│   │   ├── QueueSystemMapService.php
│   │   └── WorkflowRegistryService.php
│   ├── Support/
│   │   ├── NodeContext.php                      # 15-dimension context
│   │   ├── GovernanceChainBuilder.php           # Cascading governance
│   │   └── PolicyMerger.php                     # Most-restrictive-wins merge
│   └── routes.php                               # CityOS API routes
└── composer.json
```

### New Files (Cross-Engine Integration)

```
api/packages/cityos/
├── migrations/
│   ├── 2026_XX_XX_add_node_context_to_fleetops_tables.php    # Phase 2
│   ├── 2026_XX_XX_add_node_context_to_pallet_tables.php      # Phase 2
│   └── 2026_XX_XX_add_node_context_to_storefront_tables.php  # Phase 2
└── src/
    ├── Http/Middleware/
    │   └── EnforceFeatureGate.php                             # Phase 5
    ├── Observers/
    │   ├── NodeContextStampObserver.php                        # Phase 3
    │   └── OutboxLoggingObserver.php                           # Phase 3
    ├── Scopes/
    │   └── NodeContextScope.php                                # Phase 4
    └── Listeners/
        ├── FleetOpsEventBridge.php                             # Phase 6
        ├── PalletEventBridge.php                               # Phase 6
        └── StorefrontEventBridge.php                           # Phase 6
```

---

## Appendix B: Decision Log

| Date | Decision | Rationale | Alternatives Considered |
|---|---|---|---|
| 2026-02 | Extend Company with Tenant, don't replace | Company handles auth/billing/API keys — too much responsibility to replace. Tenant adds hierarchy/geography/governance on top. | Map session('company') to tenant UUID — rejected because Company carries auth, billing, user membership baggage. One company can have multiple tenants. |
| 2026-02 | Zero vendor modification strategy | Vendor files lost on update. Laravel provides sufficient extension points (middleware injection, observers, global scopes, events). | Fork vendor packages — rejected for maintenance burden. Composer patches — rejected for fragility. |
| 2026-02 | Middleware injection via pushMiddlewareToGroup | All modules already use `fleetbase.protected` group. One line adds context to all routes. | Route-level middleware — rejected because too many routes to modify. Global middleware — rejected because it would affect non-API routes. |
| 2026-02 | Nullable columns for tenant stamping | Existing data must not break. Progressive population via observers. | Required columns — rejected because existing records have no tenant. Separate tables — rejected for query complexity. |
| 2026-02 | Ancestry-aware scoping | Parent tenants (MASTER, REGIONAL) must see child tenant data for management/reporting. | Strict single-tenant scoping — rejected because it breaks franchise management. |
| 2026-02 | "Most restrictive wins" policy merger | Governance must enforce the strictest applicable rule across all levels. | "Last wins" — rejected because tenant could override regional restrictions. "First wins" — rejected because country rules wouldn't apply. |
| 2026-02 | Outbox pattern for cross-module events | Transactional consistency — event is written in same DB transaction as business data. No lost events. | Direct API calls — rejected for reliability. Message queue only — rejected because no transactional guarantee with business data. |

---

*End of Document*
