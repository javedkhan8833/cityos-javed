# Dakkah CityOS - Fleetbase Server Details

## Server Overview

| Item | Value |
|---|---|
| **Platform** | Replit |
| **Owner** | Dakkah-Admin |
| **Project** | Dakkah-CityOS-Fleetbase |
| **Dev Domain** | `https://efdaeea4-1883-4ef0-9888-41da8659025c-00-19fmj1r05ozg4.pike.replit.dev` |
| **GitHub** | `https://github.com/dakkah-systems/dakkah-cityos-fleetbase` |

---

## Services

### 1. API Backend (Laravel/PHP)

| Item | Value |
|---|---|
| **Framework** | Laravel 10.50.0 |
| **Language** | PHP 8.2.23 |
| **Port** | 8000 (internal) |
| **App URL** | `https://efdaeea4-1883-4ef0-9888-41da8659025c-00-19fmj1r05ozg4.pike.replit.dev` |
| **Environment** | local |
| **Debug** | true |
| **Start Command** | `cd api && php artisan serve --host=0.0.0.0 --port=8000` |
| **Total Routes** | ~1140 |
| **Migrations** | 282 completed |

**PHP Extensions:** bcmath, curl, gd, json, mbstring, openssl, pdo_pgsql, pgsql, xml, zip

### 2. Console Frontend (Ember.js)

| Item | Value |
|---|---|
| **Framework** | Ember.js 5.4.1 (Ember Data 4.12.8) |
| **Language** | Node.js 18.20.8 |
| **Package Manager** | pnpm 10.26.1 |
| **Port** | 5000 (public-facing) |
| **Console Version** | 0.7.28 |
| **Start Command** | `cd console && npx ember serve --port 5000 --host 0.0.0.0 --proxy http://localhost:8000 --environment development` |
| **API Proxy** | All API requests proxied to `http://localhost:8000` |

### 3. PostgreSQL Database

| Item | Value |
|---|---|
| **Engine** | PostgreSQL (Neon-backed) |
| **Host** | helium |
| **Port** | 5432 |
| **Database** | heliumdb |
| **User** | postgres |
| **Extensions** | PostGIS, PostGIS Topology, pg_trgm, btree_gist, unaccent, ltree, citext, pg_stat_statements, bloom, cube, earthdistance, uuid-ossp, hll, pg_partman |
| **Connection String** | `postgresql://postgres:***@helium/heliumdb?sslmode=disable` |

---

## Fleetbase Packages (Backend)

| Package | Version | Description |
|---|---|---|
| `fleetbase/core-api` | ^1.6.35 | Core platform (auth, users, orgs, settings, webhooks) |
| `fleetbase/fleetops-api` | ^0.6.35 | Fleet operations (orders, drivers, vehicles, tracking) |
| `fleetbase/storefront-api` | ^0.4.13 | Storefront & commerce (stores, products, orders) |
| `fleetbase/pallet-api` | 0.0.1 | Warehouse management (inventory, warehouses, stock) |
| `fleetbase/cityos-api` | 0.1.0 | CityOS multi-hierarchy & governance (custom) |
| `fleetbase/registry-bridge` | ^0.1.5 | Extension registry & marketplace |

---

## CityOS Extension Details

### Hierarchy API Endpoints (CRUD)
Base path: `cityos/int/v1/`

| Resource | Endpoint |
|---|---|
| Countries | `cityos/int/v1/countries` |
| Cities | `cityos/int/v1/cities` |
| Sectors | `cityos/int/v1/sectors` |
| Categories | `cityos/int/v1/categories` |
| Tenants | `cityos/int/v1/tenants` |
| Channels | `cityos/int/v1/channels` |
| Surfaces | `cityos/int/v1/surfaces` |
| Portals | `cityos/int/v1/portals` |

### Governance API Endpoints
| Endpoint | Description |
|---|---|
| `cityos/int/v1/governance/node-tree` | Spatial node tree |
| `cityos/int/v1/governance/resolve` | NodeContext resolution |
| `cityos/int/v1/governance/tenant-hierarchy` | Tenant hierarchy chain |
| `cityos/int/v1/governance/feature-flags` | Feature flags for context |
| `cityos/int/v1/governance/compliance` | Compliance policies |
| `cityos/int/v1/governance-authorities` | CRUD for authorities |
| `cityos/int/v1/feature-flags` | CRUD for feature flags |

### Integration API Endpoints (25 total)
| Group | Endpoints | Description |
|---|---|---|
| **Status** | `integrations/status` | All integrations health |
| **Temporal** | `integrations/temporal/connection` | Temporal Cloud connection |
| | `integrations/temporal/workflows` | List/start/signal workflows |
| | `integrations/temporal/sync/status` | CMS sync status |
| | `integrations/temporal/sync/trigger` | Trigger CMS sync |
| | `integrations/temporal/registry` | Workflow registry |
| **CMS (Payload)** | `integrations/cms/health` | CMS health check |
| | `integrations/cms/nodes` | CMS nodes |
| | `integrations/cms/tenants` | CMS tenants |
| | `integrations/cms/pois` | Points of interest |
| | `integrations/cms/collections` | CMS collections |
| | `integrations/cms/governance` | CMS governance data |
| | `integrations/cms/storage` | S3 storage gateway |
| **ERPNext** | `integrations/erpnext/status` | ERPNext status |
| | `integrations/erpnext/settlement` | Trigger settlement |
| **CityBus (Outbox)** | `integrations/outbox/stats` | Outbox statistics |
| | `integrations/outbox/dispatch` | Dispatch pending events |
| | `integrations/outbox/publish` | Publish event |
| | `integrations/outbox/recent` | Recent events |
| **Logs** | `integrations/logs` | Integration logs |

### Platform Context API (Public, No Auth)
| Endpoint | Description |
|---|---|
| `GET /api/platform/context` | Full context resolution (tenant, hierarchy, governance, capabilities) |
| `GET /api/platform/tenants/default` | Default tenant bootstrap |
| `GET /api/platform/capabilities` | Platform capabilities & plugins |

### Webhook Endpoint
| Endpoint | Description |
|---|---|
| `POST /api/webhooks/cityos/cms` | CMS webhook receiver |

---

## Database Tables

### CityOS Tables (8 hierarchy + 5 governance)
| Table | Description |
|---|---|
| `cityos_countries` | Country entities (SA, AE) |
| `cityos_cities` | City entities (Riyadh, Dubai, etc.) |
| `cityos_sectors` | Business sectors (logistics, mobility, etc.) |
| `cityos_categories` | Categories & subcategories |
| `cityos_tenants` | Tenant entities with cross-references |
| `cityos_channels` | Channels (web, mobile, api, kiosk) |
| `cityos_surfaces` | BFF surfaces |
| `cityos_portals` | Portal endpoints |
| `cityos_regions` | Governance regions (GCC, MENA, EU, GLOBAL) |
| `cityos_governance_authorities` | Regulatory authorities |
| `cityos_policies` | Governance policies (cascading) |
| `cityos_feature_flags` | Feature flags per scope |
| `cityos_nodes` | Spatial governance nodes |

### Pallet (Warehouse) Tables (12)
| Table | Description |
|---|---|
| `pallet_warehouses` | Warehouse definitions |
| `pallet_inventories` | Inventory records |
| `pallet_products` | Product catalog |
| `pallet_purchase_orders` | Purchase orders |
| `pallet_sales_orders` | Sales orders |
| `pallet_batches` | Batch tracking |
| `pallet_stock_adjustment` | Stock adjustments |
| `pallet_stock_transactions` | Stock transaction log |
| `pallet_warehouse_aisles` | Warehouse aisles |
| `pallet_warehouse_bins` | Warehouse bins |
| `pallet_warehouse_docks` | Warehouse docks |
| `pallet_warehouse_racks` | Warehouse racks |
| `pallet_warehouse_sections` | Warehouse sections |
| `pallet_audits` | Audit trail |

### Additional Tables
| Table | Description |
|---|---|
| `outbox_events` | CityBus transactional outbox |
| `integration_logs` | Integration event logs |

---

## Environment Secrets

| Secret | Purpose |
|---|---|
| `CITYOS_CMS_API_KEY` | Payload CMS authentication |
| `CITYOS_CMS_BASE_URL` | Payload CMS server URL |
| `TEMPORAL_ADDRESS` | Temporal Cloud endpoint |
| `TEMPORAL_API_KEY` | Temporal Cloud API key |
| `TEMPORAL_NAMESPACE` | Temporal Cloud namespace |
| `DATABASE_URL` | PostgreSQL connection string |

---

## External Integrations

### Temporal Cloud (Workflow Engine)
| Item | Value |
|---|---|
| **Region** | ap-northeast-1 |
| **API** | Temporal Cloud Operations REST API (saas-api.tmprl.cloud) |
| **Purpose** | CMS sync workflows, governance workflow orchestration |

### Payload CMS (Content Management)
| Item | Value |
|---|---|
| **Purpose** | Hierarchy content, tenant management, POIs, governance data |
| **Storage** | S3 storage gateway |

### ERPNext (ERP)
| Item | Value |
|---|---|
| **Purpose** | Settlement, COD collection, penalties, payouts |
| **Status** | Stub mode (not yet configured) |

### CityBus (Event Bus)
| Item | Value |
|---|---|
| **Pattern** | Transactional outbox |
| **Purpose** | Event publishing, batch dispatch, routing to Temporal/ERPNext |

---

## CityOS Hierarchy Model
```
Country (SA, AE)
  └── City (riyadh, jeddah, dubai...)
       └── Sector (logistics, field_services, mobility, warehousing)
            └── Category (delivery, field_service, ride_hailing...)
                 └── Subcategory (food, parcel, installation...)
                      └── Tenant (linked to Fleetbase Company)
                           └── Channel (web, mobile, api, kiosk)
                                └── Surface (consumer-app, provider-portal)
                                     └── Portal (storefront, admin dashboard)
```

### Multi-Tenancy Tiers
```
MASTER (Global Dakkah)
  └── GLOBAL (Fleetbase instance)
       └── REGIONAL (GCC, MENA, EU)
            └── COUNTRY (SA, AE)
                 └── CITY (Riyadh, Dubai)
```

---

## Seeded Data Summary

| Entity | Count |
|---|---|
| Countries | 2 (SA, AE) |
| Cities | 10 |
| Sectors | 4 |
| Categories | 30 (8 main + 22 subcategories) |
| Tenants | 6 |
| Channels | 24 |
| Surfaces | 24 |
| Portals | 18 |
| Governance Regions | 4 (GCC, MENA, EU, GLOBAL) |
| Governance Authorities | 5 (CITC, NDMO, TGA, TDRA, RTA) |
| Policies | 3 |
| Feature Flags | 4 |
| Spatial Nodes | 6 |

---

## Tests

| Type | Files | Tests | Assertions |
|---|---|---|---|
| Feature | 6 | 84 | ~150 |
| Unit | 17 | ~85 | ~150 |
| **Total** | **23** | **85** | **299** |

---

## Console Frontend Extensions

| Extension | Description |
|---|---|
| `@fleetbase/fleetops-engine` | Fleet operations UI |
| `@fleetbase/storefront-engine` | Storefront management UI |
| `@fleetbase/iam-engine` | Identity & access management |
| `@fleetbase/dev-engine` | Developer tools |
| `@fleetbase/registry-bridge-engine` | Extension marketplace |
| `@fleetbase/cityos-engine` | CityOS hierarchy & governance UI (custom) |

---

## Known Limitations

| Limitation | Impact |
|---|---|
| No SocketCluster (WebSocket) | Real-time push notifications unavailable |
| No Redis server | Using array cache driver |
| Response caching disabled | No Redis for cache backend |
| Mail driver set to `log` | Emails logged, not sent |
| Queue connection `sync` | Jobs run synchronously |
| ERPNext in stub mode | Settlement features not active |
