# Fleetbase - Modular Logistics & Supply Chain Operating System

## Overview
Fleetbase is a modular logistics and supply chain operating system designed for complex, multi-hierarchy supply chain operations. It provides a flexible, scalable, and adaptable solution for logistics and supply chain management across various business sectors and geographical regions. The system features a robust API backend, a comprehensive console frontend, and specialized extensions for warehouse management and multi-city operations, aiming to streamline and optimize global supply chain processes.

## User Preferences
I want iterative development.
I prefer detailed explanations.
Ask before making major changes.
I do not want the AI to make changes to the folder `Z`.
I do not want the AI to make changes to the file `Y`.

## System Architecture
The Fleetbase system is built with a Laravel/PHP API backend and an Ember.js console frontend. It leverages PostgreSQL with PostGIS for advanced spatial data capabilities.

**Key Architectural Decisions:**
- **Modular Design:** Functionality is structured into scalable packages and extensions, promoting flexibility and reusability.
- **CityOS Multi-Hierarchy Model:** Implements an 8-level operational hierarchy (Country -> City -> Sector -> Category -> Tenant -> Channel -> Surface -> Portal) with `NodeContext` for granular control and data isolation. Every operational record is tied to a CityOS tenant.
- **Temporal Cloud Integration:** Utilizes native gRPC integration for workflow orchestration, including a custom client and workflow discovery system. Four built-in workflow definitions (OrderFulfillment, InventoryReplenishment, SettlementPayout, ComplianceAudit) are implemented.
- **Microservice-like Integrations:** Dedicated services for external platforms and an event-driven CityBus facilitate inter-service communication.
- **Comprehensive UI/UX:** The console frontend offers extensive UIs for managing hierarchies, integrations, and governance, styled with Tailwind CSS, including dark mode support.
- **Cross-Engine Integration:** Achieved through Laravel middleware, model observers, and global query scopes, enabling seamless operation across various Fleetbase engines (e.g., FleetOps, Pallet, Storefront, IAM).
- **Decentralized Identity:** Integration with walt.id for DID management, verifiable credentials, and presentations.
- **Financial Processing:** ERPNext integration handles settlement, COD, penalties, payouts, and reconciliation.

## External Dependencies
- **Neon PostgreSQL:** Primary relational database, hosted on Neon.
- **Temporal Cloud:** Used for orchestrating complex workflows.
- **Payload CMS:** Integrated for content management with bidirectional synchronization across multiple entity types and conflict resolution strategies.
- **ERPNext:** Provides comprehensive financial integration for logistics operations.
- **Twilio:** Utilized for SMS services, including driver login verification and localized routing (e.g., CallPro for Mongolia).
- **Medusa:** E-commerce platform integration for product, order, customer, and inventory synchronization.
- **walt.id:** Decentralized identity service for managing DIDs, verifiable credentials, and presentations.

## Recent Changes
- **2026-02-28:** Thirteenth iteration — Login fix + logging cleanup:
  - **Fixed login 500 error**: `personal_access_tokens.tokenable_id` was `bigint` but Fleetbase uses UUID strings for user IDs. Sanctum `createToken()` tried to insert UUID into bigint column. Fixed by altering column to `varchar(255)`.
  - **Root cause**: Vendor migration `2023_04_25_094311_fix_personal_access_tokens.php` used Doctrine `->change()` which silently fails with PgBouncer emulated prepares. Replaced with raw SQL `ALTER TABLE` in vendor patch (added to both `db-reset.sh` and `deploy-build.sh`). Vendor patch 4.
  - **Fixed deprecations log channel**: Added explicit `deprecations` channel in `api/config/logging.php` using `NullHandler`. Previous config caused `Log [deprecations] is not defined` EMERGENCY errors on every request, flooding the log and causing intermittent 500s on branding endpoint.
  - **Updated deprecations config format**: Changed from simple string to array format (`['channel' => 'null', 'trace' => false]`) for Laravel 10+ compatibility.
- **2026-02-27:** Twelfth iteration — Full DB reset pipeline complete + all seeders working:
  - **291 migrations, 160 tables** — full clean reset from scratch via `db-reset.sh` workflow. Zero errors in end-to-end run.
  - **All 5 seeders succeed**: FleetbaseSeeder (518 permissions, 21 roles, 32 policies, 20 directives), DakkahOrganizationSeeder (admin@dakkah.io + Dakkah Systems company), CityOSHierarchySeeder (2 countries, 10 cities, 4 sectors, 30 categories, 6 tenants, 24 channels, 24 surfaces, 18 portals), CityOSGovernanceSeeder (5 authorities, 3 policies, 4 feature flags, 6 nodes), CityOSRegistrySeeder (1 extension + 1 bundle + 1 install).
  - **Fixed CityOSRegistrySeeder circular FK**: Extension and bundle have mutual FK references; fixed by inserting extension first (with null bundle ref), then bundle, then updating extension.
  - **Fixed PgBouncer boolean issue**: `PDO::ATTR_EMULATE_PREPARES=true` sends `1`/`0` instead of `TRUE`/`FALSE` for PostgreSQL booleans. Added `pgsql_direct` connection (unpooled Neon host, no emulated prepares) for seeders. PgBouncer connection used for migrations (faster).
  - **db-reset.sh / db-reset-runner.php**: Single-command full reset: patches vendors → DROP SCHEMA CASCADE → migrate (PgBouncer) → seed (direct connection). Runs as a Replit "DB Reset" workflow to avoid timeout.
  - **deploy-build.sh path fix**: Corrected `api/vendor/` → `vendor/` paths (script already cd's to `api/`).
  - **deploy-run.sh refined**: Production startup with background database sync; uses direct connection for seeders; incremental migrate for existing databases.
  - **Admin credentials**: admin@dakkah.io / Dakkah@2026! (configurable via env vars).
  - **Detailed documentation**: `docs/database-migration-guide.md` — comprehensive guide covering architecture, all 160 tables, seeder pipeline, vendor patches, troubleshooting, and verification checklist.
- **2026-02-27:** Eleventh iteration — All migrations complete + system live:
  - **All 158+ migrations completed** on Neon (0 pending). Final batches included CityOS hierarchy tables (countries, cities, sectors, categories, tenants, channels, surfaces, portals, nodes, workflow registry, feature flags, governance), performance indexes, node context columns on FleetOps/Pallet/Storefront tables.
  - **Fixed 2025_12_16_000003 performance indexes migration**: replaced deprecated `getDoctrineSchemaManager()` Doctrine calls with native `pg_indexes` table query; removed invalid `public bool $withinTransaction` type declaration (parent class uses untyped property); switched to `CREATE INDEX IF NOT EXISTS` per-index with individual try/catch.
  - **deploy-build.sh patches**: (1) duplicate uuid inline unique() removal across all vendor migrations, (2) vehicle_devices missing uuid unique constraint, (3) performance indexes migration full rewrite.
- **2026-02-17:** Switched to Neon PostgreSQL database.
- **2026-02-17:** Improved deployment reliability with resilient startup scripts and health check optimizations.
- **2026-02-16:** Tenth iteration — PostgreSQL extensions + CI/CD:
  - Installed 14 PostgreSQL extensions in dev database for production parity
  - Extensions: PostGIS, PostGIS Topology, pg_trgm, btree_gist, unaccent, ltree, citext, pg_stat_statements, bloom, cube, earthdistance, uuid-ossp, hll, pg_partman
  - Created Laravel migration `2014_01_01_000000_install_postgresql_extensions.php` (dated early to run before all other migrations)
  - Migration uses try/catch for optional extensions (hll, pg_partman, pg_stat_statements) for production provider compatibility
  - Updated CI workflow (`.github/workflows/ci.yml`) with PostgreSQL extension installation in test pipeline
  - Updated GitHub remote to `dakkah-systems/dakkah-cityos-fleetbase`
  - Existing CI/CD: ci.yml (lint/test), cd.yml (AWS ECS deploy), eks-cd.yml (EKS deploy), gcp-cd.yml (GCP deploy), publish-docker-images.yml (Docker Hub), build-binaries.yml, create-release.yml
- **2026-02-14:** Ninth iteration — Full database seeding: 141/154 tables populated (13 remaining are system-auto-populated):
  - **Pallet/Warehouse:** 7 sections, 10 aisles, 14 racks, 20 bins, 7 docks, 13 inventories, 9 batches, 12 stock transactions, 5 adjustments, 6 POs, 6 SOs, 5 audits
  - **Storefront:** 2 stores, 2 catalogs, 4 products, 4 variants, 2 addon categories, 3 addons, 5 product hours, 2 store locations, 6 store hours, 4 catalog_category_products, 2 catalog_subjects, 6 catalog_hours
  - **Operations:** 4 alerts, 3 assets (PostGIS), 3 warranties, 5 parts, 3 sensors (PostGIS), 3 devices (PostGIS), 2 telematics, 6 device_events (PostGIS)
  - **Organization:** 2 groups, 5 group_users, 3 reviews, 3 votes, 3 notification_channels, 5 notifications, 10 role_has_permissions
  - **E-commerce:** 1 network, 1 gateway, 1 cart, 1 checkout, 1 network_store, 2 cityos_stores, 3 payment_methods
  - **Reporting:** 3 reports, 2 report_templates, 4 dashboard_widgets
  - **Scheduling:** 4 schedule_availability, 3 schedule_constraints
  - **Custom Fields:** 4 custom_fields, 6 custom_field_values, 2 webhook_endpoints, 2 food_trucks
  - 13 remaining empty tables are all system/auto-populated (login_attempts, files, webhook_request_logs, report_cache, etc.)
- **2026-02-14:** Eighth iteration — Core seeding (20+ tables):
  - Core: 5 payloads, 10 waypoints, 1 route, 3 proofs of delivery, 5 orders
  - Fleet: 8 fleet_drivers, 12 fleet_vehicles, 5 fuel_reports, 4 issues, 5 maintenances, 5 work_orders, 6 equipments
  - Pricing: 6 service_rate_fees, 6 service_rate_parcel_fees, 3 service_quotes, 6 quote_items, 2 purchase_rates, 4 transactions, 6 transaction_items
  - Organization: 5 vendor_personnels, 3 integrated_vendors, 6 categories, 5 types, 4 comments
  - Scheduling: 3 schedule_templates, 5 schedules, 13 schedule_items
  - Completed ALL vehicle data: 52/52 with make/model/year/plate (Saudi/Gulf logistics fleet mix)
  - Completed ALL driver assignments: 23/23 with vehicles, 23/23 with vendors
  - Completed ALL tenant_uuid coverage: 100% across all 8 tenant-scoped tables
- **2026-02-13:** Seventh iteration — Dakkah tenant seeding, tenant_uuid stamping, Fleet + ServiceRate fixes:
  - Seeded "Dakkah" tenant in cityos_tenants (handle: Dakkah, tier: CITY, company: 29ae887c) to fix CityOS context resolution
  - Fixed Fleet model: removed incorrect user() relationship and created_by_uuid from fillable
  - Fixed ServiceRate UpdateRequest: made currency conditionally required on POST only
  - Tables WITH tenant_uuid (tenant-scoped): vehicles, drivers, contacts, places, orders, fleets, service_areas, payloads
  - Tables WITHOUT tenant_uuid (company-scoped): vendors, zones, service_rates, entities, tracking_numbers, tracking_statuses
- **2026-02-13:** Fifth iteration — ValidationException 500 → 422:
  - Fixed exception handler's `render()` method to detect `ValidationException` status property (422) instead of defaulting to 500
  - Added `ValidationException` to manually handled exceptions list
  - Investigation: Remaining test tool Node.js server routes (~186ms) have no corresponding PHP/Ember code
