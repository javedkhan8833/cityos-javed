# Fleetbase API Test Report

**Generated:** 2026-02-13 18:27:15

## Server Connection

| Field | Value |
|-------|-------|
| Status | Connected |
| URL | `https://efdaeea4-1883-4ef0-9888-41da8659025c-00-19fmj1r05ozg4.pike.replit.dev:8000` |

## Dashboard Stats

| Metric | Count |
|--------|-------|
| Orders | 0 |
| Drivers | 1 |
| Vehicles | 2 |
| Fleets | 0 |
| Active Drivers | 0 |

## CityOS Context

| Header | Value |
|--------|-------|
| X-CityOS-Country | Saudi Arabia |
| X-CityOS-City | Riyadh |
| X-CityOS-Tenant | Dakkah |
| X-CityOS-Channel | delivery |

**Total Duration:** 321.5s

## Resource Tests — With CityOS Context

**Summary:** 28 passed, 11 failed, 41 skipped out of 80 total

| Resource | LIST | GET | CREATE | UPDATE | DELETE | Status |
|----------|------|-----|--------|--------|--------|--------|
| Vehicles | PASS | PASS | FAIL | PASS | SKIP | FAIL |
| Drivers | PASS | PASS | FAIL | PASS | SKIP | FAIL |
| Orders | PASS | SKIP | FAIL | SKIP | SKIP | FAIL |
| Places | PASS | SKIP | FAIL | SKIP | SKIP | FAIL |
| Contacts | PASS | PASS | FAIL | PASS | SKIP | FAIL |
| Vendors | PASS | PASS | PASS | PASS | PASS | PASS |
| Fleets | PASS | SKIP | FAIL | SKIP | SKIP | FAIL |
| Service Areas | PASS | SKIP | FAIL | SKIP | SKIP | FAIL |
| Zones | PASS | SKIP | FAIL | SKIP | SKIP | FAIL |
| Service Rates | PASS | SKIP | FAIL | SKIP | SKIP | FAIL |
| Entities | PASS | PASS | FAIL | PASS | SKIP | FAIL |
| Payloads | PASS | SKIP | SKIP | SKIP | SKIP | PASS |
| Tracking Numbers | PASS | PASS | SKIP | SKIP | SKIP | PASS |
| Tracking Statuses | PASS | SKIP | SKIP | SKIP | SKIP | PASS |
| Service Quotes | FAIL | SKIP | SKIP | SKIP | SKIP | FAIL |
| Purchase Rates | PASS | SKIP | SKIP | SKIP | SKIP | PASS |

### Failed Tests Detail

- **Vehicles — CREATE** (1890ms)
  - Failed to CREATE with context [Country=Saudi Arabia, City=Riyadh, Tenant=Dakkah, Channel=delivery]: The selected status is invalid.
  - Data: `{"sent":{"name":"_Test Vehicle 283284","plate_number":"TST-283284","model":"Test Model","year":2024,"type":"car","status":"active"},"response":{"error":"The selected status is invalid.","source":"flee`
- **Drivers — CREATE** (2613ms)
  - Failed to CREATE with context [Country=Saudi Arabia, City=Riyadh, Tenant=Dakkah, Channel=delivery]: SQLSTATE[22001]: String data, right truncated: 7 ERROR:  value too long for type character varying(2) (Connection: pgsql, SQL: insert into "drivers" ("drivers_license_number", "status", "user_uuid", "company_uuid", "online", "uuid", "public_id", "internal_id", "_key", "slug", "country_code", "location", "updated_at", "created_at") values (DL-T291340, active, 9fcf8b67-8d64-41dc-a892-890936bae6a4, 29ae887c-0e4c-4f15-834e-31a2f1ea9621, 0, 61bb6e33-06c9-4f76-b963-b6ce1f02377c, driver_hZq8lbMVkN, DC760494, dk_dev_22d60466c799dbf8d9af7d6af51244359d77d26c9cb7fe287515c8b6667977d2, dl-t291340, Saudi Arabia, ST_GeomFromText(POINT(0 0), 0), 2026-02-13 18:11:33, 2026-02-13 18:11:33))
  - Data: `{"sent":{"name":"_Test Driver 291340","email":"test291340@test.local","phone":"+966500291340","drivers_license_number":"DL-T291340"},"response":{"error":"SQLSTATE[22001]: String data, right truncated:`
- **Orders — CREATE** (1935ms)
  - Failed to CREATE with context [Country=Saudi Arabia, City=Riyadh, Tenant=Dakkah, Channel=delivery]: The pickup field is required.; The dropoff field is required.; The waypoints field is required.
  - Data: `{"sent":{"type":"default","notes":"_Test order 297764"},"response":{"error":"The pickup field is required.; The dropoff field is required.; The waypoints field is required.","source":"fleetbase"}}`
- **Places — CREATE** (3189ms)
  - Failed to CREATE with context [Country=Saudi Arabia, City=Riyadh, Tenant=Dakkah, Channel=delivery]: Class "Redis" not found
  - Data: `{"sent":{"name":"_Test Place 301721","street1":"123 Test St","city":"Test City","country":"SA"},"response":{"error":"Class \"Redis\" not found","source":"fleetbase"}}`
- **Contacts — CREATE** (2329ms)
  - Failed to CREATE with context [Country=Saudi Arabia, City=Riyadh, Tenant=Dakkah, Channel=delivery]: SQLSTATE[22001]: String data, right truncated: 7 ERROR:  value too long for type character varying(2) (Connection: pgsql, SQL: insert into "contacts" ("company_uuid", "name", "email", "type", "phone", "user_uuid", "uuid", "public_id", "internal_id", "_key", "slug", "country_code", "updated_at", "created_at") values (29ae887c-0e4c-4f15-834e-31a2f1ea9621, _Test Contact 309540, testc309540@test.local, customer, +966501309540, 346ad562-5bf8-42c6-8bdd-439befe5170d, e485f176-310b-4dfb-9883-9e0bb24e8e88, contact_pQ89J5TkI7, DC784240, dk_dev_22d60466c799dbf8d9af7d6af51244359d77d26c9cb7fe287515c8b6667977d2, test-contact-309540, Saudi Arabia, 2026-02-13 18:11:51, 2026-02-13 18:11:51))
  - Data: `{"sent":{"name":"_Test Contact 309540","email":"testc309540@test.local","phone":"+966501309540","type":"customer"},"response":{"error":"SQLSTATE[22001]: String data, right truncated: 7 ERROR:  value t`
- **Fleets — CREATE** (2121ms)
  - Failed to CREATE with context [Country=Saudi Arabia, City=Riyadh, Tenant=Dakkah, Channel=delivery]: SQLSTATE[22001]: String data, right truncated: 7 ERROR:  value too long for type character varying(2) (Connection: pgsql, SQL: insert into "fleets" ("name", "company_uuid", "uuid", "public_id", "_key", "slug", "country_code", "updated_at", "created_at") values (_Test Fleet 326718, 29ae887c-0e4c-4f15-834e-31a2f1ea9621, 0f3a8e1c-af67-4fd9-b28a-cb7348fc212c, fleet_wGpY0FrfxO, dk_dev_22d60466c799dbf8d9af7d6af51244359d77d26c9cb7fe287515c8b6667977d2, test-fleet-326718, Saudi Arabia, 2026-02-13 18:12:08, 2026-02-13 18:12:08))
  - Data: `{"sent":{"name":"_Test Fleet 326718","status":"active"},"response":{"error":"SQLSTATE[22001]: String data, right truncated: 7 ERROR:  value too long for type character varying(2) (Connection: pgsql, S`
- **Service Areas — CREATE** (2142ms)
  - Failed to CREATE with context [Country=Saudi Arabia, City=Riyadh, Tenant=Dakkah, Channel=delivery]: The country field is required.; The border field is required.
  - Data: `{"sent":{"name":"_Test Area 330519","type":"standard"},"response":{"error":"The country field is required.; The border field is required.","source":"fleetbase"}}`
- **Zones — CREATE** (1849ms)
  - Failed to CREATE with context [Country=Saudi Arabia, City=Riyadh, Tenant=Dakkah, Channel=delivery]: The service area field is required.; The border field is required.
  - Data: `{"sent":{"name":"_Test Zone 334551"},"response":{"error":"The service area field is required.; The border field is required.","source":"fleetbase"}}`
- **Service Rates — CREATE** (1897ms)
  - Failed to CREATE with context [Country=Saudi Arabia, City=Riyadh, Tenant=Dakkah, Channel=delivery]: The service name field is required.; The service type field is required.; The rate calculation method field is required.; The currency field is required.
  - Data: `{"sent":{"name":"_Test Rate 338205"},"response":{"error":"The service name field is required.; The service type field is required.; The rate calculation method field is required.; The currency field i`
- **Entities — CREATE** (2139ms)
  - Failed to CREATE with context [Country=Saudi Arabia, City=Riyadh, Tenant=Dakkah, Channel=delivery]: SQLSTATE[42883]: Undefined function: 7 ERROR:  function st_pointfromtext(unknown, integer, unknown) does not exist
LINE 1: ...created_at", "company_uuid") values ($1, $2, $3, (ST_PointFr...
                                                             ^
HINT:  No function matches the given name and argument types. You might need to add explicit type casts. (Connection: pgsql, SQL: insert into "tracking_statuses" ("tracking_number_uuid", "status", "details", "location", "code", "uuid", "public_id", "_key", "created_at", "company_uuid") values (b17d6d4a-a387-47a5-9c8e-f7025c2f78dd, Entity Created, New entity created., (ST_PointFromText('POINT(0 0)', 0, 'axis-order=long-lat')), CREATED, ba17ef1a-a9b1-4357-88e1-5c5eaec73f41, status_ioDt5xtvva, dk_dev_22d60466c799dbf8d9af7d6af51244359d77d26c9cb7fe287515c8b6667977d2, 2026-02-13 18:12:25, 29ae887c-0e4c-4f15-834e-31a2f1ea9621))
  - Data: `{"sent":{"name":"_Test Entity 343884","type":"package"},"response":{"error":"SQLSTATE[42883]: Undefined function: 7 ERROR:  function st_pointfromtext(unknown, integer, unknown) does not exist\nLINE 1:`
- **Service Quotes — LIST** (2149ms)
  - Failed with context [Country=Saudi Arabia, City=Riyadh, Tenant=Dakkah, Channel=delivery]: The payload field is required when none of waypoints / pickup / dropoff are present.; The pickup field is required when none of payload / waypoints are present.; The dropoff field is required when none of payload / waypoints are present.; The waypoints field is required when none of payload / pickup / dropoff are present.
  - Data: `{"error":"The payload field is required when none of waypoints / pickup / dropoff are present.; The pickup field is required when none of payload / waypoints are present.; The dropoff field is require`

## Extended Tests

### Pagination & Limits

**Summary:** 8 passed, 0 failed, 0 skipped

| Test | Status | Duration | Message |
|------|--------|----------|---------|
| vehicles — limit=2 | PASS | 1899ms | Returned 2 items (limit=2 respected) |
| drivers — limit=2 | PASS | 1940ms | Returned 1 items (limit=2 respected) |
| orders — limit=2 | PASS | 2010ms | Returned 0 items (limit=2 respected) |
| vehicles — page=1&limit=1 | PASS | 2159ms | Page 1 returned 1 item(s) |
| drivers — page=1&limit=1 | PASS | 1910ms | Page 1 returned 1 item(s) |
| orders — page=1&limit=1 | PASS | 1847ms | Page 1 returned 0 item(s) |
| vehicles — limit=0 (edge case) | PASS | 2233ms | Returned 1 items with limit=0 |
| vehicles — limit=999 (large limit) | PASS | 2017ms | Returned 2 items with limit=999 |

### Filtering & Search

**Summary:** 10 passed, 0 failed, 0 skipped

| Test | Status | Duration | Message |
|------|--------|----------|---------|
| Filter vehicles by status=active | PASS | 1944ms | Returned 2 item(s) matching status=active |
| Filter drivers by status=active | PASS | 2019ms | Returned 1 item(s) matching status=active |
| Filter orders by status=created | PASS | 1943ms | Returned 0 item(s) matching status=created |
| Filter contacts by type=customer | PASS | 2852ms | Returned 2 item(s) matching type=customer |
| Filter vendors by type=logistics | PASS | 2635ms | Returned 1 item(s) matching type=logistics |
| Search vehicles search query=test | PASS | 1929ms | Returned 0 result(s) for "query=test" |
| Search drivers search query=test | PASS | 2007ms | Returned 0 result(s) for "query=test" |
| Search places search query=test | PASS | 1845ms | Returned 0 result(s) for "query=test" |
| Sort vehicles sort by created_at | PASS | 2086ms | Sort request accepted |
| Sort orders sort by -created_at (desc) | PASS | 1897ms | Sort request accepted |

### Response Schema Validation

**Summary:** 5 passed, 0 failed, 3 skipped

| Test | Status | Duration | Message |
|------|--------|----------|---------|
| Vehicles schema | PASS | 1907ms | Valid schema — 92 fields, has: name, plate_number, model, status, type |
| Drivers schema | PASS | 1906ms | Valid schema — 27 fields, has: name, email, phone, status |
| Orders schema | SKIP | 1995ms | No items to validate schema |
| Contacts schema | PASS | 3077ms | Valid schema — 16 fields, has: name, email, phone, type |
| Fleets schema | SKIP | 3135ms | No items to validate schema |
| Places schema | SKIP | 2000ms | No items to validate schema |
| Vehicles schema consistency | PASS | 1966ms | All 2 items have consistent field count (92 fields) |
| LIST response is array | PASS | 2166ms | Response is array with 2 items |

### Latency Benchmarks

**Summary:** 8 passed, 0 failed, 0 skipped

| Test | Status | Duration | Message |
|------|--------|----------|---------|
| vehicles avg latency (3 calls) | PASS | 2662ms | Avg: 2662ms \| Min: 2224ms \| Max: 3094ms — acceptable |
| drivers avg latency (3 calls) | PASS | 2107ms | Avg: 2107ms \| Min: 2034ms \| Max: 2152ms — acceptable |
| orders avg latency (3 calls) | PASS | 2151ms | Avg: 2151ms \| Min: 1913ms \| Max: 2419ms — acceptable |
| places avg latency (3 calls) | PASS | 2122ms | Avg: 2122ms \| Min: 2055ms \| Max: 2238ms — acceptable |
| contacts avg latency (3 calls) | PASS | 2634ms | Avg: 2634ms \| Min: 2231ms \| Max: 3367ms — acceptable |
| fleets avg latency (3 calls) | PASS | 2226ms | Avg: 2226ms \| Min: 2051ms \| Max: 2459ms — acceptable |
| Server status endpoint | PASS | 2129ms | Status check: 2129ms |
| Dashboard stats endpoint | PASS | 5998ms | Dashboard stats: 5998ms |

### Error Handling

**Summary:** 6 passed, 1 failed, 0 skipped

| Test | Status | Duration | Message |
|------|--------|----------|---------|
| GET non-existent vehicle | PASS | 2401ms | Correctly returned HTTP 404: Vehicle resource not found. |
| CREATE vehicle with empty body | PASS | 3017ms | Server rejected empty body — HTTP 500: SQLSTATE[22001]: String data, right truncated: 7 ERROR:  value too long for type  |
| POST with invalid content type | PASS | 2451ms | Server rejected non-JSON body — HTTP 500: SQLSTATE[22001]: String data, right truncated: 7 ERROR:  value too long for ty |
| GET non-existent resource | FAIL | 537ms | Unexpected success for non-existent resource — possible wildcard routing |
| UPDATE non-existent vehicle | PASS | 1450ms | Correctly returned HTTP 404: Vehicle resource not found. |
| DELETE non-existent vehicle | PASS | 1461ms | Correctly returned HTTP 404: Vehicle resource not found. |
| CREATE with oversized fields | PASS | 1931ms | Server rejected oversized fields — HTTP 500: SQLSTATE[22001]: String data, right truncated: 7 ERROR:  value too long for |

**Failed Details:**

- **GET non-existent resource**: Unexpected success for non-existent resource — possible wildcard routing

### Authentication & Headers

**Summary:** 6 passed, 0 failed, 0 skipped

| Test | Status | Duration | Message |
|------|--------|----------|---------|
| Server status authenticated | PASS | 1699ms | Authenticated — server connected at https://efdaeea4-1883-4ef0-9888-41da8659025c-00-19fmj1r05ozg4.pike.replit.dev:8000 |
| CityOS context endpoint | PASS | 190ms | Context loaded: Country=Saudi Arabia, City=Riyadh, Tenant=Dakkah, Channel=delivery |
| Content-Type is JSON | PASS | 2031ms | Content-Type: application/json; charset=utf-8 |
| Active server config | PASS | 188ms | Active server: Dakkah CityOS Dev |
| OPTIONS preflight | PASS | 186ms | OPTIONS returned HTTP 204 |
| Idempotent GET requests | PASS | 3067ms | Two identical GET requests returned consistent results |

## Security Audit — Without CityOS Context

**Summary:** 35 passed, 8 failed, 37 skipped out of 80 total

| Resource | LIST | GET | CREATE | UPDATE | DELETE | Status |
|----------|------|-----|--------|--------|--------|--------|
| Vehicles | PASS | PASS | FAIL | PASS | SKIP | FAIL |
| Drivers | PASS | PASS | PASS | PASS | PASS | PASS |
| Orders | PASS | SKIP | FAIL | SKIP | SKIP | FAIL |
| Places | PASS | SKIP | FAIL | SKIP | SKIP | FAIL |
| Contacts | PASS | PASS | PASS | PASS | PASS | PASS |
| Vendors | PASS | PASS | PASS | PASS | PASS | PASS |
| Fleets | PASS | SKIP | PASS | PASS | PASS | PASS |
| Service Areas | PASS | SKIP | FAIL | SKIP | SKIP | FAIL |
| Zones | PASS | SKIP | FAIL | SKIP | SKIP | FAIL |
| Service Rates | PASS | SKIP | FAIL | SKIP | SKIP | FAIL |
| Entities | PASS | PASS | FAIL | PASS | SKIP | FAIL |
| Payloads | PASS | SKIP | SKIP | SKIP | SKIP | PASS |
| Tracking Numbers | PASS | PASS | SKIP | SKIP | SKIP | PASS |
| Tracking Statuses | PASS | SKIP | SKIP | SKIP | SKIP | PASS |
| Service Quotes | FAIL | SKIP | SKIP | SKIP | SKIP | FAIL |
| Purchase Rates | PASS | SKIP | SKIP | SKIP | SKIP | PASS |

### Failed Tests Detail

- **Vehicles — CREATE** (1466ms)
  - Server rejected CREATE without context: The selected status is invalid.
  - Data: `{"sent":{"name":"_Test Vehicle 494750","plate_number":"TST-494750","model":"Test Model","year":2024,"type":"car","status":"active"},"response":{"error":"The selected status is invalid.","source":"flee`
- **Orders — CREATE** (1952ms)
  - Server rejected CREATE without context: The pickup field is required.; The dropoff field is required.; The waypoints field is required.
  - Data: `{"sent":{"type":"default","notes":"_Test order 508687"},"response":{"error":"The pickup field is required.; The dropoff field is required.; The waypoints field is required.","source":"fleetbase"}}`
- **Places — CREATE** (5039ms)
  - Server rejected CREATE without context: Class "Redis" not found
  - Data: `{"sent":{"name":"_Test Place 513043","street1":"123 Test St","city":"Test City","country":"SA"},"response":{"error":"Class \"Redis\" not found","source":"fleetbase"}}`
- **Service Areas — CREATE** (2447ms)
  - Server rejected CREATE without context: The country field is required.; The border field is required.
  - Data: `{"sent":{"name":"_Test Area 552544","type":"standard"},"response":{"error":"The country field is required.; The border field is required.","source":"fleetbase"}}`
- **Zones — CREATE** (2076ms)
  - Server rejected CREATE without context: The service area field is required.; The border field is required.
  - Data: `{"sent":{"name":"_Test Zone 557426"},"response":{"error":"The service area field is required.; The border field is required.","source":"fleetbase"}}`
- **Service Rates — CREATE** (2011ms)
  - Server rejected CREATE without context: The service name field is required.; The service type field is required.; The rate calculation method field is required.; The currency field is required.
  - Data: `{"sent":{"name":"_Test Rate 561664"},"response":{"error":"The service name field is required.; The service type field is required.; The rate calculation method field is required.; The currency field i`
- **Entities — CREATE** (4033ms)
  - Server rejected CREATE without context: SQLSTATE[42883]: Undefined function: 7 ERROR:  function st_pointfromtext(unknown, integer, unknown) does not exist
LINE 1: ...created_at", "company_uuid") values ($1, $2, $3, (ST_PointFr...
                                                             ^
HINT:  No function matches the given name and argument types. You might need to add explicit type casts. (Connection: pgsql, SQL: insert into "tracking_statuses" ("tracking_number_uuid", "status", "details", "location", "code", "uuid", "public_id", "_key", "created_at", "company_uuid") values (96f5b8e5-b8fa-4205-b01f-c08c678be6c3, Entity Created, New entity created., (ST_PointFromText('POINT(0 0)', 0, 'axis-order=long-lat')), CREATED, 70e31fcd-35b9-4e41-ab33-1576b909ca44, status_w7OZYOG0Bc, dk_dev_22d60466c799dbf8d9af7d6af51244359d77d26c9cb7fe287515c8b6667977d2, 2026-02-13 18:16:10, 29ae887c-0e4c-4f15-834e-31a2f1ea9621))
  - Data: `{"sent":{"name":"_Test Entity 568112","type":"package"},"response":{"error":"SQLSTATE[42883]: Undefined function: 7 ERROR:  function st_pointfromtext(unknown, integer, unknown) does not exist\nLINE 1:`
- **Service Quotes — LIST** (3341ms)
  - Server rejected request without context: The payload field is required when none of waypoints / pickup / dropoff are present.; The pickup field is required when none of payload / waypoints are present.; The dropoff field is required when none of payload / waypoints are present.; The waypoints field is required when none of payload / pickup / dropoff are present.
  - Data: `{"error":"The payload field is required when none of waypoints / pickup / dropoff are present.; The pickup field is required when none of payload / waypoints are present.; The dropoff field is require`

### Security Violations

**6 resources** returned data without CityOS context headers:

- **Vehicles**: 2 records exposed
- **Drivers**: 1 records exposed
- **Contacts**: 2 records exposed
- **Vendors**: 1 records exposed
- **Entities**: 19 records exposed
- **Tracking Numbers**: 20 records exposed

**Recommendations:**
1. Add server-side middleware to require CityOS context headers on all API endpoints
2. Return HTTP 403 when tenant context is missing or invalid
3. Implement row-level security (RLS) scoped by tenant context
4. Log and alert on requests without proper context headers

---
*Report generated by CityOS Fleet Management Platform*
