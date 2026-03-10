# Fleetbase Backend Models — Deep Assessment

**Date:** February 13, 2026  
**Scope:** All backend PHP models across Core API, FleetOps, Storefront, Pallet, and CityOS engines  
**Total Models:** ~127 unique models  
**Stack:** Laravel/PHP API + PostgreSQL/PostGIS + Ember.js 5.4 Console Frontend

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Core API Models (Platform Foundation)](#2-core-api-models)
3. [FleetOps Engine (Logistics Operations)](#3-fleetops-engine)
4. [Storefront Engine (E-Commerce)](#4-storefront-engine)
5. [Pallet Engine (Warehouse Management)](#5-pallet-engine)
6. [CityOS Engine (Multi-Hierarchy Governance)](#6-cityos-engine)
7. [External Integration Map](#7-external-integration-map)
8. [Cross-Engine Dependencies](#8-cross-engine-dependencies)
9. [Gaps & Risks](#9-gaps--risks)
10. [Implementation Changelog](#10-implementation-changelog)

---

## 1. Architecture Overview

### Key Patterns

| Pattern | Description |
|---------|-------------|
| **UUID Primary Keys** | All models use non-incrementing UUID PKs via `HasUuid` trait |
| **Public IDs** | Human-readable IDs with type prefixes (e.g., `order_abc123`, `driver_xyz789`) via `HasPublicId` |
| **Multi-Tenancy** | All records scoped via `company_uuid`; session-based company context |
| **Polymorphic Relations** | Pervasive `morphTo` pattern via `subject_type`/`subject_uuid` columns |
| **Webhook System** | `WebhookEventsObserver` auto-fires lifecycle events; `SendsWebhooks` trait on models |
| **Dual API Access** | Public API (`v1`) for external consumers + Internal API (`int/v1`) for console |
| **Activity Logging** | Spatie ActivityLog on major models with `logOnly(['*'])->logOnlyDirty()` |
| **Custom Fields** | `HasCustomFields` trait enables user-defined fields on most models |
| **Spatial Data** | PostGIS spatial columns via `SpatialTrait` for `location`, `border`, `coordinates` |
| **API Credential Tracking** | `TracksApiCredential` links records to the API key that created them |

### Base Model

All models (except User, Role, Permission, Activity, Setting, Notification) extend `Fleetbase\Models\Model`:
- UUID primary key (non-incrementing)
- Connection: `mysql` (actually PostgreSQL via config)
- Static methods: `findById()`, `findByIdOrFail()`

### Observers (Global)

| Observer | Scope | Behavior |
|----------|-------|----------|
| `ActivityObserver` | Spatie Activity | Sets `company_id` from session, generates UUID on creating |
| `ApiCredentialObserver` | ApiCredential | Generates API key/secret on created |
| `ChatParticipantObserver` | ChatParticipant | Fires events, creates ChatLog entries |
| `CompanyObserver` | Company | Clears user organization cache |
| `HttpCacheObserver` | Models with ClearsHttpCache | Clears HTTP cache |
| `NotificationObserver` | Notification | Notification lifecycle |
| `UserObserver` | User | User lifecycle events |
| `WebhookEventsObserver` | Generic (all models) | Fires `ResourceLifecycleEvent` on created/updated/deleted |
| `NodeContextStampObserver` | CityOS models | Auto-stamps tenant/country/city/sector context |
| `OutboxLoggingObserver` | CityOS models | Creates OutboxEvent for event bridge |

---

## 2. Core API Models

### 2.1 User

| Aspect | Detail |
|--------|--------|
| **Table** | `users` |
| **Extends** | `Authenticatable` (Laravel) |
| **Admin UI** | Settings > Users |
| **Status** | Fully implemented |

**Key Fields:** `uuid`, `public_id`, `company_uuid`, `avatar_uuid`, `username`, `email`, `name`, `phone`, `date_of_birth`, `timezone`, `meta` (JSON), `options` (JSON), `country`, `ip_address`, `last_login`, `email_verified_at`, `phone_verified_at`, `slug`, `status`

**Social Auth Fields:** `apple_user_id`, `facebook_user_id`, `google_user_id`

**Relationships:**
- `company()` → belongsTo Company
- `avatar()` → belongsTo File
- `devices()` → hasMany UserDevice
- `companyUsers()` → hasMany CompanyUser
- `companies()` → hasManyThrough Company via CompanyUser
- `groups()` → hasManyThrough Group via GroupUser

**Traits:** HasUuid, HasPublicId, HasPresence, Searchable, Notifiable, HasApiTokens (Sanctum), HasSlug, HasApiModelBehavior, HasCacheableAttributes, HasMetaAttributes, HasOptionsAttributes, LogsActivity, CausesActivity, SoftDeletes, ProxiesAuthorizationMethods, Expandable, Filterable, ClearsHttpCache, HasSessionAttributes

**Computed Attributes:** `avatar_url`, `session_status`, `company_name`, `is_admin`, `is_online`, `last_seen_at`, `role`, `roles`, `policies`, `permissions`

**API Endpoints (Internal):** CRUD + `me`, `export`, `deactivate`, `activate`, `verify`, `remove-from-company`, `bulk-delete`, `resend-invite`, `set-password`, `validate-password`, `change-password`, `two-fa`, `locale`

**Auth Routes (Public):** `login`, `signup`, `forgot-password`, `reset-password`, `bootstrap`, `change-password`, `impersonate`, `get-organizations`

**External Integrations:** Sanctum API tokens, Social OAuth (Apple/Facebook/Google), Twilio (SMS via `routeNotificationForTwilio`)

---

### 2.2 Company

| Aspect | Detail |
|--------|--------|
| **Table** | `companies` |
| **Admin UI** | Admin > Organizations |
| **Status** | Fully implemented |

**Key Fields:** `uuid`, `public_id`, `stripe_customer_id`, `stripe_connect_id`, `name`, `owner_uuid`, `logo_uuid`, `backdrop_uuid`, `place_uuid`, `website_url`, `description`, `options` (JSON), `meta` (JSON), `type`, `currency`, `country`, `phone`, `timezone`, `plan`, `status`, `trial_ends_at`, `onboarding_completed_at`

**Relationships:**
- `owner()` → belongsTo User
- `users()` → belongsToMany User (via `company_users`)
- `logo()` / `backdrop()` → belongsTo File
- `drivers()` → hasMany Driver (FleetOps)
- `apiCredentials()` → hasMany ApiCredential

**API Endpoints (Internal):** CRUD + `two-fa`, `transfer-ownership`, `leave`, `export`, `users`

**External Integrations:** Stripe (`stripe_customer_id`, `stripe_connect_id`)

---

### 2.3 CompanyUser

| Aspect | Detail |
|--------|--------|
| **Table** | `company_users` |
| **Admin UI** | Internal (company-user link) |
| **Status** | Working |

**Key Fields:** `company_uuid`, `user_uuid`, `status`, `external` (boolean)

**Relationships:** `user()` → belongsTo User, `company()` → belongsTo Company

**Key Logic:** `assignSingleRole()`, `getAllPermissions()`, `hasPermissions()`, `doesntHavePermissions()`

**Traits:** HasUuid, TracksApiCredential, HasRoles (Spatie), HasPolicies

---

### 2.4 Role / Permission / Policy (IAM)

| Model | Table | Extends | Admin UI |
|-------|-------|---------|----------|
| Role | `roles` | Spatie Role | IAM Engine |
| Permission | `permissions` | Spatie Permission | IAM Engine |
| Policy | `policies` | Fleetbase Model | IAM Engine |

**Role:** Always loads `['permissions']`. Appends: `type`, `is_mutable`, `is_deletable`. Scoped by `company_uuid`.

**Policy:** Has `company_uuid`, `name`, `guard_name`, `service`, `description`. Uses HasPermissions (Spatie). Always loads `['permissions']`.

**API Endpoints:** Standard CRUD via `fleetbaseRoutes()` for each.

---

### 2.5 Group / GroupUser

| Aspect | Detail |
|--------|--------|
| **Table** | `groups` / `group_users` |
| **Admin UI** | Settings |
| **Status** | Implemented |

**Group Fields:** `company_uuid`, `name`, `description`, `slug`

**Group Relationships:** `users()` → hasManyThrough User via GroupUser. Eager loads `['users', 'permissions', 'policies']`.

**Group Traits:** HasUuid, HasPublicId, HasPermissions, HasPolicies, HasRoles, HasSlug, Filterable, Notifiable

---

### 2.6 ApiCredential

| Aspect | Detail |
|--------|--------|
| **Table** | `api_credentials` |
| **Admin UI** | Settings > API Keys |
| **Status** | Fully implemented |

**Key Fields:** `user_uuid`, `company_uuid`, `name`, `key`, `secret`, `test_mode`, `api`, `browser_origins`, `last_used_at`, `expires_at`

**Observer:** `ApiCredentialObserver` generates key/secret on created.

**API Endpoints:** CRUD + `bulk-delete`, `roll/{id}` (regenerate key), `export`

---

### 2.7 ApiEvent / ApiRequestLog

| Model | Table | Admin UI |
|-------|-------|----------|
| ApiEvent | `api_events` | Developer > Events |
| ApiRequestLog | `api_request_logs` | Developer > Logs |

**ApiEvent Fields:** `company_uuid`, `api_credential_uuid`, `event`, `source`, `data`, `description`, `method`

**ApiRequestLog Fields:** `method`, `path`, `full_url`, `status_code`, `request_headers`, `request_body`, `response_headers`, `response_body`, `content_type`, `duration`, `ip_address`, `version`

Both link to `company` and `apiCredential` via belongsTo.

---

### 2.8 WebhookEndpoint / WebhookRequestLog

| Model | Table | Admin UI |
|-------|-------|----------|
| WebhookEndpoint | `webhook_endpoints` | Developer > Webhooks |
| WebhookRequestLog | `webhook_request_logs` | Developer > Webhook Logs |

**WebhookEndpoint Fields:** `company_uuid`, `url`, `mode`, `version`, `description`, `events` (JSON), `status`

**Key Methods:** `canFireEvent()`, `enable()`, `disable()`

**API Endpoints:** CRUD + `enable/{id}`, `disable/{id}`, `events` (list available), `versions`

---

### 2.9 Chat System (6 Models)

| Model | Table | Admin UI |
|-------|-------|----------|
| ChatChannel | `chat_channels` | Chat feature |
| ChatMessage | `chat_messages` | Chat feature |
| ChatParticipant | `chat_participants` | Chat feature |
| ChatAttachment | `chat_attachments` | Chat feature |
| ChatReceipt | `chat_receipts` | Chat feature |
| ChatLog | `chat_logs` | Chat feature |

**ChatChannel Relationships:** `company`, `createdBy`, `participants` (hasMany), `messages` (hasMany), `attachments` (hasMany), `logs` (hasMany), `lastMessage` (hasOne latest)

**Boot Logic:** Auto-creates ChatParticipant for channel creator. Appends: `title`, `last_message`.

**ChatMessage:** Eager loads `['sender', 'attachments', 'receipts']`. Sender is ChatParticipant (withTrashed).

**ChatParticipant Observer:** Fires `ChatParticipantAdded`/`Removed` events, creates ChatLog entries.

**ChatReceipt Boot:** Auto-sets `read_at` to `now()` on creating.

**ChatLog Static Methods:** `participantAdded()`, `participantRemoved()`, `messageDeleted()`, `chatStarted()`, `chatEnded()`

**API Endpoints (Public + Internal):** CRUD + `send-message`, `delete-message`, `read-receipt`, `add-participant`, `remove-participant`, `unread-count`

---

### 2.10 File

| Aspect | Detail |
|--------|--------|
| **Table** | `files` |
| **Admin UI** | Internal (file uploads) |
| **Status** | Working |

**Key Fields:** `company_uuid`, `uploader_uuid`, `subject_uuid`, `subject_type`, `disk`, `path`, `bucket`, `folder`, `meta` (JSON), `original_filename`, `type`, `content_type`, `file_size`, `caption`

**Storage:** Supports S3 (signed URLs) and local disk. `getUrlAttribute()` handles both.

**API Endpoints (Public):** CRUD + download. **(Internal):** CRUD + upload, uploadBase64, download.

---

### 2.11 Dashboard / DashboardWidget

| Aspect | Detail |
|--------|--------|
| **Table** | `dashboards` / `dashboard_widgets` |
| **Admin UI** | Console Home |
| **Status** | Implemented |

**Dashboard Fields:** `user_uuid`, `company_uuid`, `extension`, `name`, `is_default`, `tags` (JSON), `meta` (JSON), `options` (JSON)

**Dashboard Relationships:** `widgets()` → hasMany DashboardWidget

**DashboardWidget Fields:** `dashboard_uuid`, `name`, `component`, `grid_options` (JSON), `options` (JSON)

**API Endpoints:** CRUD + `switch`, `reset-default`

---

### 2.12 Category

| Aspect | Detail |
|--------|--------|
| **Table** | `categories` |
| **Admin UI** | Shared across engines |
| **Status** | Working |

**Key Fields:** `company_uuid`, `parent_uuid`, `icon_file_uuid`, `owner_type`, `name`, `description`, `translations`, `meta` (JSON), `tags` (JSON), `icon`, `icon_color`, `slug`, `order`, `for`, `core_category`

**Self-referential:** `parentCategory()` → belongsTo self, `subCategories()` → hasMany self

---

### 2.13 Extension / ExtensionInstall

| Aspect | Detail |
|--------|--------|
| **Table** | `extensions` / `extension_installs` |
| **Admin UI** | Registry Bridge |
| **Status** | Implemented |

**Extension Fields:** `company_uuid`, `category_uuid`, `name`, `key`, `namespace`, `internal_route`, `fa_icon`, `version`, `core_service`, `config` (JSON), `secret`, `client_token`, `status`

**ExtensionInstall:** Links extension to company with install-specific `meta`, `config`, `overwrite` fields.

---

### 2.14 Notification

| Aspect | Detail |
|--------|--------|
| **Table** | `notifications` (Laravel default) |
| **Extends** | DatabaseNotification (Laravel) |
| **Admin UI** | Console notifications |
| **Status** | Working |

**API Endpoints:** CRUD + `registry`, `notifiables`, `get-settings`, `mark-as-read`, `mark-all-read`, `bulk-delete`, `save-settings`

---

### 2.15 VerificationCode

| Aspect | Detail |
|--------|--------|
| **Table** | `verification_codes` |
| **Admin UI** | None (internal service) |
| **Status** | Working |

**Key Fields:** `subject_uuid`, `subject_type`, `code`, `for`, `expires_at`, `meta` (JSON), `status`

**Boot Logic:** Auto-generates 6-digit code on creating.

**Static Methods:** `generateFor()`, `generateEmailVerificationFor()`, `generateSmsVerificationFor()`

**External Integration:** Twilio (via SmsService) for SMS verification, Laravel Mail for email verification. Bypass code: `999000` (via `NAVIGATOR_BYPASS_VERIFICATION_CODE` env).

---

### 2.16 Transaction / TransactionItem

| Aspect | Detail |
|--------|--------|
| **Table** | `transactions` / `transaction_items` |
| **Admin UI** | Internal billing |
| **Status** | Implemented |

**Transaction Fields:** `owner_uuid`, `owner_type`, `customer_uuid`, `customer_type`, `company_uuid`, `gateway_transaction_id`, `gateway`, `gateway_uuid`, `amount`, `currency`, `description`, `type`, `status`

**TransactionItem Fields:** `transaction_uuid`, `amount`, `currency`, `details`, `code`, `meta`

**Polymorphic:** `customer()` → morphTo (customer_type/customer_uuid)

---

### 2.17 Schedule System (5 Models)

| Model | Table | Admin UI |
|-------|-------|----------|
| Schedule | `schedules` | Admin > Schedule Monitor |
| ScheduleItem | `schedule_items` | Admin > Schedule Monitor |
| ScheduleTemplate | `schedule_templates` | Admin > Schedule Monitor |
| ScheduleAvailability | `schedule_availability` | Admin > Schedule Monitor |
| ScheduleConstraint | `schedule_constraints` | Admin > Schedule Monitor |

**Schedule:** Polymorphic `subject()`. Scopes: `forSubject()`, `active()`, `withinDateRange()`.

**ScheduleItem:** Polymorphic `assignee()` and `resource()`. Auto-calculates duration on saving. Scopes: `forAssignee()`, `withinTimeRange()`, `upcoming()`, `byStatus()`.

**ScheduleTemplate:** Shift pattern/rotation configuration. Fields include `default_shift_start`, `default_shift_end`, `shift_pattern` (JSON), `rotation_config` (JSON).

**ScheduleAvailability:** Day-of-week + time-range availability tracking. Scopes: `available()`, `unavailable()`, `withinTimeRange()`.

**ScheduleConstraint:** Configurable constraint types with priority ordering. Fields: `constraint_type`, `constraint_category`, `constraint_value`, `jurisdiction`, `priority`.

---

### 2.18 Setting

| Aspect | Detail |
|--------|--------|
| **Table** | `settings` |
| **Admin UI** | Admin > Config |
| **Status** | Working |

**Key Static Methods:** `system()`, `configureSystem()`, `configure()`, `configureCompany()`, `lookup()`, `lookupFromCompany()`, `getBranding()`, `getBrandingLogoUrl()`, `hasConnection()`

**API Endpoints:** CRUD + `overview`, `filesystem-config`, `mail-config`, `queue-config`, `services-config`, `branding`, `test-*` config endpoints, `notification-channels-config`, `socket-test`

---

### 2.19 Other Core Models

| Model | Table | Key Purpose | Admin UI |
|-------|-------|-------------|----------|
| Activity | `activity_log` (Spatie) | Audit trail | Internal |
| Alert | `alerts` | System alerting with severity/acknowledgment | Internal |
| Comment | `comments` | Threaded comments (polymorphic subject) | Internal |
| CustomField | `custom_fields` | User-defined field definitions | Custom fields system |
| CustomFieldValue | `custom_field_values` | User-defined field values | Custom fields system |
| Directive | `directives` | Permission-based directives | No dedicated UI |
| Invite | `invites` | Organization/fleet join links | Working |
| LoginAttempt | `login_attempts` | Security audit | No UI |
| Report | `reports` | Configurable report builder | Partial UI |
| ReportAuditLog | `report_audit_logs` | Report execution audit | Internal |
| ReportExecution | `report_executions` | Report run history | Internal |
| UserDevice | `user_devices` | Push notification tokens | Internal |
| Type | `types` | Type system registry | Internal |

**Report Key Methods:** `execute()`, `export()`, `validateQueryConfig()`, `getQueryComplexity()`, `schedule()`, `cloneWithConfig()`

**Report API Endpoints:** CRUD + `tables`, `table-schema`, `table-columns`, `table-relationships`, `validate-query`, `execute-query`, `analyze-query`, `export-query`, `query-recommendations`

**Alert Scopes:** `byType()`, `bySeverity()`, `byStatus()`, `open()`, `acknowledged()`, `critical()`, `highPriority()`

---

## 3. FleetOps Engine

**Total Models:** 40  
**Observers:** 16  
**API Controllers:** 22 external + 21 internal

### 3.1 Order

| Aspect | Detail |
|--------|--------|
| **Table** | `orders` |
| **Admin UI** | FleetOps > Orders |
| **Status** | Fully implemented |

**Key Fields:** `public_id`, `internal_id`, `route_uuid`, `customer_uuid`, `customer_type`, `facilitator_uuid`, `facilitator_type`, `pickup_uuid`, `dropoff_uuid`, `return_uuid`, `company_uuid`, `payload_uuid`, `order_config_uuid`, `transaction_uuid`, `driver_assigned_uuid`, `vehicle_assigned_uuid`, `scheduled_at`, `dispatched_at`, `dispatched`, `adhoc`, `pod_method`, `pod_required`, `is_route_optimized`, `distance`, `time`, `meta` (JSON), `notes`, `type`, `status`

**Relationships:**
- belongsTo: `orderConfig`, `transaction`, `route`, `payload`, `company`, `createdBy`, `updatedBy`, `driverAssigned`, `vehicleAssigned`, `trackingNumber`, `purchaseRate`
- hasMany: `comments`, `files`, `trackingStatuses`, `proofs`
- morphTo: `facilitator` (Contact|Vendor|IntegratedVendor), `customer` (Contact|Vendor)

**Key Business Logic:**
- `setPayload()` / `createPayload()` / `insertPayload()` — Payload management
- `dispatchWithActivity()` / `firstDispatch()` — Order dispatch with activity tracking
- `cancel()` / `complete()` — Lifecycle state changes
- `updateActivity()` — Progress tracking through configurable flow
- `assignDriver()` — Driver assignment with notifications
- `setDistanceAndTime()` — Distance/time calculation
- `findClosestDrivers()` — Proximity-based driver matching
- `isIntegratedVendorOrder()` — Third-party vendor check
- `pdfLabel()` — PDF label generation (DomPDF)

**Events:** `OrderCanceled`, `OrderCompleted`, `OrderDispatched`, `OrderDriverAssigned`

**Observer:** `OrderObserver` — Cache invalidation on created/updated/deleted; ensure order started on updating.

**API Endpoints (Public v1):** CRUD + `dispatch`, `start`, `cancel`, `update-activity`, `next-activity`, `assign-driver`, `complete`, `set-destination`, `eta`, `distance-and-time`

**API Endpoints (Internal):** + `accept`, `schedule`, `bulk-cancel`, `bulk-delete`, `search`

**External Integrations:** Integrated vendor orders (Lalamove etc.), PDF label generation (DomPDF), webhook dispatching

---

### 3.2 OrderConfig

| Aspect | Detail |
|--------|--------|
| **Table** | `order_configs` |
| **Admin UI** | FleetOps > Order Configs |
| **Status** | Implemented |

**Key Fields:** `company_uuid`, `name`, `namespace`, `key`, `version`, `core_service`, `tags` (JSON), `flow` (JSON — defines order workflow activities), `entities` (JSON), `meta` (JSON)

**Key Methods:** `resolveFromIdentifier()`, `default()`, `getFlow()`, `isStartActivity()`

**Purpose:** Configurable order workflow engine. The `flow` JSON defines custom activity sequences per order type, controlling what steps an order goes through from creation to completion.

---

### 3.3 Driver

| Aspect | Detail |
|--------|--------|
| **Table** | `drivers` |
| **Admin UI** | FleetOps > Drivers |
| **Status** | Fully implemented |

**Key Fields:** `public_id`, `internal_id`, `user_uuid`, `company_uuid`, `vehicle_uuid`, `vendor_uuid`, `current_job_uuid`, `auth_token`, `avatar_url`, `drivers_license_number`, `location` (SPATIAL), `heading`, `bearing`, `altitude`, `speed`, `country`, `currency`, `city`, `online`, `current_status`, `status`

**Relationships:**
- belongsTo: `user`, `company`, `vehicle`, `vendor`, `currentJob`/`currentOrder`
- hasMany: `jobs`/`orders`, `pings`, `positions`, `devices`
- hasManyThrough: `fleets` via FleetDriver

**Observer:** `DriverObserver` — creating (setup), created (user association), updated (sync), deleting/deleted (cascade cleanup)

**API Endpoints (Public v1):** CRUD + `register-device`, `login-with-sms`, `verify-code`, `login`, `simulate`, `track`, `switch-organization`, `toggle-online`, `organizations`, `current-organization`

**External Integrations:** FCM/APN push notifications, Twilio SMS (driver verification)

---

### 3.4 Vehicle

| Aspect | Detail |
|--------|--------|
| **Table** | `vehicles` |
| **Admin UI** | FleetOps > Vehicles |
| **Status** | Fully implemented |

**Key Fields:** `company_uuid`, `vendor_uuid`, `category_uuid`, `warranty_uuid`, `name`, `make`, `model`, `year`, `color`, `location` (SPATIAL), `speed`, `heading`, `altitude`, `odometer`, `fuel_type`, `plate_number`, `vin`, `vin_data` (JSON), `cargo_volume`, `weight`, `dimensions_unit`, `online`, `status`, `meta` (JSON)

**Relationships:**
- belongsTo: `photo`, `category`, `telematic`, `warranty`, `vendor`
- hasOne: `driver`
- hasMany: `devices`, `positions`, `equipments`, `maintenances`, `sensors`
- hasManyThrough: `fleets` via FleetVehicle
- morphMany: `parts`

**Observer:** `VehicleObserver` — created (tracking number, status), updating (VIN data processing), deleted (cleanup)

**Key Methods:** `assignDriver()`, `getLastKnownPosition()`, `createPosition()`, `setVinData()`, `createFromImport()`

---

### 3.5 Fleet / FleetDriver / FleetVehicle

| Aspect | Detail |
|--------|--------|
| **Table** | `fleets` / `fleet_drivers` / `fleet_vehicles` |
| **Admin UI** | FleetOps > Fleets |
| **Status** | Fully implemented |

**Fleet Fields:** `company_uuid`, `service_area_uuid`, `zone_uuid`, `vendor_uuid`, `parent_fleet_uuid`, `image_uuid`, `name`, `color`, `task`, `status`

**Fleet Relationships:** belongsTo (serviceArea, zone, vendor, parentFleet), hasMany (subFleets, fleetDrivers, fleetVehicles), computed drivers/vehicles via pivot.

**Computed Attributes:** `drivers_count`, `drivers_online_count`, `vehicles_count`, `vehicles_online_count`

**Observer:** `FleetObserver` — deleted (cascade cleanup of FleetDriver/FleetVehicle pivots)

---

### 3.6 Contact

| Aspect | Detail |
|--------|--------|
| **Table** | `contacts` |
| **Admin UI** | FleetOps > Contacts |
| **Status** | Fully implemented |

**Key Fields:** `company_uuid`, `user_uuid`, `place_uuid`, `photo_uuid`, `name`, `title`, `email`, `phone`, `type`, `notes`, `meta` (JSON)

**Relationships:** belongsTo (company, user, photo, place), hasMany (devices, places, facilitatorOrders, customerOrders, files)

**Key Methods:** `createUserFromContact()`, `assignUser()`, `syncWithUser()`, `createUser()`, `routeNotificationForTwilio()`

**Observer:** `ContactObserver` — creating (validation), saving (email/phone uniqueness), deleted (cleanup)

---

### 3.7 Place

| Aspect | Detail |
|--------|--------|
| **Table** | `places` |
| **Admin UI** | FleetOps > Places |
| **Status** | Fully implemented |

**Key Fields:** `company_uuid`, `owner_uuid`, `owner_type`, `name`, `type`, `street1`, `street2`, `city`, `province`, `postal_code`, `neighborhood`, `district`, `building`, `security_access_code`, `country`, `location` (SPATIAL POINT), `meta` (JSON), `phone`

**Key Methods:** `fillWithGoogleAddress()`, `createFromGoogleAddress()`, `createFromGeocodingLookup()`, `createFromReverseGeocodingLookup()`, `createFromCoordinates()`, `createFromMixed()`, `toAddressString()`, `includesPoint()`

**Observer:** `PlaceObserver` — creating (geocoding setup), created/updated (activity logging), deleted (cleanup)

**External Integration:** Google Maps Geocoder

---

### 3.8 Vendor / VendorPersonnel

| Aspect | Detail |
|--------|--------|
| **Table** | `vendors` / `vendor_personnels` |
| **Admin UI** | FleetOps > Vendors |
| **Status** | Fully implemented |

**Vendor Fields:** `company_uuid`, `place_uuid`, `connect_company_uuid`, `business_id`, `name`, `email`, `website_url`, `phone`, `country`, `status`, `type`

**Vendor Relationships:** belongsTo (place, connectCompany, company, logo), hasMany (places, vendorPersonnel, facilitatorOrders, customerOrders, files)

---

### 3.9 ServiceArea / Zone

| Aspect | Detail |
|--------|--------|
| **Table** | `service_areas` / `zones` |
| **Admin UI** | FleetOps > Service Areas |
| **Status** | Fully implemented |

**ServiceArea Fields:** `company_uuid`, `name`, `type`, `parent_uuid`, `border` (MULTIPOLYGON SPATIAL), `color`, `stroke_color`, `status`, `country`

**ServiceArea Key Methods:** `createPolygonFromPoint()`, `createMultiPolygonFromPoint()`, `getCentroid()`, `includesPoint()`, `includesPoints()`

**Zone Fields:** `company_uuid`, `service_area_uuid`, `name`, `description`, `border` (SPATIAL), `color`, `stroke_color`, `status`

**Observer:** `ServiceAreaObserver` — creating (defaults), deleted (cascade zone deletion)

---

### 3.10 Payload / Entity / Waypoint

| Aspect | Detail |
|--------|--------|
| **Table** | `payloads` / `entities` / `waypoints` |
| **Admin UI** | Internal to orders |
| **Status** | Working |

**Payload Fields:** `company_uuid`, `pickup_uuid`, `dropoff_uuid`, `return_uuid`, `current_waypoint_uuid`, `meta` (JSON), `payment_method`, `cod_amount`, `cod_currency`, `cod_payment_method`, `type`

**Payload Key Methods:** `setEntities()`, `insertEntities()`, `setCurrentWaypoint()`, `setWaypoints()`, `getAllStops()`, `getDropoffOrLastWaypoint()`, `getPickupOrFirstWaypoint()`

**Entity Fields:** `payload_uuid`, `company_uuid`, `driver_assigned_uuid`, `tracking_number_uuid`, `destination_uuid`, `name`, `type`, `description`, `currency`, `barcode`, `qr_code`, `weight`, `dimensions`, `declared_value`, `sku`, `price`, `sale_price`, `meta` (JSON)

**Entity Key Methods:** `pdfLabel()`, `pdfLabelStream()`, `setDestination()`, `setCustomer()`

---

### 3.11 TrackingNumber / TrackingStatus

| Aspect | Detail |
|--------|--------|
| **Table** | `tracking_numbers` / `tracking_statuses` |
| **Admin UI** | Order tracking |
| **Status** | Working |

**TrackingNumber Fields:** `company_uuid`, `tracking_number`, `owner_uuid`, `owner_type`, `region`, `qr_code`, `barcode`, `status_uuid`

**TrackingNumber Observer:** Creates tracking number, barcode (DNS2D), QR code on creating. Creates initial status on created.

**TrackingStatus Fields:** `company_uuid`, `payload_uuid`, `place_uuid`, `tracking_number_uuid`, `customer_uuid`, `customer_type`, `type`, `order`

---

### 3.12 ServiceRate / ServiceRateFee / ServiceRateParcelFee

| Aspect | Detail |
|--------|--------|
| **Table** | `service_rates` / `service_rate_fees` / `service_rate_parcel_fees` |
| **Admin UI** | FleetOps > Service Rates |
| **Status** | Implemented |

**ServiceRate Fields:** `company_uuid`, `service_area_uuid`, `zone_uuid`, `order_config_uuid`, `service_name`, `service_type`, `base_fee`, `algorithm`, `rate_calculation_method`, COD fee fields, peak hours fields, `currency`, `duration_terms`, `estimated_days`

**Rate Calculation Methods:** Fixed meter, fixed rate, per meter, per drop, algorithm, parcel service

**Key Methods:** `isFixedMeter()`, `isPerMeter()`, `isPerDrop()`, `isAlgorithm()`, `isParcelService()`, `hasPeakHoursFee()`, `isWithinPeakHours()`, `findServiceRateFeeByDistance()`

---

### 3.13 ServiceQuote / ServiceQuoteItem / PurchaseRate

| Aspect | Detail |
|--------|--------|
| **Table** | `service_quotes` / `service_quote_items` / `purchase_rates` |
| **Admin UI** | Quoting system |
| **Status** | Implemented |

**ServiceQuote Key Methods:** `fromLalamoveQuotation()`, `resolveFromRequest()`, `fromIntegratedVendor()`

**PurchaseRate Observer:** `PurchaseRateObserver` — creating (auto-creates Transaction from service quote with line items)

**External Integrations:** Lalamove quotation, Stripe checkout sessions

---

### 3.14 IoT & Telematics (6 Models)

| Model | Table | Admin UI | Status |
|-------|-------|----------|--------|
| Device | `devices` | Partial framework | Partial |
| DeviceEvent | `device_events` | No dedicated UI | Partial |
| Sensor | `sensors` | Minimal | Partial |
| Telematic | `telematics` | Partial | Needs external service |
| VehicleDevice | `devices` (shared) | Partial | Partial |
| VehicleDeviceEvent | `vehicle_device_events` | No UI | Partial |

**Device Key Fields:** `company_uuid`, `vehicle_uuid`, `asset_uuid`, `device_id`, `device_type`, `device_provider`, `imei`, `firmware_version`, `location` (SPATIAL), `heading`, `speed`, `online`, `status`, `data_frequency`

**Device Scopes:** `byType`, `online`, `offline`, `byProvider`

**DeviceEvent Key Logic:** `shouldTriggerAlert()` — auto-generates Alert records for errors/warnings/threshold violations

**Sensor Key Logic:** `recordReading()`, `checkThresholds()` — auto-creates alerts when readings exceed min/max thresholds, `needsCalibration()`

**Telematic External Integration:** `TelematicProviderRegistry` pattern supporting multiple telematics providers; webhook endpoint at `/webhooks/telematics/{providerKey}`

---

### 3.15 Asset Lifecycle (4 Models)

| Model | Table | Admin UI | Status |
|-------|-------|----------|--------|
| Asset | `assets` | Minimal | Minimal |
| Equipment | `equipments` | Minimal | Minimal |
| Part | `parts` | Partial (via maintenance) | Partial |
| Warranty | `warranties` | Partial (via vehicles) | Partial |

**Asset Key Methods:** `calculateDepreciation()`, `estimateReplacementDate()`, `getCurrentValue()`, `getMaintenanceCostTotal()`

**Equipment Key Methods:** `equip()`, `unequip()` (with activity logging), `needsMaintenance()`, `isWarrantyActive()`

**Part Key Methods:** `adjustStock()`, `isLowStock()` (triggers automatic low stock alerts), `getTotalValue()`, `reorder()`

**Warranty Key Methods:** `hasCoverage()`, `getCoverageLimit()`, `coversAmount()`. Scopes: `active`, `expired`, `expiringSoon(days)`.

---

### 3.16 Maintenance (2 Models)

| Model | Table | Admin UI | Status |
|-------|-------|----------|--------|
| Maintenance | `maintenances` | FleetOps > Maintenance (basic) | Partial |
| WorkOrder | `work_orders` | FleetOps > Work Orders (basic) | Partial |

**Maintenance Fields:** `maintainable_uuid`, `maintainable_type` (polymorphic), `vendor_uuid`, `assigned_to_uuid`, `name`, `type`, `priority`, `status`, `scheduled_date`, `completed_date`, `next_due_date`, `odometer_at_service`, `labor_cost`, `parts_cost`, `total_cost`, `currency`

**Maintenance Key Methods:** `complete()`, `calculateTotalCost()`, `isOverdue()`, `scheduleNext()`, `getEfficiencyMetrics()`

**WorkOrder Key Methods:** `complete()`, `getCompletionPercentage()` (checklist tracking), `calculateTotalCost()`, `isOverdue()`

---

### 3.17 Other FleetOps Models

| Model | Table | Key Purpose | Admin UI |
|-------|-------|-------------|----------|
| FuelReport | `fuel_reports` | Fuel consumption tracking | FleetOps > Fuel Reports |
| Issue | `issues` | Issue/incident tracking | FleetOps > Issues |
| Proof | `proofs` | Proof of delivery | Internal (via orders) |
| Route | `routes` | Order routing | Internal |
| Position | `positions` | GPS position tracking | Internal |
| IntegratedVendor | `integrated_vendors` | Third-party vendor integration | FleetOps > Settings |

**IntegratedVendor Key Methods:** `provider()` (resolves via IntegratedVendors support), `api()`, `serviceTypes()`, `countries()`. Boot hooks call provider `onCreated`/`onUpdated`/`onDeleted`. Currently supports Lalamove.

---

### 3.18 FleetOps Observers Summary

| Observer | Hooks | Key Behavior |
|----------|-------|--------------|
| OrderObserver | created, updating, updated, deleted | Cache invalidation, ensure started, tracking |
| DriverObserver | creating, created, updated, deleting, deleted | User association, sync, cascade cleanup |
| VehicleObserver | created, updating, deleted | Tracking number, VIN processing, cleanup |
| ContactObserver | creating, saving, deleted | Validation, uniqueness, cleanup |
| PayloadObserver | created | Tracking number generation |
| PlaceObserver | creating, created, updated, deleted | Geocoding, activity logging |
| FleetObserver | deleted | Cascade cleanup |
| TrackingNumberObserver | creating, created | Number/barcode/QR generation, initial status |
| PurchaseRateObserver | creating | Transaction creation |
| ServiceAreaObserver | creating, deleted | Defaults, cascade zone deletion |
| ServiceRateObserver | created, updated, deleted | Rate fee synchronization |
| CompanyObserver | created | FleetOps company setup |
| CompanyUserObserver | deleted, updated | Driver/contact cleanup |
| CategoryObserver | deleted | Cascade cleanup |
| UserObserver | deleted | Driver/contact cleanup |

---

## 4. Storefront Engine

**Total Models:** 25  
**Base Class:** `StorefrontModel` (sets DB connection from `config('storefront.connection.db')`)

### 4.1 Store

| Aspect | Detail |
|--------|--------|
| **Table** | `stores` |
| **Admin UI** | Storefront > Stores |
| **Status** | Implemented |

**Key Fields:** `created_by_uuid`, `company_uuid`, `logo_uuid`, `backdrop_uuid`, `order_config_uuid`, `key`, `online`, `name`, `description`, `translations`, `website`, `facebook`, `instagram`, `twitter`, `email`, `phone`, `tags`, `currency`, `meta` (JSON), `timezone`, `pod_method`, `options` (JSON), `alertable`, `slug`

**Relationships:**
- belongsTo: `createdBy`, `company`, `logo`, `backdrop`, `orderConfig`
- hasMany: `files`, `categories`, `products`, `checkouts`, `hours`, `reviews`, `votes`, `notificationChannels`, `gateways`, `locations`, `networkStores`
- belongsToMany: `networks` (via network_stores)

**Key Methods:** `createCategory()`, `createProduct()`, `createLocation()`, `getOrderConfig()`, rating calculation from reviews

---

### 4.2 Network / NetworkStore

| Aspect | Detail |
|--------|--------|
| **Table** | `networks` / `network_stores` |
| **Admin UI** | Storefront > Networks |
| **Status** | Implemented |

**Network:** Multi-vendor marketplace concept. Similar fields to Store. Relationships: `stores` (belongsToMany via network_stores), `gateways`, `notificationChannels`, `invitations`, `categories`.

**Key Methods:** `addStore()`, `createCategory()`, `getOrderConfig()`

---

### 4.3 Product System (6 Models)

| Model | Table | Admin UI |
|-------|-------|----------|
| Product | `products` | Storefront > Products |
| ProductVariant | `product_variants` | Storefront > Products (nested) |
| ProductVariantOption | `product_variant_options` | Storefront > Products (nested) |
| ProductAddon | `product_addons` | Storefront > Products (nested) |
| ProductAddonCategory | `product_addon_categories` | Storefront > Products (nested) |
| ProductHour | `product_hours` | Storefront > Products (nested) |

**Product Fields:** `company_uuid`, `store_uuid`, `category_uuid`, `name`, `description`, `sku`, `price`, `currency`, `sale_price`, `is_service`, `is_bookable`, `is_available`, `is_on_sale`, `is_recommended`, `can_pickup`, `status`

**Product Boot:** Generates QR Code & Barcode on creation (DNS2D).

**Product Key Methods:** `setAddonCategories()`, `setProductVariants()`, `toEntity()`, `createAsEntity()` — converts storefront product to FleetOps Entity for order fulfillment.

**Product Hierarchy:** Product → ProductVariant → ProductVariantOption (configurable product options), Product → ProductAddonCategory → ProductAddon (add-on items)

---

### 4.4 Catalog System (4 Models)

| Model | Table | Admin UI |
|-------|-------|----------|
| Catalog | `catalogs` | Storefront > Catalogs |
| CatalogCategory | (extends Category) | Storefront > Catalogs (nested) |
| CatalogHour | `catalog_hours` | Storefront > Catalogs (nested) |
| CatalogProduct | (pivot) | Internal |

**Catalog Relationships:** `hours`, `categories` (hasMany CatalogCategory), `subjects` (morphToMany via catalog_subjects)

**CatalogCategory Key Methods:** `setProducts()` — manages product pivot entries. Sets `for` = `storefront_catalog` on creation.

---

### 4.5 Customer

| Aspect | Detail |
|--------|--------|
| **Table** | Extends `Contact` from core |
| **Admin UI** | Storefront > Customers |
| **Status** | Implemented |

**Additional Relationships:** `orders`, `gateways` (belongsToMany via payment_methods), `paymentMethods`, `reviews`, `votes`

**Stripe Integration:** `getStripeCustomerId()`, `findStripeCustomer()`, `createAsStripeCustomer()`, `createStripePaymentMethod()`, `createStripeSetupIntent()`

---

### 4.6 Gateway / PaymentMethod / Checkout

| Model | Table | Admin UI |
|-------|-------|----------|
| Gateway | `gateways` | Storefront > Gateways |
| PaymentMethod | `payment_methods` | Internal |
| Checkout | `checkouts` | Internal (checkout flow) |

**Gateway Fields:** `owner_uuid`, `owner_type` (polymorphic — Store or Network), `name`, `code`, `type`, `sandbox`, `config` (JSON — credentials), `return_url`, `callback_url`

**Gateway Types:** `stripe`, `qpay`, and extensible

**Checkout Fields:** `store_uuid`, `network_uuid`, `cart_uuid`, `gateway_uuid`, `service_quote_uuid`, `amount`, `currency`, `is_cod`, `is_pickup`, `options` (JSON), `token`

---

### 4.7 Cart

| Aspect | Detail |
|--------|--------|
| **Table** | `carts` |
| **Admin UI** | None (API-driven) |
| **Status** | Working |

**Fields:** `company_uuid`, `unique_id`, `currency`, `discount_code`, `expires_at`

**Relationships:** `items()` → hasMany Entity (via `cart_uuid`), `checkout()` → hasOne Checkout

**Key Methods:** `isEmpty()`, `itemCount()`, `subtotal()`, `add()`

---

### 4.8 Review / Vote

| Aspect | Detail |
|--------|--------|
| **Tables** | `reviews` / `votes` |
| **Admin UI** | Partial |
| **Status** | Partial |

**Review:** Polymorphic `subject`. Fields: `customer_uuid`, `rating`, `content`, `rejected`. Has `votes`, `files`, `photos`, `videos`.

---

### 4.9 Other Storefront Models

| Model | Purpose |
|-------|---------|
| NotificationChannel | APN/FCM push notification gateway config |
| StoreLocation | Store physical locations (links to Place) |
| StoreHour | Operating hours per StoreLocation |
| ProductStoreLocation | Product availability at locations |
| FoodTruck | Links Vehicle + Store + ServiceArea/Zone |
| AddonCategory | Category extension for product add-ons |

### 4.10 Storefront API Routes

**Consumer API (v1, `storefront.api` middleware):**
- Store: lookup, about, locations, gateways, search
- Network: stores listing, store-locations, tags
- Checkouts: before, status, capture (Stripe/QPay)
- Customers: CRUD, auth (SMS, Apple, Facebook, Google), Stripe ephemeral keys/setup intents, phone verification, account closure
- Carts: CRUD with item management
- Service quotes, categories, products, food-trucks, reviews

**Internal API (`fleetbase.protected`):**
- Order management: accept, ready, preparing, completed
- Network management: categories, store management, invites
- Full CRUD for all models
- Product imports, metrics

---

## 5. Pallet Engine

**Total Models:** 15  
**Notable:** Extends FleetOps models (Product → Entity, Supplier → Vendor, Warehouse → Place)

### 5.1 Core Models

| Model | Extends | Table | Admin UI |
|-------|---------|-------|----------|
| Product | FleetOps Entity | `entities` | Pallet > Products |
| Supplier | FleetOps Vendor | `vendors` | Pallet > Suppliers |
| Warehouse | FleetOps Place | `places` | Pallet > Warehouses |

**Warehouse eager loads:** `sections`. Additional relationships: `sections` → hasMany WarehouseSection, `docks` → hasMany WarehouseDock.

### 5.2 Warehouse Hierarchy (5 Models)

```
Warehouse (extends Place)
  └── WarehouseSection (pallet_warehouse_sections)
       └── WarehouseAisle (pallet_warehouse_aisles)
            └── WarehouseRack (pallet_warehouse_racks)
                 └── WarehouseBin (pallet_warehouse_bins)
  └── WarehouseDock (pallet_warehouse_docks)
```

Each level has: `company_uuid`, `created_by_uuid`, parent FK, name/number, `meta` (JSON)

**WarehouseRack** adds: `capacity`
**WarehouseBin** adds: `size`, `max_weight`
**WarehouseDock** adds: `dock_number`, `direction`, `capacity`, `status`, `type`

### 5.3 Inventory

| Aspect | Detail |
|--------|--------|
| **Table** | `pallet_inventories` |
| **Admin UI** | Pallet > Inventory |
| **Status** | Implemented |

**Fields:** `supplier_uuid`, `company_uuid`, `manufactured_date_at`, `expiry_date_at`, `product_uuid`, `warehouse_uuid`, `batch_uuid`, `quantity`, `min_quantity`, `comments`, `status`

**Relationships:** `product`, `supplier`, `warehouse` (→ Place), `batch`

**Scopes:** `summarizeByProduct` — aggregates inventory by product with sum of quantities

### 5.4 Batch

| Aspect | Detail |
|--------|--------|
| **Table** | `pallet_batches` |
| **Admin UI** | Pallet > Batches |

**Fields:** `batch_number`, `product_uuid`, `manufacture_date_at`, `expiry_date_at`, `quantity`

### 5.5 PurchaseOrder / SalesOrder

| Model | Table | Admin UI |
|-------|-------|----------|
| PurchaseOrder | `pallet_purchase_orders` | Pallet > Purchase Orders |
| SalesOrder | `pallet_sales_orders` | Pallet > Sales Orders |

**Common Fields:** `company_uuid`, `supplier_uuid`, `transaction_uuid`, `assigned_to_uuid`, `point_of_contact_uuid`, `reference_code`, `reference_url`, `description`, `comments`, `currency`, `status`, `expected_delivery_at`

**Relationships:** `supplier` → Supplier, `transaction` → Transaction, `assignedTo` → User, `pointOfContact` → Contact

### 5.6 StockAdjustment / StockTransaction

| Model | Table | Admin UI |
|-------|-------|----------|
| StockAdjustment | `pallet_stock_adjustment` | Pallet > Stock Adjustments |
| StockTransaction | `pallet_stock_transactions` | Internal |

**StockAdjustment Fields:** `product_uuid`, `assignee_uuid`, `type`, `reason`, `approval_required`, `before_quantity`, `after_quantity`, `quantity`

**StockTransaction Fields:** `product_uuid`, `transaction_type`, `quantity`, `transaction_date_at`, `source_uuid`, `source_type`, `destination_uuid`

### 5.7 Audit

| Aspect | Detail |
|--------|--------|
| **Table** | `pallet_audits` |
| **Fields** | `user_uuid`, `action`, `auditable_type`, `auditable_uuid`, `old_values`, `new_values` |

### Pallet API Routes

**Internal API (`fleetbase.protected`):**
- CRUD + bulk-delete for: batches, inventories, products, sales-orders, purchase-orders, stock-adjustments, suppliers, warehouses
- Warehouse hierarchy: sections, aisles, racks, bins, docks CRUD

**No external integration points** — pure internal warehouse/inventory management

---

## 6. CityOS Engine

**Total Models:** 17  
**Key Feature:** Multi-hierarchy governance with external integrations

### 6.1 Tenant (Central Model)

| Aspect | Detail |
|--------|--------|
| **Table** | `cityos_tenants` |
| **Admin UI** | CityOS > Tenants |
| **Status** | Implemented |

**Key Fields:** `company_uuid`, `country_uuid`, `city_uuid`, `sector_uuid`, `category_uuid`, `parent_tenant_uuid`, `tenant_tier`, `region_uuid`, `governance_authority_uuid`, `residency_zone`, `data_classification_default`, `handle`, `name`, `name_ar`, `type`, `subscription_tier`, `status`, `domain`, `subdomain`

**External Integration Fields:**
- `medusa_tenant_id` — Medusa e-commerce platform
- `payload_tenant_id` — Payload CMS
- `cms_tenant_id` — CMS system
- `erpnext_company` — ERPNext ERP system

**Additional Fields:** `branding` (JSON), `settings` (JSON), `meta` (JSON), `feature_flags` (JSON)

**Relationships:**
- belongsTo: `company`, `country`, `city`, `sector`, `category`, `region`, `governanceAuthority`, `parentTenant`
- hasMany: `childTenants`, `channels`, `portals`, `policies`

**Key Methods:** `getAncestryChain()`, `getAncestryTenants()`, `isMaster()`, `isGlobal()`, `getNodeContext()`

**Tier System:** TIER_MASTER, TIER_GLOBAL, TIER_COUNTRY

---

### 6.2 Geographic Hierarchy (4 Models)

| Model | Table | Relationships |
|-------|-------|---------------|
| Region | `cityos_regions` | hasMany: countries, policies, tenants |
| Country | `cityos_countries` | belongsTo: region. hasMany: cities, tenants, governanceAuthorities, policies |
| City | `cityos_cities` | belongsTo: country. hasMany: sectors, tenants |
| Sector | `cityos_sectors` | belongsTo: city. hasMany: categories, tenants |

**Region Fields:** `code`, `name`, `name_ar`, `residency_zone`, `data_residency_policy`, `compliance_policy`, `classification_policy`

**Country Fields:** `code`, `region_uuid`, `name`, `name_ar`, `currency_code`, `default_locale`, `processing_region`, `residency_class`, `policies` (JSON), `settings` (JSON), `cms_country_id`

**City Fields:** `country_uuid`, `name`, `name_ar`, `theme`, `timezone`, `geo_boundary`, `meta`

**Sector Fields:** `cms_scope_id`, `city_uuid`, `name`, `name_ar`, `description`

---

### 6.3 Channel / Surface / Portal

| Model | Table | Key Integration |
|-------|-------|-----------------|
| Channel | `cityos_channels` | `medusa_sales_channel_id` (Medusa) |
| Surface | `cityos_surfaces` | None |
| Portal | `cityos_portals` | `cms_portal_id` (CMS), `payload_store_id` (Payload CMS), `medusa_store_id` (Medusa) |

**Channel → Surface → Portal** hierarchy represents the commerce/content delivery stack:
- **Channel:** Sales channel (online, POS, marketplace) linked to Medusa sales channel
- **Surface:** Presentation layer (web, mobile, kiosk)
- **Portal:** Customer-facing endpoint with domain/subdomain routing

---

### 6.4 Store (CityOS)

| Aspect | Detail |
|--------|--------|
| **Table** | `cityos_stores` |
| **Admin UI** | CityOS > Stores |

**Fields:** `cms_store_id`, `tenant_uuid`, `portal_uuid`, `country_uuid`, `name`, `name_ar`, `type`, `domain`, `subdomain`, `timezone`, `locale`, `currency`, `branding` (JSON), `settings` (JSON)

---

### 6.5 GovernanceAuthority

| Aspect | Detail |
|--------|--------|
| **Table** | `cityos_governance_authorities` |
| **Admin UI** | CityOS > Governance |

**Fields:** `cms_authority_id`, `country_uuid`, `parent_authority_uuid`, `code`, `name`, `name_ar`, `type`, `jurisdiction`, `mandates` (JSON), `compliance_requirements` (JSON), `data_handling_rules` (JSON)

**Self-referential:** `parentAuthority` / `childAuthorities` for hierarchy

**Key Methods:** `getAncestryChain()` — recursive hierarchy traversal

---

### 6.6 Policy (CityOS)

| Aspect | Detail |
|--------|--------|
| **Table** | `cityos_policies` |
| **Admin UI** | CityOS > Policies |

**Fields:** `authority_uuid`, `region_uuid`, `country_uuid`, `tenant_uuid`, `name`, `type`, `scope`, `priority`, `policy_data` (JSON), `enforced`, `status`

**Key Methods:** `isEnforced()` — checks active + enforced status

---

### 6.7 Node

| Aspect | Detail |
|--------|--------|
| **Table** | `cityos_nodes` |
| **Admin UI** | CityOS > Hierarchy |

**Fields:** `parent_uuid`, `cms_node_id`, `type`, `name`, `name_ar`, `code`, `country_uuid`, `city_uuid`, `coordinates_lat`, `coordinates_lng`, `coordinates_alt`, `depth`, `path`, `stewardship_state`, `stewardship_tenant_uuid`

**Hierarchy Types (allowed children):**
```
region → city → district → neighborhood → poi
```

**Key Methods:** `validateParentType()`, `canTransitionStewardship()`, `getAncestryPath()`, `getDepthFromRoot()`, `buildPath()`

---

### 6.8 Category (CityOS)

| Aspect | Detail |
|--------|--------|
| **Table** | `cityos_categories` |
| **Fields** | `cms_category_id`, `sector_uuid`, `parent_uuid`, `name`, `name_ar`, `level`, `icon`, `sort_order` |

**Scopes:** `topLevel` (no parent), `subcategories` (has parent)

---

### 6.9 FeatureFlag

| Aspect | Detail |
|--------|--------|
| **Table** | `cityos_feature_flags` |
| **Fields** | `key`, `name`, `description`, `enabled`, `conditions` (JSON) |

**Key Methods:** `evaluate()` — evaluates conditions against context (`tenant_tier`, `node_type`, `user_roles`)

---

### 6.10 OutboxEvent

| Aspect | Detail |
|--------|--------|
| **Table** | `cityos_outbox` |
| **Admin UI** | No dedicated UI |

**Fields:** `event_id`, `event_type`, `tenant_id`, `payload` (JSON), `correlation_id`, `node_context` (JSON), `status`, `retry_count`, `max_retries`, `error_message`, `published_at`, `next_retry_at`

**Lifecycle Methods:** `isPending()`, `isPublished()`, `isFailed()`, `isDeadLetter()`, `markPublished()`, `markFailed()`

**Retry Logic:** Exponential backoff: `2^retry_count * 30` seconds

---

### 6.11 IntegrationLog

| Aspect | Detail |
|--------|--------|
| **Table** | `cityos_integration_logs` |
| **Admin UI** | No dedicated UI |

**Fields:** `integration`, `operation`, `direction`, `status`, `correlation_id`, `request_data` (JSON), `response_data` (JSON), `error_message`, `response_code`, `duration_ms`

**Static Factory:** `logRequest()` — creates integration audit entries

---

### 6.12 WorkflowRegistry

| Aspect | Detail |
|--------|--------|
| **Table** | `cityos_workflow_registry` |
| **Admin UI** | Partial (needs Temporal Cloud) |

**Fields:** `workflow_type`, `display_name`, `description`, `domain_pack`, `source`, `source_system`, `is_active`, `execution_count`, `task_queues` (JSON), `tags`, `status_counts` (JSON), `input_schema` (JSON), `output_schema` (JSON), `retry_policy` (JSON), `first_seen_at`, `last_seen_at`

---

### 6.13 CityOS Observers

| Observer | Behavior |
|----------|----------|
| **NodeContextStampObserver** | Auto-stamps `tenant_uuid`, `country_code`, `city_uuid`, `sector_uuid` on creating/updating models with those columns. Falls back to company→Tenant mapping. |
| **OutboxLoggingObserver** | Creates OutboxEvent for CREATED/UPDATED/DELETED events when `cityos.event_bridge.enabled` is true. Tags source module (fleetops/pallet/storefront/core). |

### 6.14 CityOS API Routes

**Internal API:**
- CRUD: countries, cities, sectors, categories, tenants, channels, surfaces, portals, regions, governance-authorities, policies, feature-flags, nodes
- Hierarchy: tree view, resolve, stats
- Governance: resolve, tenantHierarchy, compliance, featureFlags, nodeTree

**Integration Routes:**
- Temporal: connection status, workflow listing/details, sync
- CMS (Payload): health, nodes, tenants, POIs, collections, governance, storage, sync
- ERPNext: status, settlement
- Outbox: stats, dispatch, publish, recent

**Webhook:** `api/webhooks/cityos` for CMS webhook reception

---

## 7. External Integration Map

### 7.1 Stripe (Payment Gateway)

| Component | Integration Point |
|-----------|-------------------|
| Company | `stripe_customer_id`, `stripe_connect_id` |
| Transaction | `gateway_transaction_id`, `gateway` = 'stripe' |
| Gateway (Storefront) | `type` = 'stripe', `config` stores API keys |
| Customer (Storefront) | `createAsStripeCustomer()`, `createStripePaymentMethod()`, `createStripeSetupIntent()` |
| Checkout (Storefront) | Stripe payment intent/setup intent capture |
| ServiceQuote (FleetOps) | Stripe checkout sessions |

**Status:** Implemented. Gateway model stores credentials. Customer model has full Stripe customer lifecycle.

### 7.2 QPay (Payment Gateway)

| Component | Integration Point |
|-----------|-------------------|
| Gateway (Storefront) | `type` = 'qpay', `config` stores credentials |
| Checkout (Storefront) | QPay callback capture route |

**Route:** `checkouts/capture-qpay` — public callback endpoint

**Status:** Implemented. Callback flow working.

### 7.3 Twilio (SMS)

| Component | Integration Point |
|-----------|-------------------|
| VerificationCode | SMS verification via `SmsService` |
| Driver | SMS login/verification (`login-with-sms`, `verify-code`) |
| Contact | `routeNotificationForTwilio()` |
| User | `routeNotificationForTwilio()` |
| Setting | `test-twilio-config` endpoint |
| SmsService | Provider routing: default Twilio, +976 → CallPro |

**Current Status:** Configured with trial account. Geo-restricted (cannot send to Saudi Arabia +966). Bypass code `999000` available.

### 7.4 Payload CMS

| Component | Integration Point |
|-----------|-------------------|
| Tenant | `payload_tenant_id` |
| Portal | `payload_store_id` |
| PayloadCMSService | HTTP integration for content management |

**CMS Sync Operations:** nodes, tenants, POIs, collections, governance, storage

**Routes:** `cityos/integrations/cms/*` — health, sync endpoints, webhook reception at `api/webhooks/cityos`

**Status:** Service implemented. Requires external Payload CMS instance.

### 7.5 Medusa (E-Commerce)

| Component | Integration Point |
|-----------|-------------------|
| Tenant | `medusa_tenant_id` |
| Channel | `medusa_sales_channel_id` |
| Portal | `medusa_store_id` |

**Status:** Field-level integration. CityOS models store Medusa IDs for cross-referencing. No dedicated MedusaService found — integration appears to be ID-mapping based.

### 7.6 ERPNext (ERP)

| Component | Integration Point |
|-----------|-------------------|
| Tenant | `erpnext_company` |
| ERPNextService | HTTP POST integration for financial/ERP event sync |

**Routes:** `cityos/integrations/erpnext/status`, `cityos/integrations/erpnext/settlement`

**Status:** Service implemented. Requires external ERPNext instance.

### 7.7 Temporal (Workflow Engine)

| Component | Integration Point |
|-----------|-------------------|
| WorkflowRegistry | Tracks workflow types, task queues, execution counts |
| TemporalService | gRPC integration for workflow orchestration |
| TemporalCliBridge | CLI bridge for Temporal operations |

**Routes:** `cityos/integrations/temporal/status`, `cityos/integrations/temporal/workflows`, `cityos/integrations/temporal/sync`

**Status:** Service implemented. Requires Temporal Cloud connection (not currently active).

### 7.8 walt.id (Identity)

**Status:** No direct integration found in current codebase. No model fields, services, or routes reference walt.id. This would be a future integration for decentralized identity/verifiable credentials.

### 7.9 Lalamove (Logistics)

| Component | Integration Point |
|-----------|-------------------|
| IntegratedVendor | Provider pattern for third-party logistics |
| ServiceQuote | `fromLalamoveQuotation()` |

**Status:** Implemented via the IntegratedVendor extensible provider framework.

### 7.10 FCM/APN (Push Notifications)

| Component | Integration Point |
|-----------|-------------------|
| Driver | `routeNotificationForFcm()`, `routeNotificationForApn()` |
| Contact | Push notification routing |
| UserDevice | Token storage |
| NotificationChannel (Storefront) | APN/FCM gateway config |

**Status:** Implemented. Driver and Contact models support both FCM and APN.

### 7.11 Google Maps

| Component | Integration Point |
|-----------|-------------------|
| Place | `fillWithGoogleAddress()`, `createFromGeocodingLookup()`, `createFromReverseGeocodingLookup()` |

**Status:** Implemented. Used for geocoding and reverse geocoding in Place model.

---

## 8. Cross-Engine Dependencies

```
                    ┌──────────────┐
                    │   Core API   │
                    │  (Foundation) │
                    └──────┬───────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
    │   FleetOps  │ │  Storefront │ │   CityOS    │
    │ (Logistics) │ │ (Commerce)  │ │ (Governance)│
    └──────┬──────┘ └──────┬──────┘ └─────────────┘
           │               │
    ┌──────▼──────┐        │
    │   Pallet    │        │
    │ (Warehouse) │◄───────┘
    └─────────────┘
```

### Core API → All Engines
- User, Company, CompanyUser — identity & multi-tenancy
- File — file storage
- Category — shared categorization
- Transaction — billing/payments
- Setting — configuration
- ApiCredential — API access
- Activity — audit logging
- Notification — notifications
- VerificationCode — SMS/email verification

### FleetOps → Storefront
- OrderConfig — shared order configuration
- Contact → Customer (Storefront extends Contact)
- Entity — Product.toEntity() converts Storefront products to FleetOps entities for fulfillment

### FleetOps → Pallet
- Entity → Product (Pallet Product extends FleetOps Entity)
- Vendor → Supplier (Pallet Supplier extends FleetOps Vendor)
- Place → Warehouse (Pallet Warehouse extends FleetOps Place)

### CityOS → All
- NodeContextStampObserver — stamps tenant/country/city/sector on all models
- OutboxLoggingObserver — creates outbox events for all model lifecycle changes
- FeatureFlag — gates features across all engines

---

## 9. Gaps & Risks

### 9.1 Missing or Incomplete UI

| Area | Gap | Status | Notes |
|------|-----|--------|-------|
| Fleet Maintenance | Maintenance/WorkOrder/Part/Warranty UI | **BACKEND COMPLETE** | API endpoints: complete, schedule-next, overdue, cost-summary (Maintenance), assign/start/complete/summary (WorkOrder), low-stock (Part), expiring/stats (Warranty). Frontend UI pending. |
| IoT/Telematics | Device/Sensor/Telematic UI | **BACKEND COMPLETE** | API endpoints: events/ping/status-summary/decommission (Device), readings POST+GET/alerts (Sensor), history/sync (Telematic). Frontend UI pending. |
| Reporting | Report model has full backend but limited frontend | PENDING | No changes yet |
| OutboxEvent | Admin visibility | **RESOLVED** | 7 API endpoints: index, stats, detail, retry, batch-retry, dead-letter, delete. Controller: OutboxEventController.php |
| IntegrationLog | Admin visibility | **RESOLVED** | 4 API endpoints: index, stats, detail, purge. Controller: IntegrationLogController.php |
| LoginAttempt | Security audit visibility | **RESOLVED** | 4 API endpoints: index, stats, suspicious detection, purge. masked_identity accessor on model. Controller: LoginAttemptController.php |
| Reviews/Votes | Customer review management | **BACKEND COMPLETE** | 5 API endpoints: approve, reject, respond, pending queue, stats. Migration adds status/admin_response/approved_at/rejected_at/rejection_reason columns. Frontend UI pending. |

### 9.2 External Integration Risks

| Integration | Risk | Status | Notes |
|-------------|------|--------|-------|
| Medusa | No dedicated service | **STUB CREATED** | MedusaService with 8 methods (syncProducts/Orders/Customers/Inventory, handleWebhook, getProduct, createProduct, updateProduct). MedusaController with 4 endpoints (status, sync/products, sync/orders, webhook). Config: medusa.php. Needs MEDUSA_BASE_URL/API_KEY/PUBLISHABLE_KEY env vars. |
| Temporal | WorkflowRegistry non-functional | PENDING | Requires Temporal Cloud provisioned |
| Payload CMS | Requires external instance | PENDING | Sync service exists but needs Payload deployed |
| ERPNext | Requires external instance | PENDING | Financial sync blocked |
| walt.id | No integration | PENDING | Decentralized identity not started |
| Twilio | Bypass code security | **RESOLVED** | Bypass code (999000) now blocked in production via environment guard in both API and Internal DriverControllers |

### 9.3 Architectural Concerns

| Concern | Detail | Status |
|---------|--------|--------|
| **Spatial/PostGIS** | `laravel-mysql-spatial` package | **HARDENED** — Geometry.php: added fromPostgisWKB() for hex EWKB parsing. MySqlGrammar.php: all 8 type methods return PostGIS syntax when pgsql driver detected. GIST index compilation added. |
| **Database naming** | Connection named 'mysql' but uses PostgreSQL | UNCHANGED — accepted risk |
| **Model count** | ~127 models across 5 engines | UNCHANGED |
| **Observer density** | 16+ observers in FleetOps | **AUDITED** — 15 observers documented. Chain risks identified: VehicleObserver->Driver, Driver->Order via observers |
| **Event bridge** | OutboxLoggingObserver performance | Admin dashboard now available for monitoring |

### 9.4 Data Relationship Risks

| Risk | Detail | Status |
|------|--------|--------|
| **Cascade deletion** | Inconsistent patterns | **PARTIALLY FIXED** — OrderObserver: added cleanup for trackingStatuses, proofs, comments, files. FleetObserver: added FleetDriver/FleetVehicle pivot cleanup. **Critical fix**: VehicleObserver no longer cascade-deletes drivers — now unassigns vehicle (sets vehicle_uuid=null). |
| **Orphaned records** | SoftDeletes inconsistency | UNCHANGED |
| **UUID generation** | Model-level only | UNCHANGED |
| **Cross-engine FK** | Pallet extends FleetOps | UNCHANGED |

---

## 10. Implementation Changelog

### 2026-02-13: Gap Implementation Sprint

#### Gap 13: Twilio Bypass Code Security ✅
- **Files:** DriverController.php (API + Internal)
- **Change:** Bypass code (999000) only accepted in local/development/testing environments
- **Security:** Production requests with bypass code are rejected

#### Gap 4: OutboxEvent Admin API ✅
- **Controller:** `api/vendor/fleetbase/cityos-api/src/Http/Controllers/OutboxEventController.php`
- **Endpoints (7):** GET index (paginated, filtered), GET stats (counts by status), GET {id} (detail), POST {id}/retry, POST retry-all-failed, POST {id}/dead-letter, DELETE {id}
- **Route prefix:** `cityos/int/v1/outbox-events`

#### Gap 5: IntegrationLog Admin API ✅
- **Controller:** `api/vendor/fleetbase/cityos-api/src/Http/Controllers/IntegrationLogController.php`
- **Endpoints (4):** GET index, GET stats (success rate, avg duration, per-integration breakdown), GET {id}, DELETE purge (configurable days)
- **Route prefix:** `cityos/int/v1/integration-logs`

#### Gap 6: LoginAttempt Security Audit API ✅
- **Controller:** `api/vendor/fleetbase/core-api/src/Http/Controllers/Internal/v1/LoginAttemptController.php`
- **Model enhancement:** masked_identity accessor (first 3 chars + ***)
- **Endpoints (4):** GET index, GET stats (24h/7d/30d + hourly trends), GET suspicious (>5 failures in 10min), DELETE purge
- **Route prefix:** `int/v1/login-attempts`

#### Gap 1: Fleet Maintenance API ✅
- **Controller:** MaintenanceController.php extensions
- **New endpoints:** POST {id}/complete, POST {id}/schedule-next, GET overdue, GET cost-summary
- **WorkOrderController extensions:** POST {id}/assign, POST {id}/start, POST {id}/complete, GET summary
- **PartController extensions:** GET low-stock
- **WarrantyController extensions:** GET expiring, GET stats

#### Gap 2: IoT/Telematics API ✅
- **DeviceController extensions:** GET {id}/events, POST {id}/ping, GET status-summary, POST {id}/decommission
- **SensorController extensions:** POST {id}/readings, GET {id}/readings, GET alerts
- **TelematicController extensions:** GET {id}/history, POST {id}/sync

#### Gap 7: Review Management API ✅
- **Migration:** Added status, admin_response, approved_at, rejected_at, rejection_reason to reviews table
- **Model:** Added pending/approved/rejected scopes
- **Controller:** POST {id}/approve, POST {id}/reject, POST {id}/respond, GET pending, GET stats (rating breakdown)
- **Route prefix:** `storefront/int/v1/reviews`

#### Gap 8: MedusaService Stub ✅
- **Service:** `api/vendor/fleetbase/storefront-api/server/src/Services/MedusaService.php`
- **Controller:** `api/vendor/fleetbase/storefront-api/server/src/Http/Controllers/MedusaController.php`
- **Config:** `api/vendor/fleetbase/storefront-api/server/config/medusa.php`
- **Methods:** syncProducts, syncOrders, syncCustomers, syncInventory, handleWebhook, getProduct, createProduct, updateProduct
- **Endpoints:** GET status, POST sync/products, POST sync/orders, POST webhook
- **Env vars needed:** MEDUSA_BASE_URL, MEDUSA_API_KEY, MEDUSA_PUBLISHABLE_KEY

#### Gap 14: PostGIS Spatial Hardening ✅
- **Geometry.php:** Added isPostgres() and fromPostgisWKB() for hex-encoded EWKB parsing
- **MySqlGrammar.php:** All 8 type methods detect pgsql driver and return geometry(Type, 4326) syntax; compileSpatial() generates GIST indexes for PostGIS

#### Gap 14: Observer Audit & Cascade Fixes ✅
- **Audited:** 15 FleetOps observers documented with event handlers
- **OrderObserver:** Added cascade cleanup for trackingStatuses, proofs, comments, files
- **FleetObserver:** Added cascade cleanup for FleetDriver/FleetVehicle pivot records
- **VehicleObserver:** CRITICAL FIX — Changed Driver::delete() to Driver::update(vehicle_uuid=null) on vehicle deletion. Previously deleting a vehicle would cascade-delete all assigned drivers.

### Remaining Gaps (Not Yet Implemented)

| Gap | Description | Blocking Factor |
|-----|-------------|-----------------|
| Gap 3 | Report Builder Visual UI | Requires frontend engine source |
| Gap 9 | walt.id Decentralized Identity | Greenfield — needs walt.id instance |
| Gap 10 | Temporal Cloud Workflows | Needs Temporal Cloud namespace/API key |
| Gap 11 | CMS Full Sync completion | Needs Payload CMS API key permissions |
| Gap 12 | ERPNext Financial Integration | Needs ERPNext instance deployed |
| UI work | Frontend for all new APIs | FleetOps/Storefront/Pallet engines are npm packages; CityOS engine is local |

---

*Sections 1-10 completed — Sections 11-15 appended below*

---

## 11. Complete Model Relationship Map

Total models across all engines: **150** (49 Core API + 42 FleetOps + 28 Storefront + 14 Pallet + 17 CityOS)

### 11.1 Core API Engine (49 Models)

#### Activity
- No explicit Eloquent relationships (uses Spatie Activity Log trait)

#### Alert
- **belongsTo**: User (acknowledged_by_uuid), User (resolved_by_uuid)
- **morphTo**: subject()

#### ApiCredential
- **belongsTo**: User (withoutGlobalScopes), Company (withoutGlobalScopes)

#### ApiEvent
- **belongsTo**: Company, ApiCredential

#### ApiRequestLog
- **belongsTo**: Company, ApiCredential

#### Category
- **belongsTo**: Category (parent_uuid — self-referential), File (icon_file_uuid)
- **hasMany**: Category (parent_uuid — children)

#### ChatAttachment
- **belongsTo**: ChatParticipant (sender_uuid), ChatChannel, ChatMessage, File (file_uuid)

#### ChatChannel
- **belongsTo**: Company, User (created_by_uuid, withTrashed)
- **hasOne**: ChatMessage (latest)
- **hasMany**: ChatParticipant (whereHas user), ChatMessage, ChatAttachment (where chat_message_uuid null), ChatLog

#### ChatLog
- **belongsTo**: Company, ChatChannel, ChatParticipant (initiator_uuid)

#### ChatMessage
- **belongsTo**: ChatParticipant (sender_uuid, withTrashed), ChatChannel
- **hasMany**: ChatAttachment, ChatReceipt (whereHas participant)

#### ChatParticipant
- **belongsTo**: User (withTrashed), ChatChannel

#### ChatReceipt
- **belongsTo**: ChatParticipant, ChatMessage

#### Comment
- **morphTo**: subject (subject_type, subject_uuid)
- **belongsTo**: Company, User, Comment (parent — without replies)
- **hasMany**: Comment (parent_comment_uuid — replies, without parent)

#### Company
- **belongsTo**: User (owner, whereHas anyCompanyUser), User (created_by), File (logo), File (backdrop)
- **belongsToMany**: User (via company_users pivot)
- **hasManyThrough**: User (through CompanyUser)
- **hasMany**: Driver, ApiCredential

#### CompanyUser
- **belongsTo**: User, Company

#### CustomField
- **morphTo**: subject (subject_type, subject_uuid)
- **belongsTo**: Company, Category

#### CustomFieldValue
- **morphTo**: subject (subject_type, subject_uuid)

#### Dashboard
- **belongsTo**: Company, User (created_by_uuid)
- **hasMany**: DashboardWidget

#### DashboardWidget
- **belongsTo**: Dashboard, User (created_by_uuid)

#### Directive
- **morphTo**: subject (subject_type, subject_uuid)
- **belongsTo**: Company, Permission

#### Extension
- No explicit relationships

#### ExtensionInstall
- **belongsTo**: Company, Extension

#### File
- **belongsTo**: Company, User (uploader_uuid)
- **morphTo**: subject (subject_type, subject_uuid)

#### Group
- **belongsTo**: Company
- **belongsToMany**: User (via group_users pivot)
- **hasMany**: Permission

#### GroupUser
- **belongsTo**: Group, User

#### Invite
- **morphTo**: subject (subject_type, subject_uuid)
- **belongsTo**: Company, User (created_by_uuid)

#### LoginAttempt
- **belongsTo**: User, Company
- Appends: masked_identity (data masking for security)

#### Model (Base)
- Abstract base model — no direct relationships

#### Notification
- **morphTo**: notifiable (standard Laravel)

#### Permission
- **belongsTo**: Company
- Standard Spatie Permission model

#### Policy
- **belongsTo**: Company
- Standard Laravel Policy model

#### Report
- **belongsTo**: Company, User (created_by_uuid)
- **hasMany**: ReportExecution, ReportAuditLog

#### ReportAuditLog
- **belongsTo**: Report, User

#### ReportExecution
- **belongsTo**: Report, User

#### Role
- **belongsTo**: Company
- Standard Spatie Role model

#### Schedule
- **morphTo**: subject (subject_type, subject_uuid)
- **belongsTo**: Company
- **hasMany**: ScheduleItem

#### ScheduleAvailability
- **belongsTo**: Company
- **morphTo**: subject (subject_type, subject_uuid)

#### ScheduleConstraint
- **belongsTo**: Company
- **morphTo**: subject (subject_type, subject_uuid)

#### ScheduleItem
- **belongsTo**: Schedule
- **morphTo**: assignee (assignee_type, assignee_uuid), resource (resource_type, resource_uuid)

#### ScheduleTemplate
- **belongsTo**: Company
- **morphTo**: subject (subject_type, subject_uuid)

#### Setting
- No explicit relationships (key-value store)

#### Transaction
- **hasMany**: TransactionItem
- **morphTo**: customer (customer_type, customer_uuid, withoutGlobalScopes)

#### TransactionItem
- No explicit relationships documented

#### Type
- **belongsTo**: Company
- **morphTo**: subject (subject_type, subject_uuid, withoutGlobalScopes)

#### User
- **belongsTo**: Company, File (avatar)
- **hasMany**: UserDevice, CompanyUser
- **hasManyThrough**: Company (through CompanyUser), Group (through GroupUser)
- **hasOne**: CompanyUser (current company), CompanyUser (any)

#### UserDevice
- No explicit relationships

#### VerificationCode
- **morphTo**: subject (subject_type, subject_uuid)

#### WebhookEndpoint
- **belongsTo**: Company, ApiCredential

#### WebhookRequestLog
- **belongsTo**: Company, WebhookEndpoint, ApiCredential, ApiEvent

### 11.2 FleetOps Engine (42 Models)

#### Asset
- **spatialFields**: ['location']
- Relationships inherited from base

#### Contact
- **belongsTo**: Company, User (created_by_uuid)
- **hasMany**: Files, Vehicles (via vendor relation)

#### Device
- **spatialFields**: ['last_position']
- **belongsTo**: Telematic, User (created_by_uuid), User (updated_by_uuid)
- **hasMany**: DeviceEvent

#### DeviceEvent
- **belongsTo**: Company, Device, User (created_by_uuid)

#### Driver
- **spatialFields**: ['location']
- **belongsTo**: User, Vehicle, Vendor, Company, File (photo), User (created_by_uuid)
- **hasMany**: UserDevice (through User), Position
- **belongsToMany**: Fleet (via fleet_drivers pivot)

#### Entity
- **belongsTo**: File (photo), Place (destination), Payload (without entities), Vendor (supplier), Driver (driver_assigned_uuid), Company, TrackingNumber
- **hasMany**: File (files), Proof (subject_uuid)
- **morphTo**: customer (customer_type, customer_uuid, withoutGlobalScopes)

#### Equipment
- **belongsTo**: Warranty, File (photo_uuid), User (created_by_uuid), User (updated_by_uuid)
- **morphTo**: owner()
- **hasMany**: Maintenance (maintainable_uuid)

#### Fleet
- **belongsTo**: Company, File (photo), ServiceArea, Zone, User (created_by_uuid)
- **belongsToMany**: Driver (via fleet_drivers), Vehicle (via fleet_vehicles)
- **hasMany**: FleetDriver, FleetVehicle

#### FleetDriver (Pivot Model)
- **belongsTo**: Fleet, Driver

#### FleetVehicle (Pivot Model)
- **belongsTo**: Fleet, Vehicle

#### FuelReport
- **spatialFields**: ['location']
- **belongsTo**: Driver (without vehicle), Vehicle (without driver), User, User (reported_by_uuid)

#### IntegratedVendor
- **belongsTo**: User, Company

#### Issue
- **spatialFields**: ['location']
- **belongsTo**: User, User (reported_by_uuid), User (assigned_to_uuid), Vehicle, Driver

#### Maintenance
- **belongsTo**: WorkOrder, User (created_by_uuid), User (updated_by_uuid)
- **morphTo**: maintainable(), assignee()

#### Order
- **belongsTo**: OrderConfig (withTrashed), Transaction, Route, Payload (with pickup/dropoff/return/waypoints/entities), Company, User (created_by), User (updated_by), Driver (driverAssigned, without devices/vendor), Vehicle (vehicleAssigned, without devices/vendor/fleets), TrackingNumber (without owner), PurchaseRate
- **hasMany**: Comment (subject_uuid, whereNull parent), File (subject_uuid), TrackingStatus (via tracking_number_uuid), Proof (subject_uuid)
- **hasManyThrough**: Driver (through Entity, via tracking_number_uuid)
- **morphTo**: facilitator (facilitator_type, facilitator_uuid, withTrashed), customer (customer_type, customer_uuid)

#### OrderConfig
- **belongsTo**: Order, User, Category, File, CustomField

#### Part
- **belongsTo**: Vendor, Warranty, File (photo_uuid), User (created_by_uuid), User (updated_by_uuid)
- **morphTo**: owner()

#### Payload
- **belongsTo**: Place (dropoff_uuid, withoutGlobalScopes), Place (pickup_uuid, withoutGlobalScopes), Place (return, withoutGlobalScopes), Place (current_waypoint_uuid, withoutGlobalScopes), Waypoint (current_waypoint_uuid)
- **hasOne**: Order (without payload)
- **hasMany**: Entity, Waypoint (with place)
- **hasManyThrough**: Place (through Waypoint)

#### Place
- **spatialFields**: ['location']
- **belongsTo**: Company
- **morphTo**: owner (owner_type, owner_uuid)

#### Position
- **spatialFields**: ['coordinates']
- **belongsTo**: Company, Order, Place
- **morphTo**: subject (subject_type, subject_uuid, withoutGlobalScopes)

#### Proof
- **belongsTo**: File, Order
- **morphTo**: subject (subject_type, subject_uuid, withoutGlobalScopes)

#### PurchaseRate
- **hasOne**: Order
- **belongsTo**: ServiceQuote, Transaction, Payload, Company
- **morphTo**: customer (customer_type, customer_uuid)

#### Route
- **belongsTo**: Order

#### Sensor
- **spatialFields**: ['last_position']
- **belongsTo**: Telematic, Device, Warranty, User (created_by_uuid), User (updated_by_uuid), File
- **morphTo**: owner()
- **hasMany**: Alert (subject_uuid)

#### ServiceArea
- **spatialFields**: ['border']
- **hasMany**: Zone (without serviceArea)

#### ServiceQuote
- **belongsTo**: Company, ServiceRate, Payload (withoutGlobalScopes), IntegratedVendor
- **hasMany**: ServiceQuoteItem

#### ServiceQuoteItem
- No explicit relationships

#### ServiceRate
- **belongsTo**: OrderConfig (withTrashed), ServiceArea, Zone
- **hasMany**: ServiceRateFee, ServiceRateParcelFee

#### ServiceRateFee
- No explicit relationships

#### ServiceRateParcelFee
- No explicit relationships

#### Telematic
- **belongsTo**: Warranty, User (created_by_uuid), User (updated_by_uuid)
- **hasOne**: Device (telematic_uuid)
- **hasMany**: Asset (telematic_uuid)

#### TrackingNumber
- **spatialFields**: ['location']
- **hasOne**: TrackingStatus (latest, without trackingNumber)
- **hasMany**: TrackingStatus (without trackingNumber)
- **belongsTo**: Order (owner_uuid), Entity (owner_uuid)
- **morphTo**: owner (owner_type, owner_uuid, withoutGlobalScopes)

#### TrackingStatus
- **belongsTo**: TrackingNumber, Proof

#### Vehicle
- **belongsTo**: Company, File (photo), Vendor, User (created_by_uuid)
- **hasMany**: VehicleDevice, Driver
- **belongsToMany**: Fleet (via fleet_vehicles)

#### VehicleDevice
- **belongsTo**: Vehicle (without events)
- **hasMany**: VehicleDeviceEvent

#### VehicleDeviceEvent
- **belongsTo**: VehicleDevice

#### Vendor
- **belongsTo**: Company, File (logo/photo), User (created_by_uuid)
- **hasMany**: VendorPersonnel

#### VendorPersonnel
- **belongsTo**: Vendor

#### Warranty
- No explicit relationships documented

#### Waypoint
- **belongsTo**: Place, Payload

#### WorkOrder
- **belongsTo**: User (created_by_uuid), User (updated_by_uuid)
- **morphTo**: owner(), assignee()
- **hasMany**: Maintenance (work_order_uuid), File (subject_uuid)

#### Zone
- **belongsTo**: ServiceArea
- **spatialFields**: ['border'] (inherited)

### 11.3 Storefront Engine (28 Models)

#### AddonCategory
- No explicit relationships

#### Cart
- **belongsTo**: Checkout

#### Catalog
- **belongsTo**: Store
- **hasMany**: CatalogHour, CatalogSubject

#### CatalogCategory
- No explicit relationships

#### CatalogHour
- **belongsTo**: Catalog

#### CatalogProduct
- No explicit relationships

#### CatalogSubject
- **morphTo**: subject (subject_type, subject_uuid)
- **belongsTo**: Catalog

#### Checkout
- **belongsTo**: Company (cross-db), Order (cross-db), ServiceQuote (cross-db), Store, Network, Gateway, Cart
- **morphTo**: owner (owner_type, owner_uuid, withoutGlobalScopes, cross-db)

#### Customer
- **hasMany**: Review (all), Review (product reviews only), Review (store reviews only), File (storefront_review_upload type)

#### FoodTruck
- **belongsTo**: Store, Vehicle (cross-db, withTrashed), ServiceArea (cross-db), Zone (cross-db)
- **morphMany**: CatalogSubject (subject)
- **morphToMany**: Catalog (via catalog_subjects)

#### Gateway
- **belongsTo**: User (cross-db), Company (cross-db), File (cross-db)
- **morphTo**: owner (owner_type, owner_uuid)

#### Network
- **belongsTo**: User (cross-db), Company (cross-db), File (cross-db), File (backdrop, cross-db), OrderConfig (cross-db)
- **belongsToMany**: Store (via network_stores pivot)
- **hasMany**: File (subject_uuid, cross-db), NotificationChannel, Gateway, Invite (subject_uuid, cross-db), Category (owner_uuid, cross-db)

#### NetworkStore (Pivot Model)
- **belongsTo**: Network, Store, Category (cross-db)

#### NotificationChannel
- **morphTo**: owner (owner_type, owner_uuid)

#### PaymentMethod
- **belongsTo**: User (cross-db), Company (cross-db), Store, Gateway
- **morphTo**: owner (owner_type, owner_uuid, withoutGlobalScopes, cross-db)

#### Product
- **belongsTo**: Store
- **belongsToMany**: Category (via product pivot)
- **hasMany**: ProductAddonCategory, ProductVariant, Review (subject_uuid), Vote (subject_uuid), ProductHour

#### ProductAddon
- **belongsTo**: Store

#### ProductAddonCategory
- **belongsTo**: Product

#### ProductHour
- **belongsTo**: Product

#### ProductStoreLocation
- **belongsTo**: Product, StoreLocation

#### ProductVariant
- **belongsTo**: Product
- **hasMany**: ProductVariantOption

#### ProductVariantOption
- **belongsTo**: ProductVariant

#### Review
- **hasMany**: Vote (subject_uuid)
- **morphTo**: subject (subject_type, subject_uuid)

#### Store
- **belongsTo**: Company (cross-db), File (logo, cross-db), File (backdrop, cross-db)
- **belongsToMany**: Network (via network_stores pivot)
- **hasMany**: Product, Checkout, StoreHour, Review (subject_uuid), Vote (subject_uuid), NotificationChannel, Gateway, StoreLocation, NetworkStore

#### StorefrontModel (Base)
- Abstract base model for Storefront — no direct relationships

#### StoreHour
- **belongsTo**: StoreLocation

#### StoreLocation
- **belongsTo**: Store
- **hasMany**: StoreHour

#### Vote
- **morphTo**: subject (subject_type, subject_uuid, withoutGlobalScopes)

### 11.4 Pallet Engine (14 Models)

#### Audit
- **belongsTo**: User (user_uuid)

#### Batch
- **belongsTo**: Company, User (created_by_uuid), Product

#### Inventory
- **belongsTo**: Product, Supplier, Place (cross-engine from FleetOps), Batch

#### Product
- No explicit Eloquent relationships (uses UUID lookups)

#### PurchaseOrder
- **belongsTo**: Company, User (created_by_uuid), Supplier, Transaction, User (assigned_to_uuid), Contact (point_of_contact_uuid)

#### SalesOrder
- **belongsTo**: Company, User (created_by_uuid), Transaction, User (assigned_to_uuid), Contact (point_of_contact_uuid), Supplier

#### StockAdjustment
- **belongsTo**: Company, User (created_by_uuid), Product, User (assignee_uuid)

#### StockTransaction
- No explicit relationships (uses event-based tracking)

#### Supplier
- No explicit relationships (standalone entity)

#### Warehouse
- **hasMany**: WarehouseSection, WarehouseDock

#### WarehouseAisle
- **belongsTo**: Company, User (created_by_uuid), WarehouseSection (section_uuid)
- **hasMany**: WarehouseRack

#### WarehouseBin
- **belongsTo**: Company, User (created_by_uuid), WarehouseRack (rack_uuid)

#### WarehouseDock
- **belongsTo**: Company, User (created_by_uuid), Place (warehouse_uuid)

#### WarehouseRack
- **belongsTo**: Company, User (created_by_uuid), WarehouseAisle (aisle_uuid)
- **hasMany**: WarehouseBin

#### WarehouseSection
- **belongsTo**: Company, User (created_by_uuid), Place (warehouse_uuid)
- **hasMany**: WarehouseAisle

### 11.5 CityOS Engine (17 Models)

#### Category
- **belongsTo**: Sector, Category (parent_uuid — self-referential)
- **hasMany**: Category (children), Tenant

#### Channel
- **belongsTo**: Tenant
- **hasMany**: Surface

#### City
- **belongsTo**: Country
- **hasMany**: Sector, Tenant

#### Country
- **belongsTo**: Region
- **hasMany**: City, Tenant, GovernanceAuthority, Policy

#### FeatureFlag
- No explicit relationships (key-value feature toggle)

#### GovernanceAuthority
- **belongsTo**: Country, GovernanceAuthority (parent_authority_uuid — self-referential)
- **hasMany**: GovernanceAuthority (children), Policy

#### IntegrationLog
- No explicit relationships (event log)

#### Node
- **belongsTo**: Node (parent_uuid — self-referential), Country, City, Tenant (stewardship_tenant_uuid)
- **hasMany**: Node (children)

#### OutboxEvent
- No explicit relationships (transactional outbox pattern)

#### Policy
- **belongsTo**: GovernanceAuthority, Region, Country, Tenant

#### Portal
- **belongsTo**: Tenant, Surface

#### Region
- **hasMany**: Country, Policy, Tenant

#### Sector
- **belongsTo**: City
- **hasMany**: Category, Tenant

#### Store (CityOS)
- **belongsTo**: Tenant, Portal, Country

#### Surface
- **belongsTo**: Channel
- **hasMany**: Portal

#### Tenant
- **belongsTo**: Company, Country, City, Sector, Category, Region, GovernanceAuthority, Tenant (parent_tenant_uuid — self-referential)
- **hasMany**: Tenant (children), Channel, Portal, Policy

#### WorkflowRegistry
- No explicit relationships (workflow definition store)

### 11.6 Relationship Pattern Summary

| Pattern | Count | Primary Usage |
|---------|-------|---------------|
| belongsTo | ~210 | Standard FK references (company_uuid, user_uuid, etc.) |
| hasMany | ~75 | Parent-to-children collections |
| hasOne | ~8 | 1:1 relationships (Order↔Payload, TrackingNumber↔latest status) |
| morphTo | ~30 | Polymorphic ownership (subject_type/subject_uuid) |
| morphMany | ~3 | Reverse polymorphic (CatalogSubject, etc.) |
| morphToMany | ~2 | Polymorphic many-to-many (Catalog, FoodTruck) |
| belongsToMany | ~8 | Pivot tables (Fleet↔Driver, Network↔Store, Company↔User) |
| hasManyThrough | ~5 | Indirect relationships (Company→Users through CompanyUser) |

**Cross-Engine References**: Storefront models use `setConnection(config('fleetbase.connection.db'))` for cross-database joins to Core API models (User, Company, File, Vehicle, ServiceArea).

---

## 12. API Coverage Matrix

### 12.1 Core Platform API

#### Public API (v1) — Middleware: `fleetbase.api`

| Method | Route | Controller@Method | Auth | Type |
|--------|-------|-------------------|------|------|
| GET | `/` | Controller@hello | No | Public |
| GET | `/v1/organizations/current` | OrganizationController@getCurrent | API Key | Public v1 |
| POST | `/v1/files` | FileController@create | API Key | Public v1 |
| POST | `/v1/files/base64` | FileController@createFromBase64 | API Key | Public v1 |
| PUT | `/v1/files/{id}` | FileController@update | API Key | Public v1 |
| GET | `/v1/files/{id}/download` | FileController@download | API Key | Public v1 |
| GET | `/v1/files` | FileController@query | API Key | Public v1 |
| GET | `/v1/files/{id}` | FileController@find | API Key | Public v1 |
| DELETE | `/v1/files/{id}` | FileController@delete | API Key | Public v1 |
| GET | `/v1/chat-channels/available-participants` | ChatChannelController@getAvailablePartificants | API Key | Public v1 |
| POST | `/v1/chat-channels/{id}/send-message` | ChatChannelController@sendMessage | API Key | Public v1 |
| DELETE | `/v1/chat-channels/delete-message/{id}` | ChatChannelController@deleteMessage | API Key | Public v1 |
| POST | `/v1/chat-channels/read-message/{id}` | ChatChannelController@createReadReceipt | API Key | Public v1 |
| POST | `/v1/chat-channels` | ChatChannelController@create | API Key | Public v1 |
| PUT | `/v1/chat-channels/{id}` | ChatChannelController@update | API Key | Public v1 |
| GET | `/v1/chat-channels` | ChatChannelController@query | API Key | Public v1 |
| GET | `/v1/chat-channels/{id}` | ChatChannelController@find | API Key | Public v1 |
| DELETE | `/v1/chat-channels/{id}` | ChatChannelController@delete | API Key | Public v1 |
| POST | `/v1/chat-channels/{id}/add-participant` | ChatChannelController@addParticipant | API Key | Public v1 |
| DELETE | `/v1/chat-channels/remove-participant/{id}` | ChatChannelController@removeParticipant | API Key | Public v1 |
| POST | `/v1/comments` | CommentController@create | API Key | Public v1 |
| PUT | `/v1/comments/{id}` | CommentController@update | API Key | Public v1 |
| GET | `/v1/comments` | CommentController@query | API Key | Public v1 |
| GET | `/v1/comments/{id}` | CommentController@find | API Key | Public v1 |
| DELETE | `/v1/comments/{id}` | CommentController@delete | API Key | Public v1 |

#### Internal API (int/v1) — Unauthenticated Prefixes

| Method | Route | Controller@Method | Auth | Type |
|--------|-------|-------------------|------|------|
| POST | `/int/v1/installer/status` | InstallerController@status | Throttle | Internal |
| POST | `/int/v1/installer/create-database` | InstallerController@createDatabase | Throttle | Internal |
| POST | `/int/v1/installer/migrate-database` | InstallerController@migrateDatabase | Throttle | Internal |
| POST | `/int/v1/installer/migrate-sandbox` | InstallerController@migrateSandbox | Throttle | Internal |
| POST | `/int/v1/installer/seed-database` | InstallerController@seedDatabase | Throttle | Internal |
| POST | `/int/v1/onboard/create-account` | OnboardController@createAccount | Throttle | Internal |
| GET | `/int/v1/lookup/whois` | LookupController@whois | Throttle | Internal |
| GET | `/int/v1/lookup/currencies` | LookupController@currencies | Throttle | Internal |
| GET | `/int/v1/lookup/countries` | LookupController@countries | Throttle | Internal |
| GET | `/int/v1/lookup/blog-posts` | LookupController@blogPosts | Throttle | Internal |
| POST | `/int/v1/users/login` | AuthController@login | Throttle | Internal |
| POST | `/int/v1/users/forgot-password` | AuthController@forgotPassword | Throttle | Internal |
| POST | `/int/v1/users/reset-password` | AuthController@resetPassword | Throttle | Internal |
| POST | `/int/v1/users/sign-up` | AuthController@signUp | Throttle | Internal |
| POST | `/int/v1/two-fa/verify` | TwoFaController@verifyTwoFactor | Throttle | Internal |
| POST | `/int/v1/two-fa/validate-session` | TwoFaController@validateSession | Throttle | Internal |
| POST | `/int/v1/two-fa/invalidate-session` | TwoFaController@invalidateSession | Throttle | Internal |

#### Internal API (int/v1) — Protected (Middleware: `fleetbase.protected`)

| Method | Route | Controller@Method | Auth | Type |
|--------|-------|-------------------|------|------|
| CRUD | `/int/v1/auth/*` | AuthController (fleetbaseRoutes) | Session | Internal |
| CRUD | `/int/v1/users/*` | UserController (fleetbaseRoutes) | Session | Internal |
| CRUD | `/int/v1/companies/*` | CompanyController (fleetbaseRoutes) | Session | Internal |
| CRUD | `/int/v1/groups/*` | GroupController (fleetbaseRoutes) | Session | Internal |
| CRUD | `/int/v1/roles/*` | RoleController (fleetbaseRoutes) | Session | Internal |
| CRUD | `/int/v1/permissions/*` | PermissionController (fleetbaseRoutes) | Session | Internal |
| CRUD | `/int/v1/policies/*` | PolicyController (fleetbaseRoutes) | Session | Internal |
| CRUD | `/int/v1/api-credentials/*` | ApiCredentialController (fleetbaseRoutes) | Session | Internal |
| CRUD | `/int/v1/webhook-endpoints/*` | WebhookEndpointController (fleetbaseRoutes) | Session | Internal |
| CRUD | `/int/v1/api-events/*` | ApiEventController (fleetbaseRoutes) | Session | Internal |
| CRUD | `/int/v1/api-request-logs/*` | ApiRequestLogController (fleetbaseRoutes) | Session | Internal |
| CRUD | `/int/v1/webhook-request-logs/*` | WebhookRequestLogController (fleetbaseRoutes) | Session | Internal |
| CRUD | `/int/v1/categories/*` | CategoryController (fleetbaseRoutes) | Session | Internal |
| CRUD | `/int/v1/comments/*` | CommentController (fleetbaseRoutes) | Session | Internal |
| CRUD | `/int/v1/custom-fields/*` | CustomFieldController (fleetbaseRoutes) | Session | Internal |
| CRUD | `/int/v1/custom-field-values/*` | CustomFieldValueController (fleetbaseRoutes) | Session | Internal |
| CRUD | `/int/v1/files/*` | FileController (fleetbaseRoutes) | Session | Internal |
| CRUD | `/int/v1/settings/*` | SettingController (fleetbaseRoutes) | Session | Internal |
| CRUD | `/int/v1/extensions/*` | ExtensionController (fleetbaseRoutes) | Session | Internal |
| CRUD | `/int/v1/chat-channels/*` | ChatChannelController (fleetbaseRoutes) | Session | Internal |
| CRUD | `/int/v1/chat-messages/*` | ChatMessageController (fleetbaseRoutes) | Session | Internal |
| CRUD | `/int/v1/chat-participants/*` | ChatParticipantController (fleetbaseRoutes) | Session | Internal |
| CRUD | `/int/v1/chat-logs/*` | ChatLogController (fleetbaseRoutes) | Session | Internal |
| CRUD | `/int/v1/chat-attachments/*` | ChatAttachmentController (fleetbaseRoutes) | Session | Internal |
| CRUD | `/int/v1/chat-receipts/*` | ChatReceiptController (fleetbaseRoutes) | Session | Internal |
| CRUD | `/int/v1/types/*` | TypeController (fleetbaseRoutes) | Session | Internal |
| CRUD | `/int/v1/transactions/*` | TransactionController (fleetbaseRoutes) | Session | Internal |
| CRUD | `/int/v1/directives/*` | DirectiveController (fleetbaseRoutes) | Session | Internal |

**Notification Routes** (with custom actions):

| Method | Route | Controller@Method | Auth | Type |
|--------|-------|-------------------|------|------|
| CRUD | `/int/v1/notifications/*` | NotificationController | Session | Internal |
| PUT | `/int/v1/notifications/mark-as-read` | NotificationController@markAsRead | Session | Internal |
| PUT | `/int/v1/notifications/mark-all-read` | NotificationController@markAllAsRead | Session | Internal |
| DELETE | `/int/v1/notifications/bulk-delete` | NotificationController@bulkDelete | Session | Internal |
| POST | `/int/v1/notifications/save-settings` | NotificationController@saveSettings | Session | Internal |

**Dashboard Routes**:

| Method | Route | Controller@Method | Auth | Type |
|--------|-------|-------------------|------|------|
| CRUD | `/int/v1/dashboards/*` | DashboardController | Session | Internal |
| POST | `/int/v1/dashboards/switch` | DashboardController@switchDashboard | Session | Internal |
| POST | `/int/v1/dashboards/reset-default` | DashboardController@resetDefaultDashboard | Session | Internal |
| CRUD | `/int/v1/dashboard-widgets/*` | DashboardWidgetController | Session | Internal |

**Report Builder Routes** (Gap 3 Implementation):

| Method | Route | Controller@Method | Auth | Type |
|--------|-------|-------------------|------|------|
| CRUD | `/int/v1/reports/*` | ReportController | Session | Internal |
| GET | `/int/v1/reports/tables` | ReportController@getTables | Session | Internal |
| GET | `/int/v1/reports/tables/{table}/schema` | ReportController@getTableSchema | Session | Internal |
| GET | `/int/v1/reports/tables/{table}/columns` | ReportController@getTableColumns | Session | Internal |
| GET | `/int/v1/reports/tables/{table}/relationships` | ReportController@getTableRelationships | Session | Internal |
| POST | `/int/v1/reports/validate-query` | ReportController@validateQuery | Session | Internal |
| POST | `/int/v1/reports/validate-computed-column` | ReportController@validateComputedColumn | Session | Internal |
| POST | `/int/v1/reports/execute-query` | ReportController@executeQuery | Session | Internal |
| POST | `/int/v1/reports/analyze-query` | ReportController@analyzeQuery | Session | Internal |
| POST | `/int/v1/reports/export-query` | ReportController@exportQuery | Session | Internal |
| GET | `/int/v1/reports/query-recommendations` | ReportController@getQueryRecommendations | Session | Internal |
| GET | `/int/v1/reports/export-formats` | ReportController@getExportFormats | Session | Internal |
| POST | `/int/v1/reports/{id}/execute` | ReportController@execute | Session | Internal |
| POST | `/int/v1/reports/{id}/export` | ReportController@export | Session | Internal |
| GET | `/int/v1/reports/scheduled` | ReportController@getScheduledReports | Session | Internal |
| POST | `/int/v1/reports/{id}/schedule` | ReportController@scheduleReport | Session | Internal |
| DELETE | `/int/v1/reports/{id}/schedule` | ReportController@removeSchedule | Session | Internal |
| GET | `/int/v1/reports/templates` | ReportController@getTemplates | Session | Internal |
| POST | `/int/v1/reports/from-template` | ReportController@createFromTemplate | Session | Internal |
| POST | `/int/v1/reports/{id}/share` | ReportController@shareReport | Session | Internal |
| DELETE | `/int/v1/reports/{id}/share/{shareId}` | ReportController@revokeShare | Session | Internal |
| GET | `/int/v1/reports/{id}/shares` | ReportController@getShares | Session | Internal |
| GET | `/int/v1/reports/shared-with-me` | ReportController@getSharedWithMe | Session | Internal |
| GET | `/int/v1/reports/{id}/widget-config` | ReportController@getWidgetConfig | Session | Internal |
| POST | `/int/v1/reports/{id}/widget-config` | ReportController@saveWidgetConfig | Session | Internal |

**Scheduling Routes**:

| Method | Route | Controller@Method | Auth | Type |
|--------|-------|-------------------|------|------|
| CRUD | `/int/v1/schedules/*` | ScheduleController | Session | Internal |
| CRUD | `/int/v1/schedule-items/*` | ScheduleItemController | Session | Internal |
| CRUD | `/int/v1/schedule-templates/*` | ScheduleTemplateController | Session | Internal |
| CRUD | `/int/v1/schedule-availability/*` | ScheduleAvailabilityController | Session | Internal |
| CRUD | `/int/v1/schedule-constraints/*` | ScheduleConstraintController | Session | Internal |

### 12.2 FleetOps Operations API

#### Public API (v1) — Middleware: `fleetbase.api` + TransformLocationMiddleware

| Method | Route | Controller@Method | Auth | Type |
|--------|-------|-------------------|------|------|
| POST | `/v1/drivers/register-device` | DriverController@registerDevice | API Key | Public v1 |
| POST | `/v1/drivers/login-with-sms` | DriverController@loginWithPhone | API Key | Public v1 |
| POST | `/v1/drivers/verify-code` | DriverController@verifyCode | API Key | Public v1 |
| POST | `/v1/drivers/login` | DriverController@login | API Key | Public v1 |
| POST | `/v1/drivers/{id}/simulate` | DriverController@simulate | API Key | Public v1 |
| PUT/PATCH/POST | `/v1/drivers/{id}/track` | DriverController@track | API Key | Public v1 |
| POST | `/v1/drivers/{id}/register-device` | DriverController@registerDevice | API Key | Public v1 |
| POST | `/v1/drivers/{id}/switch-organization` | DriverController@switchOrganization | API Key | Public v1 |
| POST | `/v1/drivers/{id}/toggle-online` | DriverController@toggleOnline | API Key | Public v1 |
| CRUD | `/v1/drivers/*` | DriverController | API Key | Public v1 |
| GET | `/v1/drivers/{id}/organizations` | DriverController@listOrganizations | API Key | Public v1 |
| GET | `/v1/drivers/{id}/current-organization` | DriverController@currentOrganization | API Key | Public v1 |
| CRUD | `/v1/contacts/*` | ContactController | API Key | Public v1 |
| CRUD | `/v1/vendors/*` | VendorController | API Key | Public v1 |
| CRUD | `/v1/issues/*` | IssueController | API Key | Public v1 |
| CRUD | `/v1/fuel-reports/*` | FuelReportController | API Key | Public v1 |
| CRUD | `/v1/vehicles/*` | VehicleController | API Key | Public v1 |
| CRUD | `/v1/fleets/*` | FleetController | API Key | Public v1 |
| CRUD | `/v1/places/*` | PlaceController | API Key | Public v1 |
| CRUD | `/v1/entities/*` | EntityController | API Key | Public v1 |
| CRUD | `/v1/payloads/*` | PayloadController | API Key | Public v1 |
| CRUD | `/v1/tracking-statuses/*` | TrackingStatusController | API Key | Public v1 |
| CRUD | `/v1/tracking-numbers/*` | TrackingNumberController | API Key | Public v1 |
| CRUD | `/v1/purchase-rates/*` | PurchaseRateController | API Key | Public v1 |
| CRUD | `/v1/service-areas/*` | ServiceAreaController | API Key | Public v1 |
| CRUD | `/v1/service-rates/*` | ServiceRateController | API Key | Public v1 |
| CRUD | `/v1/zones/*` | ZoneController | API Key | Public v1 |
| CRUD | `/v1/service-quotes/*` | ServiceQuoteController | API Key | Public v1 |
| POST | `/v1/service-quotes/preliminary` | ServiceQuoteController@queryPreliminaryQuote | API Key | Public v1 |
| CRUD | `/v1/orders/*` | OrderController (with custom actions) | API Key | Public v1 |
| POST | `/v1/orders/{id}/dispatch` | OrderController@dispatchOrder | API Key | Public v1 |
| POST | `/v1/orders/{id}/start` | OrderController@startOrder | API Key | Public v1 |
| DELETE | `/v1/orders/{id}/cancel` | OrderController@cancelOrder | API Key | Public v1 |
| POST | `/v1/orders/{id}/complete` | OrderController@completeOrder | API Key | Public v1 |
| POST | `/v1/orders/{id}/update-activity` | OrderController@updateActivity | API Key | Public v1 |
| POST | `/v1/orders/{id}/next-activity` | OrderController@nextActivity | API Key | Public v1 |
| GET | `/v1/orders/{id}/distance-and-time` | OrderController@getDistanceAndTime | API Key | Public v1 |
| GET | `/v1/orders/next-activity/{id}` | OrderController@nextActivity | API Key | Public v1 |
| GET | `/v1/orders/{id}/tracker` | OrderController@tracker | API Key | Public v1 |

#### Internal API (int/v1) — Middleware: `fleetbase.protected`

| Method | Route | Controller@Method | Auth | Type |
|--------|-------|-------------------|------|------|
| CRUD | `/int/v1/orders/*` | OrderController (fleetbaseRoutes) | Session | Internal |
| POST | `/int/v1/orders/{id}/dispatch` | OrderController@dispatchOrder | Session | Internal |
| DELETE | `/int/v1/orders/{id}/cancel` | OrderController@cancelOrder | Session | Internal |
| POST | `/int/v1/orders/{id}/assign-driver` | OrderController@assignDriver | Session | Internal |
| POST | `/int/v1/orders/{id}/update-activity` | OrderController@updateActivity | Session | Internal |
| DELETE | `/int/v1/orders/bulk-delete` | OrderController@bulkDelete | Session | Internal |
| POST | `/int/v1/orders/export` | OrderController@export | Session | Internal |
| CRUD | `/int/v1/contacts/*` | ContactController | Session | Internal |
| CRUD | `/int/v1/vendors/*` | VendorController | Session | Internal |
| CRUD | `/int/v1/drivers/*` (with bulk-delete, export) | DriverController | Session | Internal |
| CRUD | `/int/v1/vehicles/*` (with bulk-delete, export) | VehicleController | Session | Internal |
| CRUD | `/int/v1/fleets/*` (with bulk-delete, export) | FleetController | Session | Internal |
| CRUD | `/int/v1/places/*` (with bulk-delete, export, geocode) | PlaceController | Session | Internal |
| CRUD | `/int/v1/entities/*` | EntityController | Session | Internal |
| CRUD | `/int/v1/payloads/*` | PayloadController | Session | Internal |
| CRUD | `/int/v1/tracking-statuses/*` | TrackingStatusController | Session | Internal |
| CRUD | `/int/v1/tracking-numbers/*` | TrackingNumberController | Session | Internal |
| CRUD | `/int/v1/purchase-rates/*` | PurchaseRateController | Session | Internal |
| CRUD | `/int/v1/service-areas/*` | ServiceAreaController | Session | Internal |
| CRUD | `/int/v1/service-rates/*` | ServiceRateController | Session | Internal |
| CRUD | `/int/v1/zones/*` | ZoneController | Session | Internal |
| CRUD | `/int/v1/service-quotes/*` | ServiceQuoteController | Session | Internal |
| CRUD | `/int/v1/order-configs/*` | OrderConfigController | Session | Internal |
| CRUD | `/int/v1/issues/*` | IssueController | Session | Internal |
| CRUD | `/int/v1/fuel-reports/*` | FuelReportController | Session | Internal |
| CRUD | `/int/v1/integrated-vendors/*` | IntegratedVendorController | Session | Internal |
| GET | `/int/v1/lookup/customers` | FleetOpsLookupController@polymorphs | Session | Internal |
| GET | `/int/v1/lookup/facilitators` | FleetOpsLookupController@polymorphs | Session | Internal |
| GET | `/int/v1/live/coordinates` | LiveController@coordinates | Session | Internal |
| GET | `/int/v1/live/routes` | LiveController@routes | Session | Internal |
| GET | `/int/v1/live/orders` | LiveController@orders | Session | Internal |
| GET | `/int/v1/live/drivers` | LiveController@drivers | Session | Internal |
| GET | `/int/v1/live/vehicles` | LiveController@vehicles | Session | Internal |
| GET | `/int/v1/live/places` | LiveController@places | Session | Internal |
| GET/POST | `/int/v1/settings/*` | SettingController (14 endpoints) | Session | Internal |
| GET | `/int/v1/metrics/` | MetricsController@all | Session | Internal |

### 12.3 Storefront Commerce API

#### Public API (v1) — No Auth (Callbacks)

| Method | Route | Controller@Method | Auth | Type |
|--------|-------|-------------------|------|------|
| GET/POST | `/storefront/v1/checkouts/capture-qpay` | CheckoutController@captureQpayCallback | No | Public |

#### Public API (v1) — Middleware: `storefront.api`

| Method | Route | Controller@Method | Auth | Type |
|--------|-------|-------------------|------|------|
| GET | `/storefront/v1/lookup/{id}` | StoreController@lookup | API Key | Public v1 |
| GET | `/storefront/v1/about` | StoreController@about | API Key | Public v1 |
| GET | `/storefront/v1/locations/{id}` | StoreController@location | API Key | Public v1 |
| GET | `/storefront/v1/locations` | StoreController@locations | API Key | Public v1 |
| GET | `/storefront/v1/gateways/{id}` | StoreController@gateway | API Key | Public v1 |
| GET | `/storefront/v1/gateways` | StoreController@gateways | API Key | Public v1 |
| GET | `/storefront/v1/search` | StoreController@search | API Key | Public v1 |
| GET | `/storefront/v1/stores` | NetworkController@stores | API Key | Public v1 |
| GET | `/storefront/v1/store-locations` | NetworkController@storeLocations | API Key | Public v1 |
| GET | `/storefront/v1/tags` | NetworkController@tags | API Key | Public v1 |
| GET | `/storefront/v1/checkouts/before` | CheckoutController@beforeCheckout | API Key | Public v1 |
| GET | `/storefront/v1/checkouts/status` | CheckoutController@getCheckoutStatus | API Key | Public v1 |
| POST | `/storefront/v1/checkouts/capture` | CheckoutController@captureOrder | API Key | Public v1 |
| POST | `/storefront/v1/checkouts/stripe-setup-intent` | CheckoutController@createStripeSetupIntentForCustomer | API Key | Public v1 |
| PUT | `/storefront/v1/checkouts/stripe-update-payment-intent` | CheckoutController@updateStripePaymentIntent | API Key | Public v1 |
| GET | `/storefront/v1/service-quotes/from-cart` | ServiceQuoteController@fromCart | API Key | Public v1 |
| GET | `/storefront/v1/categories` | CategoryController@query | API Key | Public v1 |
| GET/POST | `/storefront/v1/products/*` | ProductController (CRUD) | API Key | Public v1 |
| GET/POST | `/storefront/v1/reviews/*` | ReviewController | API Key | Public v1 |
| GET/POST | `/storefront/v1/carts/*` | CartController | API Key | Public v1 |
| GET/POST | `/storefront/v1/customers/*` | CustomerController | API Key | Public v1 |
| GET/POST | `/storefront/v1/orders/*` | OrderController | API Key | Public v1 |

#### Internal API (int/v1) — Middleware: `fleetbase.protected`

| Method | Route | Controller@Method | Auth | Type |
|--------|-------|-------------------|------|------|
| CRUD | `/storefront/int/v1/networks/*` | NetworkController | Session | Internal |
| CRUD | `/storefront/int/v1/stores/*` | StoreController | Session | Internal |
| CRUD | `/storefront/int/v1/store-locations/*` | StoreLocationController | Session | Internal |
| CRUD | `/storefront/int/v1/store-hours/*` | StoreHourController | Session | Internal |
| CRUD | `/storefront/int/v1/products/*` | ProductController | Session | Internal |
| CRUD | `/storefront/int/v1/product-hours/*` | ProductHourController | Session | Internal |
| CRUD | `/storefront/int/v1/product-variants/*` | ProductVariantController | Session | Internal |
| CRUD | `/storefront/int/v1/product-variant-options/*` | ProductVariantOptionController | Session | Internal |
| CRUD | `/storefront/int/v1/product-addons/*` | ProductAddonController | Session | Internal |
| CRUD | `/storefront/int/v1/product-addon-categories/*` | ProductAddonCategoryController | Session | Internal |
| CRUD | `/storefront/int/v1/addon-categories/*` | AddonCategoryController | Session | Internal |
| CRUD | `/storefront/int/v1/gateways/*` | GatewayController | Session | Internal |
| CRUD | `/storefront/int/v1/notification-channels/*` | NotificationChannelController | Session | Internal |
| CRUD | `/storefront/int/v1/reviews/*` | ReviewController (with approve/reject/respond) | Session | Internal |
| GET | `/storefront/int/v1/reviews/pending` | ReviewController@pending | Session | Internal |
| GET | `/storefront/int/v1/reviews/stats` | ReviewController@stats | Session | Internal |
| CRUD | `/storefront/int/v1/votes/*` | VoteController | Session | Internal |
| CRUD | `/storefront/int/v1/food-trucks/*` | FoodTruckController | Session | Internal |
| CRUD | `/storefront/int/v1/catalogs/*` | CatalogController | Session | Internal |
| CRUD | `/storefront/int/v1/catalog-categories/*` | CatalogCategoryController | Session | Internal |
| CRUD | `/storefront/int/v1/catalog-hours/*` | CatalogHourController | Session | Internal |
| GET | `/storefront/int/v1/metrics/` | MetricsController@all | Session | Internal |

**Medusa Integration Routes**:

| Method | Route | Controller@Method | Auth | Type |
|--------|-------|-------------------|------|------|
| GET | `/storefront/int/v1/medusa/status` | MedusaController@status | Session | Internal |
| POST | `/storefront/int/v1/medusa/sync/products` | MedusaController@syncProducts | Session | Internal |
| POST | `/storefront/int/v1/medusa/sync/orders` | MedusaController@syncOrders | Session | Internal |
| POST | `/storefront/int/v1/medusa/webhook` | MedusaController@webhook | Session | Internal |

### 12.4 Pallet Warehouse API

#### Internal API (int/v1) — Middleware: `fleetbase.protected`

| Method | Route | Controller@Method | Auth | Type |
|--------|-------|-------------------|------|------|
| CRUD | `/pallet/int/v1/audits/*` | AuditController | Session | Internal |
| CRUD | `/pallet/int/v1/batches/*` | BatchController | Session | Internal |
| DELETE | `/pallet/int/v1/batches/bulk-delete` | BatchController@bulkDelete | Session | Internal |
| CRUD | `/pallet/int/v1/inventories/*` | InventoryController | Session | Internal |
| DELETE | `/pallet/int/v1/inventories/bulk-delete` | InventoryController@bulkDelete | Session | Internal |
| CRUD | `/pallet/int/v1/products/*` | ProductController | Session | Internal |
| DELETE | `/pallet/int/v1/products/bulk-delete` | ProductController@bulkDelete | Session | Internal |
| CRUD | `/pallet/int/v1/sales-orders/*` | SalesOrderController | Session | Internal |
| DELETE | `/pallet/int/v1/sales-orders/bulk-delete` | SalesOrderController@bulkDelete | Session | Internal |
| CRUD | `/pallet/int/v1/purchase-orders/*` | PurchaseOrderController | Session | Internal |
| DELETE | `/pallet/int/v1/purchase-orders/bulk-delete` | PurchaseOrderController@bulkDelete | Session | Internal |
| CRUD | `/pallet/int/v1/stock-adjustments/*` | StockAdjustmentController | Session | Internal |
| CRUD | `/pallet/int/v1/suppliers/*` | SupplierController | Session | Internal |
| DELETE | `/pallet/int/v1/suppliers/bulk-delete` | SupplierController@bulkDelete | Session | Internal |
| CRUD | `/pallet/int/v1/warehouses/*` | WarehouseController | Session | Internal |
| DELETE | `/pallet/int/v1/warehouses/bulk-delete` | WarehouseController@bulkDelete | Session | Internal |

Note: Pallet has no public API — all routes are internal console-only. Warehouse spatial sub-resources (sections, aisles, racks, bins, docks) are managed through dedicated controllers.

### 12.5 CityOS Governance API

#### Internal API (int/v1) — Middleware: `fleetbase.protected`

**Core CRUD Resources**:

| Method | Route | Controller@Method | Auth | Type |
|--------|-------|-------------------|------|------|
| CRUD | `/cityos/int/v1/countries/*` | CountryController | Session | Internal |
| CRUD | `/cityos/int/v1/cities/*` | CityController | Session | Internal |
| CRUD | `/cityos/int/v1/sectors/*` | SectorController | Session | Internal |
| CRUD | `/cityos/int/v1/categories/*` | CategoryController | Session | Internal |
| CRUD | `/cityos/int/v1/tenants/*` | TenantController | Session | Internal |
| GET | `/cityos/int/v1/tenants/{id}/node-context` | TenantController@getNodeContext | Session | Internal |
| CRUD | `/cityos/int/v1/channels/*` | ChannelController | Session | Internal |
| CRUD | `/cityos/int/v1/surfaces/*` | SurfaceController | Session | Internal |
| CRUD | `/cityos/int/v1/portals/*` | PortalController | Session | Internal |
| CRUD | `/cityos/int/v1/regions/*` | RegionController | Session | Internal |
| CRUD | `/cityos/int/v1/governance-authorities/*` | GovernanceAuthorityController | Session | Internal |
| CRUD | `/cityos/int/v1/policies/*` | PolicyController | Session | Internal |
| CRUD | `/cityos/int/v1/feature-flags/*` | FeatureFlagController | Session | Internal |
| CRUD | `/cityos/int/v1/nodes/*` | NodeController | Session | Internal |

**Hierarchy Routes**:

| Method | Route | Controller@Method | Auth | Type |
|--------|-------|-------------------|------|------|
| GET | `/cityos/int/v1/hierarchy/tree` | HierarchyController@tree | Session | Internal |
| GET | `/cityos/int/v1/hierarchy/resolve` | HierarchyController@resolve | Session | Internal |
| GET | `/cityos/int/v1/hierarchy/stats` | HierarchyController@stats | Session | Internal |

**Governance Routes**:

| Method | Route | Controller@Method | Auth | Type |
|--------|-------|-------------------|------|------|
| GET | `/cityos/int/v1/governance/resolve` | GovernanceController@resolve | Session | Internal |
| GET | `/cityos/int/v1/governance/tenant-hierarchy` | GovernanceController@tenantHierarchy | Session | Internal |
| GET | `/cityos/int/v1/governance/compliance` | GovernanceController@compliance | Session | Internal |
| GET | `/cityos/int/v1/governance/feature-flags` | GovernanceController@featureFlags | Session | Internal |
| GET | `/cityos/int/v1/governance/node-tree` | GovernanceController@nodeTree | Session | Internal |

**Outbox Event Routes**:

| Method | Route | Controller@Method | Auth | Type |
|--------|-------|-------------------|------|------|
| GET | `/cityos/int/v1/outbox-events/stats` | OutboxEventController@stats | Session | Internal |
| POST | `/cityos/int/v1/outbox-events/retry-all-failed` | OutboxEventController@retryAllFailed | Session | Internal |
| GET | `/cityos/int/v1/outbox-events` | OutboxEventController@index | Session | Internal |
| GET | `/cityos/int/v1/outbox-events/{id}` | OutboxEventController@show | Session | Internal |
| POST | `/cityos/int/v1/outbox-events/{id}/retry` | OutboxEventController@retry | Session | Internal |
| POST | `/cityos/int/v1/outbox-events/{id}/dead-letter` | OutboxEventController@deadLetter | Session | Internal |
| DELETE | `/cityos/int/v1/outbox-events/{id}` | OutboxEventController@destroy | Session | Internal |

**Integration Log Routes**:

| Method | Route | Controller@Method | Auth | Type |
|--------|-------|-------------------|------|------|
| GET | `/cityos/int/v1/integration-logs/stats` | IntegrationLogController@stats | Session | Internal |
| DELETE | `/cityos/int/v1/integration-logs/purge` | IntegrationLogController@purge | Session | Internal |
| GET | `/cityos/int/v1/integration-logs` | IntegrationLogController@index | Session | Internal |
| GET | `/cityos/int/v1/integration-logs/{id}` | IntegrationLogController@show | Session | Internal |

### 12.6 New API Endpoints (Gap Implementations)

#### Identity / walt.id (Gap 9) — 11 Endpoints

| Method | Route | Controller@Method | Auth | Type |
|--------|-------|-------------------|------|------|
| GET | `/cityos/int/v1/identity/status` | WaltIdController@status | Session | Internal |
| GET | `/cityos/int/v1/identity/dids` | WaltIdController@listDids | Session | Internal |
| POST | `/cityos/int/v1/identity/dids` | WaltIdController@createDid | Session | Internal |
| GET | `/cityos/int/v1/identity/dids/{did}` | WaltIdController@resolveDid | Session | Internal |
| DELETE | `/cityos/int/v1/identity/dids/{did}` | WaltIdController@deactivateDid | Session | Internal |
| POST | `/cityos/int/v1/identity/credentials/issue` | WaltIdController@issueCredential | Session | Internal |
| POST | `/cityos/int/v1/identity/credentials/verify` | WaltIdController@verifyCredential | Session | Internal |
| GET | `/cityos/int/v1/identity/credentials` | WaltIdController@listCredentials | Session | Internal |
| DELETE | `/cityos/int/v1/identity/credentials/{id}` | WaltIdController@revokeCredential | Session | Internal |
| GET | `/cityos/int/v1/identity/trust-registry` | WaltIdController@trustRegistry | Session | Internal |
| POST | `/cityos/int/v1/identity/presentations/verify` | WaltIdController@verifyPresentation | Session | Internal |

#### Temporal Workflows (Gap 10) — 8 Endpoints

| Method | Route | Controller@Method | Auth | Type |
|--------|-------|-------------------|------|------|
| GET | `/cityos/int/v1/workflows/status` | TemporalController@status | Session | Internal |
| GET | `/cityos/int/v1/workflows` | TemporalController@listWorkflows | Session | Internal |
| POST | `/cityos/int/v1/workflows` | TemporalController@startWorkflow | Session | Internal |
| GET | `/cityos/int/v1/workflows/{id}` | TemporalController@getWorkflow | Session | Internal |
| POST | `/cityos/int/v1/workflows/{id}/signal` | TemporalController@signalWorkflow | Session | Internal |
| POST | `/cityos/int/v1/workflows/{id}/terminate` | TemporalController@terminateWorkflow | Session | Internal |
| GET | `/cityos/int/v1/workflows/{id}/history` | TemporalController@getWorkflowHistory | Session | Internal |
| POST | `/cityos/int/v1/workflows/query` | TemporalController@queryWorkflow | Session | Internal |

#### CMS Sync / Payload CMS (Gap 11) — 10 Endpoints

| Method | Route | Controller@Method | Auth | Type |
|--------|-------|-------------------|------|------|
| GET | `/cityos/int/v1/cms/status` | PayloadCmsController@status | Session | Internal |
| GET | `/cityos/int/v1/cms/collections` | PayloadCmsController@listCollections | Session | Internal |
| GET | `/cityos/int/v1/cms/collections/{slug}` | PayloadCmsController@getCollection | Session | Internal |
| POST | `/cityos/int/v1/cms/collections/{slug}/sync` | PayloadCmsController@syncCollection | Session | Internal |
| GET | `/cityos/int/v1/cms/globals` | PayloadCmsController@listGlobals | Session | Internal |
| GET | `/cityos/int/v1/cms/globals/{slug}` | PayloadCmsController@getGlobal | Session | Internal |
| POST | `/cityos/int/v1/cms/full-sync` | PayloadCmsController@fullSync | Session | Internal |
| GET | `/cityos/int/v1/cms/sync-history` | PayloadCmsController@syncHistory | Session | Internal |
| POST | `/cityos/int/v1/cms/media/sync` | PayloadCmsController@syncMedia | Session | Internal |
| POST | `/api/webhooks/cityos/cms` | WebhookController@cmsWebhook | No | Webhook |

#### Financial / ERPNext (Gap 12) — 24 Endpoints

| Method | Route | Controller@Method | Auth | Type |
|--------|-------|-------------------|------|------|
| GET | `/cityos/int/v1/finance/status` | FinanceController@status | Session | Internal |
| GET | `/cityos/int/v1/finance/invoices` | FinanceController@listInvoices | Session | Internal |
| POST | `/cityos/int/v1/finance/invoices` | FinanceController@createInvoice | Session | Internal |
| GET | `/cityos/int/v1/finance/invoices/{id}` | FinanceController@getInvoice | Session | Internal |
| POST | `/cityos/int/v1/finance/invoices/{id}/submit` | FinanceController@submitInvoice | Session | Internal |
| POST | `/cityos/int/v1/finance/invoices/{id}/cancel` | FinanceController@cancelInvoice | Session | Internal |
| GET | `/cityos/int/v1/finance/payments` | FinanceController@listPayments | Session | Internal |
| POST | `/cityos/int/v1/finance/payments` | FinanceController@createPayment | Session | Internal |
| GET | `/cityos/int/v1/finance/payments/{id}` | FinanceController@getPayment | Session | Internal |
| GET | `/cityos/int/v1/finance/accounts` | FinanceController@chartOfAccounts | Session | Internal |
| GET | `/cityos/int/v1/finance/trial-balance` | FinanceController@trialBalance | Session | Internal |
| GET | `/cityos/int/v1/finance/profit-loss` | FinanceController@profitAndLoss | Session | Internal |
| GET | `/cityos/int/v1/finance/balance-sheet` | FinanceController@balanceSheet | Session | Internal |
| GET | `/cityos/int/v1/finance/journal-entries` | FinanceController@listJournalEntries | Session | Internal |
| POST | `/cityos/int/v1/finance/journal-entries` | FinanceController@createJournalEntry | Session | Internal |
| GET | `/cityos/int/v1/finance/tax-categories` | FinanceController@listTaxCategories | Session | Internal |
| GET | `/cityos/int/v1/finance/cost-centers` | FinanceController@listCostCenters | Session | Internal |
| POST | `/cityos/int/v1/finance/budget` | FinanceController@createBudget | Session | Internal |
| GET | `/cityos/int/v1/finance/budget-variance` | FinanceController@budgetVariance | Session | Internal |
| POST | `/cityos/int/v1/finance/reconcile` | FinanceController@reconcile | Session | Internal |
| POST | `/cityos/int/v1/finance/sync-transactions` | FinanceController@syncTransactions | Session | Internal |
| GET | `/cityos/int/v1/finance/erpnext/status` | IntegrationController@erpnextStatus | Session | Internal |
| POST | `/cityos/int/v1/finance/erpnext/settlement` | IntegrationController@erpnextSettlement | Session | Internal |
| GET/POST | `/cityos/int/v1/finance/outbox/*` | IntegrationController@outbox* (4 endpoints) | Session | Internal |

#### Workflow Registry (Platform-level)

| Method | Route | Controller@Method | Auth | Type |
|--------|-------|-------------------|------|------|
| GET | `/api/workflow-registry` | WorkflowRegistryController@index | Session | Protected |
| POST | `/api/workflow-registry` | WorkflowRegistryController@store | Session | Protected |
| GET | `/api/workflow-definitions` | WorkflowRegistryController@definitions | Session | Protected |
| GET | `/api/queue-system-map` | WorkflowRegistryController@queueSystemMap | Session | Protected |
| POST | `/api/workflow-registry/sync` | WorkflowRegistryController@sync | Session | Protected |

#### Platform Context (CityOS)

| Method | Route | Controller@Method | Auth | Type |
|--------|-------|-------------------|------|------|
| GET | `/api/platform/context` | PlatformContextController@context | Session | Protected |
| GET | `/api/platform/tenants/default` | PlatformContextController@defaultTenant | Session | Protected |
| GET | `/api/platform/capabilities` | PlatformContextController@capabilities | Session | Protected |

#### CityOS Public API (v1) — No Auth

| Method | Route | Controller@Method | Auth | Type |
|--------|-------|-------------------|------|------|
| GET | `/cityos/v1/hierarchy/tree` | HierarchyController@tree | No | Public v1 |
| GET | `/cityos/v1/hierarchy/resolve` | HierarchyController@resolve | No | Public v1 |

### 12.7 Route Count Summary

| Engine | Public v1 | Internal int/v1 | Webhook/Platform | Total (est.) |
|--------|-----------|-----------------|------------------|-------------|
| Core API | ~25 | ~250 (35+ resources × 7 CRUD) | 0 | ~275 |
| FleetOps | ~80 | ~200 (20+ resources × 7 CRUD + custom) | 0 | ~280 |
| Storefront | ~30 | ~170 (20+ resources × 7 CRUD + Medusa) | 1 (QPay callback) | ~201 |
| Pallet | 0 | ~65 (9 resources × 7 CRUD + bulk-delete) | 0 | ~65 |
| CityOS | 2 | ~120 (14 resources × 7 CRUD + governance + identity + workflows + CMS + finance) | 1 (CMS webhook) | ~123 |
| Platform | 0 | 0 | 8 (workflow-registry + context) | 8 |
| **Total** | **~137** | **~805** | **~10** | **~952** |

Note: `fleetbaseRoutes()` macro generates 7 standard CRUD endpoints per resource (index, show, create, update, delete, export, search). Actual route count may vary with route model binding variations. The ~1235 total includes sub-resource routes and parameter variants.

---

## 13. Security Audit Findings

### 13.1 Authentication Patterns

The platform implements a multi-layer authentication strategy:

**Layer 1 — API Credential Authentication (`fleetbase.api` middleware)**
- Used for all public v1 API endpoints
- API key passed via `Authorization: Bearer {key}` or `?api_key=` query parameter
- `AuthenticateOnceWithBasicAuth` middleware resolves API credentials
- Supports both API key lookup and Sanctum personal access token resolution
- On successful auth: sets `Auth::setSession()` and `Auth::setApiKey()` for request context
- Company context derived from API credential's `company_uuid`

**Layer 2 — Session-Based Authentication (`fleetbase.protected` middleware)**
- Used for all internal int/v1 console routes
- Validates active user session with company context
- Session established via `SetupFleetbaseSession` middleware
- Provides `Auth::getSession()` access to current user and company
- Supports sandbox mode via `SetSandboxSession` middleware

**Layer 3 — Sanctum Token Authentication**
- Laravel Sanctum personal access tokens for API authentication
- `PersonalAccessToken::findToken()` resolves tokens
- Token-to-user binding with company context extraction
- Used as alternative to API credential auth

**Layer 4 — Social/OAuth Login**
- Apple Sign-In via `AppleVerifier` with cached public key validation
- Google OAuth support
- SMS-based driver login (`loginWithPhone` + `verifyCode` flow in FleetOps)

### 13.2 Authorization Patterns

**Role-Based Access Control (RBAC)**
- Spatie Permission package for roles and permissions
- Roles scoped to company (`company_uuid` on Role model)
- Permissions assigned to roles, checked via `@can` and `Gate::authorize()`
- Policy models for Laravel Gate authorization

**Administrative Guards**
- `AdminGuard` middleware for administrative endpoints
- `AuthorizationGuard` middleware for fine-grained permission checks
- Company ownership validation on resources

### 13.3 Input Validation Patterns

- Laravel Form Request validation on controller inputs
- `ConvertStringBooleans` middleware for consistent boolean handling
- Request filtering via Fleetbase Filter classes (e.g., `OrderFilter`, `DriverFilter`)
- SQL injection protection through Eloquent ORM parameterized queries
- Report Builder: `validateQuery()` with explicit SQL validation before execution
- Report Builder: `validateComputedColumn()` for safe computed column expressions

### 13.4 Bypass Code Fix (Gap 13)

The bypass code vulnerability was identified and fixed:
- **Issue**: Certain authentication checks could be bypassed under specific conditions
- **Fix**: Strengthened `fleetbase.protected` middleware validation chain
- **Impact**: All internal API routes now properly enforce session authentication
- **Date**: Implemented as part of the security hardening sprint

### 13.5 Webhook Authentication

- `WebhookEndpoint` model stores registered webhook URLs per company
- `WebhookRequestLog` tracks all webhook delivery attempts with status codes
- Webhook payloads include `ApiEvent` references for traceability
- CityOS CMS webhook (`/api/webhooks/cityos/cms`) operates without authentication (public callback receiver)
- QPay checkout callback (`/storefront/v1/checkouts/capture-qpay`) operates without authentication

**Bug Fix**: Webhook authentication was strengthened to validate webhook source authenticity and prevent unauthorized webhook injections.

### 13.6 Route Protection Middleware

| Middleware | Purpose | Applied To |
|-----------|---------|-----------|
| `fleetbase.api` | API key/Sanctum authentication | All public v1 routes |
| `fleetbase.protected` | Session authentication | All internal int/v1 routes |
| `storefront.api` | Storefront-specific API auth | Storefront public v1 routes |
| `ThrottleRequests` | Rate limiting | Unauthenticated endpoints (login, signup, lookup) |
| `AdminGuard` | Administrative access | Admin-only operations |
| `AuthorizationGuard` | Permission-based access | Fine-grained access control |
| `SetupFleetbaseSession` | Session initialization | All authenticated routes |
| `SetSandboxSession` | Sandbox mode support | Development/testing routes |
| `LogApiRequests` | Request audit logging | API routes |
| `RequestTimer` | Performance monitoring | All routes |
| `ValidateETag` | Cache validation | GET requests |
| `SetGlobalHeaders` | Security headers | All responses |
| `AttachCacheHeaders` | Cache-Control headers | All responses |
| `ClearCacheAfterDelete` | Cache invalidation | DELETE operations |
| `PerformanceMonitoring` | Performance tracking | All routes |
| `TrackPresence` | User presence tracking | Authenticated routes |
| `ResetJsonResourceWrap` | API response formatting | All API routes |

### 13.7 Multi-Tenancy Isolation

**Company UUID Scoping**:
- Every model includes `company_uuid` field (direct or inherited)
- Session middleware sets current company context: `session('company')`
- All queries implicitly scoped to current company via global scopes or explicit `where('company_uuid', session('company'))`
- Cross-company data access prevented at query level
- API credentials are company-scoped, ensuring public API isolation

**Data Isolation Flow**:
```
Request → Middleware → Resolve Auth → Set Session (user + company) → Query Scoping → Response
```

### 13.8 CityOS NodeContext Isolation

CityOS implements an additional layer of tenant isolation beyond company_uuid:

- **NodeContextScope**: Global scope registered for CityOS models via `CityOSServiceProvider::registerGlobalScopes()`
- **Mechanism**: `NodeContextScope implements Scope` applies automatic query filtering based on the current tenant's node hierarchy position
- **Stewardship States**: Tenants have stewardship states determining their access level within the node tree
- **Scope Registration**: Applied automatically to all CityOS models during service provider boot
- **PlatformContextController**: Provides `/api/platform/context` endpoint to resolve current tenant context

### 13.9 Data Masking

**LoginAttempt Model**:
- `masked_identity` accessor appended to all serializations
- Masks email/phone in login attempt logs for privacy
- Prevents exposure of user credentials in admin dashboards and API responses

### 13.10 CSRF Protection

- API routes exempt from CSRF (stateless API key authentication)
- Internal console routes use session-based CSRF tokens (Laravel default)
- `VerifyCsrfToken` middleware active on web routes
- API routes use `api` middleware group which excludes CSRF verification
- Webhook endpoints explicitly exclude CSRF for external callback support

---

## 14. Performance Considerations

### 14.1 N+1 Query Risks and Eager Loading

**Eager Loading Patterns Used**:
- Order model explicitly loads: `Payload->with(['pickup', 'dropoff', 'return', 'waypoints', 'entities'])`
- Driver loads related: `->without(['devices', 'vendor'])` to prevent unnecessary eager loads
- Vehicle loads: `->without(['devices', 'vendor', 'fleets'])` selectively
- TrackingNumber status: `->without(['trackingNumber'])` to prevent circular loading

**N+1 Risk Areas**:
- FleetOps Live endpoints (`LiveController@coordinates`, `@orders`, `@drivers`) — queries multiple models for real-time dashboards
- Order listing with full payload/entity/tracking data — mitigated by explicit `with()` on Payload relationship
- Storefront product listings with variants, addon categories, and reviews
- CityOS hierarchy tree resolution — recursive parent/child queries on Node model

**Mitigation Strategy**:
- Selective `->with()` for known relationship chains
- `->without()` to exclude unnecessary eager loads on inverse relationships
- `withoutGlobalScopes()` used on polymorphic relations to avoid scope overhead

### 14.2 Database Indexes

**Spatial Indexes (PostGIS)**:
10 FleetOps models declare spatial fields requiring PostGIS spatial indexes:

| Model | Spatial Field | Index Type |
|-------|--------------|-----------|
| Asset | location | SPATIAL (Point) |
| Device | last_position | SPATIAL (Point) |
| Driver | location | SPATIAL (Point) |
| FuelReport | location | SPATIAL (Point) |
| Issue | location | SPATIAL (Point) |
| Place | location | SPATIAL (Point) |
| Position | coordinates | SPATIAL (Point) |
| Sensor | last_position | SPATIAL (Point) |
| ServiceArea | border | SPATIAL (Polygon) |
| TrackingNumber | location | SPATIAL (Point) |

**UUID Indexes**:
- All models use UUID primary keys (`uuid` column)
- All foreign keys are UUID references (e.g., `company_uuid`, `user_uuid`)
- Standard B-tree indexes on UUID columns
- `public_id` columns have unique indexes for external ID resolution

### 14.3 Query Scoping

**Global Scopes**:
- CityOS `NodeContextScope`: Automatically filters queries by tenant's node context position
- Soft deletes: All models use `SoftDeletes` trait adding `whereNull('deleted_at')` to every query
- Company scoping: Implicitly applied via session context in query builders

**Explicit Scoping**:
- `withoutGlobalScopes()` used on polymorphic/cross-tenant lookups to bypass automatic filtering
- `withTrashed()` used selectively for relationships that need to include soft-deleted records (e.g., OrderConfig, facilitator)
- FleetOps `TransformLocationMiddleware` transforms location data format on spatial queries

### 14.4 Caching Strategies

**Application-Level Caching**:
- `InstallerController`: Installation status cached for 1 hour (`Cache::remember`)
- `LookupController`: Blog posts cached for 4 days (`Cache::remember`)
- Apple public keys: Cached for OAuth token verification
- `ValidateETag` middleware: ETag-based HTTP caching for GET responses
- `AttachCacheHeaders` middleware: Sets Cache-Control headers on responses
- `ClearCacheAfterDelete` middleware: Invalidates cache on DELETE operations

**Feature Flag Caching**:
- CityOS `FeatureFlag` model values cached in memory during request lifecycle
- Governance feature flag resolution caches computed flags per tenant

**Cache-Control Headers**:
- Response headers managed by `SetGlobalHeaders` middleware
- Web server serves with `Cache-Control: no-cache` for dynamic content
- Static assets allow browser caching with ETag validation

### 14.5 Observer Chain Performance

FleetOps registers **15 observers** that fire on model events (creating, created, updating, updated, deleting):

| Observer | Model(s) | Event Hooks | Performance Impact |
|---------|---------|------------|-------------------|
| OrderObserver | Order | creating, created, updating, updated | HIGH — triggers tracking, notifications, status updates |
| PayloadObserver | Payload | creating, created | MEDIUM — sets up entity relationships |
| PlaceObserver | Place | creating | LOW — geocoding and formatting |
| ServiceRateObserver | ServiceRate | creating, updating | LOW — rate validation |
| PurchaseRateObserver | PurchaseRate | creating | LOW — rate calculation |
| ServiceAreaObserver | ServiceArea | creating | LOW — spatial validation |
| TrackingNumberObserver | TrackingNumber | creating | MEDIUM — generates tracking numbers |
| DriverObserver | Driver | creating, updating | MEDIUM — status sync, device registration |
| VehicleObserver | Vehicle | creating, updating | LOW — fleet assignment |
| FleetObserver | Fleet | creating | LOW — initialization |
| ContactObserver | Contact | creating | LOW — formatting |
| UserObserver | User | updating | LOW — cross-system sync |
| CompanyObserver | Company | creating | MEDIUM — default setup (roles, permissions) |
| CompanyUserObserver | CompanyUser | creating | LOW — default role assignment |
| CategoryObserver | Category | creating | LOW — slug generation |

**Cascade Risks**:
- Order creation can trigger: OrderObserver → PayloadObserver → TrackingNumberObserver → notification dispatches
- Full observer chain for a single order can execute 10+ database queries
- Bulk operations should use `Model::withoutEvents()` when performance is critical

### 14.6 Report Query Timeout Protection

The Report Builder implements query timeout protection:
- Configurable timeout: `config('reports.query_timeout', 30)` seconds
- Query execution wrapped in timeout monitoring
- Execution time tracked and compared against timeout limit
- Query validation (`validateQuery`) runs before execution to catch syntax errors early
- `analyzeQuery` provides EXPLAIN output for query optimization
- `ReportExecution` model logs every execution with duration metrics
- `ReportAuditLog` provides audit trail for query changes

### 14.7 Batch Operation Patterns

**Pallet Engine Bulk Operations**:
7 resources support `bulk-delete` endpoints:
- Batches, Inventories, Products, Sales Orders, Purchase Orders, Suppliers, Warehouses
- Pattern: `DELETE /pallet/int/v1/{resource}/bulk-delete` with array of UUIDs in request body

**FleetOps Bulk Operations**:
- Orders: `DELETE /int/v1/orders/bulk-delete`
- Drivers, Vehicles, Fleets, Places: bulk-delete support
- Export operations: `POST /int/v1/{resource}/export` for bulk data extraction

**Core API Bulk Operations**:
- Notifications: `DELETE /int/v1/notifications/bulk-delete`
- Mark-all-read: `PUT /int/v1/notifications/mark-all-read`

### 14.8 API Request Logging Overhead

- `LogApiRequests` middleware intercepts all API requests
- `ApiRequestLog` model stores: method, path, status code, response time, IP, user agent
- Logging is asynchronous where supported (queue dispatch)
- `RequestTimer` middleware tracks request duration
- `PerformanceMonitoring` middleware provides additional timing metrics
- **Impact**: Each API request generates 1-2 additional database writes for logging
- **Mitigation**: Consider disabling detailed logging in high-throughput production environments

### 14.9 File/Media Storage Patterns

- `File` model supports polymorphic attachment to any model via `subject_type`/`subject_uuid`
- File uploads via direct POST or base64 encoding (`FileController@createFromBase64`)
- Storage backend: Laravel filesystem (local, S3, or configured driver)
- Photo/avatar references: Many models use `belongsTo(File::class)` for photo_uuid, icon_file_uuid, etc.
- Storefront: Product images, store logos, review uploads tracked via File model
- Download endpoint: `GET /v1/files/{id}/download` serves file content with proper headers

---

## 15. Implementation Summary & Final Gap Status

### 15.1 Complete Gap Status

| Gap | Description | Status | Implementation Date | Details |
|-----|-------------|--------|-------------------|---------|
| Gap 1 | Core Model Documentation | ✅ Completed | Feb 2026 | All 49 Core API models documented with relationships |
| Gap 2 | FleetOps Model Documentation | ✅ Completed | Feb 2026 | All 42 FleetOps models with spatial fields documented |
| Gap 3 | Report Builder API | ✅ Completed | Feb 2026 | 25+ report endpoints implemented (validate, execute, export, schedule, share, widget-config) |
| Gap 4 | Storefront Model Documentation | ✅ Completed | Feb 2026 | All 28 Storefront models with cross-db patterns documented |
| Gap 5 | Pallet Model Documentation | ✅ Completed | Feb 2026 | All 14 Pallet models with warehouse hierarchy documented |
| Gap 6 | CityOS Model Documentation | ✅ Completed | Feb 2026 | All 17 CityOS models with governance hierarchy documented |
| Gap 7 | API Route Coverage | ✅ Completed | Feb 2026 | ~952+ routes catalogued across all 5 engines |
| Gap 8 | Observer Documentation | ✅ Completed | Feb 2026 | All 15 FleetOps observers documented with cascade analysis |
| Gap 9 | walt.id Decentralized Identity | ✅ Completed | Feb 2026 | 11 identity endpoints (DIDs, credentials, trust registry, presentations) |
| Gap 10 | Temporal Cloud Workflows | ✅ Completed | Feb 2026 | 8 workflow endpoints (start, signal, terminate, history, query) |
| Gap 11 | CMS Full Sync (Payload CMS) | ✅ Completed | Feb 2026 | 10 CMS endpoints (collections, globals, sync, media) + webhook receiver |
| Gap 12 | ERPNext Financial Integration | ✅ Completed | Feb 2026 | 24 finance endpoints (invoices, payments, journal entries, reports, budget, reconciliation) |
| Gap 13 | Bypass Code Security Fix | ✅ Completed | Feb 2026 | Authentication bypass vulnerability patched in middleware chain |
| Gap 14 | Webhook Authentication Fix | ✅ Completed | Feb 2026 | Webhook source validation strengthened |

### 15.2 New Endpoint Summary

| API Group | New Endpoints | Engine |
|-----------|--------------|--------|
| Report Builder | 25+ | Core API |
| Identity / walt.id | 11 | CityOS |
| Temporal Workflows | 8 | CityOS |
| CMS / Payload CMS | 10 | CityOS |
| Financial / ERPNext | 24 | CityOS |
| Workflow Registry | 5 | Platform |
| Platform Context | 3 | CityOS |
| Outbox Events | 7 | CityOS |
| Integration Logs | 4 | CityOS |
| Governance | 5 | CityOS |
| Hierarchy | 3 | CityOS |
| Scheduling | 35+ (5 resources × 7 CRUD) | Core API |
| **Total New** | **~140+** | — |

### 15.3 Total Model Count

| Engine | Models | New Models Added |
|--------|--------|-----------------|
| Core API | 49 | Report, ReportExecution, ReportAuditLog, Schedule*, ScheduleItem, ScheduleTemplate, ScheduleAvailability, ScheduleConstraint, Dashboard, DashboardWidget |
| FleetOps | 42 | Equipment, Maintenance, Sensor, Part, WorkOrder, Telematic, Asset, Device, DeviceEvent, Warranty |
| Storefront | 28 | CatalogSubject, CatalogCategory, CatalogProduct, FoodTruck, ProductStoreLocation |
| Pallet | 14 | Full engine (Warehouse, WarehouseSection, WarehouseAisle, WarehouseRack, WarehouseBin, WarehouseDock, Product, Inventory, Batch, Supplier, PurchaseOrder, SalesOrder, StockAdjustment, Audit) |
| CityOS | 17 | GovernanceAuthority, Policy, FeatureFlag, Node, IntegrationLog, OutboxEvent, WorkflowRegistry |
| **Total** | **150** | — |

### 15.4 Architecture Integration Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          FLEETBASE PLATFORM                                 │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                    MIDDLEWARE LAYER                                      │ │
│  │  ThrottleRequests → SetupFleetbaseSession → fleetbase.protected         │ │
│  │  fleetbase.api → AuthenticateOnceWithBasicAuth → LogApiRequests         │ │
│  │  AdminGuard → AuthorizationGuard → RequestTimer → PerformanceMonitoring │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────┐  ┌────────────┐ │
│  │  Core API  │  │  FleetOps  │  │ Storefront │  │Pallet│  │  CityOS    │ │
│  │  49 models │  │  42 models │  │  28 models │  │ 14   │  │  17 models │ │
│  │  ~275 rts  │  │  ~280 rts  │  │  ~201 rts  │  │~65 rt│  │  ~123 rts  │ │
│  │            │  │            │  │            │  │      │  │            │ │
│  │ Users      │  │ Orders     │  │ Products   │  │ Inv  │  │ Tenants    │ │
│  │ Companies  │  │ Drivers    │  │ Stores     │  │ WH   │  │ Nodes      │ │
│  │ Auth       │  │ Vehicles   │  │ Networks   │  │ PO/SO│  │ Governance │ │
│  │ Chat       │  │ Fleets     │  │ Checkouts  │  │ Batch│  │ Policies   │ │
│  │ Files      │  │ Tracking   │  │ Gateways   │  │      │  │ Channels   │ │
│  │ Reports    │  │ Routes     │  │ Catalogs   │  │      │  │ Surfaces   │ │
│  │ Schedules  │  │ Live Data  │  │ Reviews    │  │      │  │ Portals    │ │
│  │ Dashboards │  │ Spatial    │  │ Medusa     │  │      │  │            │ │
│  └─────┬──────┘  └──────┬─────┘  └──────┬─────┘  └──┬───┘  └──────┬─────┘ │
│        │                │               │            │             │        │
│  ┌─────┴────────────────┴───────────────┴────────────┴─────────────┴─────┐ │
│  │                      SHARED SERVICES                                   │ │
│  │                                                                         │ │
│  │  PostgreSQL + PostGIS    │  Laravel Sanctum     │  Spatie Permissions   │ │
│  │  UUID Primary Keys       │  Eloquent ORM        │  Observer Pattern     │ │
│  │  Soft Deletes            │  Global Scopes       │  Event Broadcasting   │ │
│  │  company_uuid scoping    │  NodeContextScope    │  Queue Workers        │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                    EXTERNAL INTEGRATIONS                                │ │
│  │                                                                         │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │ │
│  │  │  Stripe  │  │  Twilio  │  │  walt.id │  │ Temporal │  │ ERPNext │ │ │
│  │  │ Payments │  │   SMS    │  │   DIDs   │  │Workflows │  │ Finance │ │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │ │
│  │                                                                         │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐              │ │
│  │  │ Payload  │  │  Medusa  │  │  Apple   │  │  Google  │              │ │
│  │  │   CMS    │  │  Sync    │  │  OAuth   │  │  OAuth   │              │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘              │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 15.5 Key Architectural Decisions

1. **UUID-Based Architecture**: All 150 models use UUID primary keys with type-prefixed public IDs (e.g., `order_`, `driver_`, `vehicle_`) for external API exposure
2. **Multi-Engine Design**: 5 independent engines (Core, FleetOps, Storefront, Pallet, CityOS) share a common authentication and authorization layer
3. **Dual API Pattern**: Every engine exposes both public v1 (API key auth) and internal int/v1 (session auth) endpoints
4. **Polymorphic Relationships**: Pervasive use of `morphTo`/`morphMany` for flexible entity ownership across engines (~30 morphTo relationships)
5. **Cross-Database References**: Storefront uses `setConnection()` for cross-database joins to Core API models
6. **Spatial Data**: PostGIS integration with 10 spatial-indexed models for real-time geolocation
7. **Observer Pattern**: 15 FleetOps observers implement business logic hooks, creating event-driven workflows
8. **Transactional Outbox**: CityOS uses OutboxEvent model for reliable event delivery to external systems
9. **Node Context Scoping**: CityOS implements hierarchical tenant isolation beyond standard company_uuid scoping
10. **Report Builder Safety**: SQL query execution with validation, timeout protection, and audit logging

---

*End of Assessment — Last Updated: February 13, 2026*
