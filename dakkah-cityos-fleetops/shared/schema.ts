import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, doublePrecision, jsonb, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ==================== FLEETBASE-BACKED RESOURCES ====================
// Field names match Fleetbase API exactly - no mappers needed

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tracking_number: text("tracking_number").notNull(),
  public_id: text("public_id"),
  internal_id: text("internal_id"),
  type: text("type").notNull().default("default"),
  status: text("status").notNull().default("created"),
  payload_uuid: varchar("payload_uuid"),
  driver_assigned_uuid: varchar("driver_assigned_uuid"),
  facilitator_uuid: varchar("facilitator_uuid"),
  customer_uuid: varchar("customer_uuid"),
  customer_type: text("customer_type"),
  pickup_uuid: varchar("pickup_uuid"),
  dropoff_uuid: varchar("dropoff_uuid"),
  total_amount: numeric("total_amount", { precision: 10, scale: 2 }).default("0"),
  currency: text("currency").notNull().default("SAR"),
  notes: text("notes"),
  meta: jsonb("meta").default(sql`'{}'::jsonb`),
  scheduled_at: timestamp("scheduled_at"),
  dispatched_at: timestamp("dispatched_at"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const drivers = pgTable("drivers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  status: text("status").notNull().default("inactive"),
  drivers_license_number: text("drivers_license_number"),
  photo_url: text("photo_url"),
  vehicle_uuid: varchar("vehicle_uuid"),
  vendor_uuid: varchar("vendor_uuid"),
  fleet_uuid: varchar("fleet_uuid"),
  current_job_uuid: varchar("current_job_uuid"),
  location: jsonb("location"),
  heading: integer("heading"),
  altitude: integer("altitude"),
  speed: integer("speed"),
  country: text("country"),
  online: boolean("online").default(false),
  meta: jsonb("meta").default(sql`'{}'::jsonb`),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const vehicles = pgTable("vehicles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  plate_number: text("plate_number").notNull(),
  make: text("make").notNull().default(""),
  model: text("model").notNull().default(""),
  year: integer("year"),
  type: text("type").notNull().default("van"),
  status: text("status").notNull().default("active"),
  vin_number: text("vin_number"),
  driver_uuid: varchar("driver_uuid"),
  vendor_uuid: varchar("vendor_uuid"),
  location: jsonb("location"),
  speed: integer("speed"),
  heading: integer("heading"),
  altitude: integer("altitude"),
  meta: jsonb("meta").default(sql`'{}'::jsonb`),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const fleets = pgTable("fleets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  service_area_uuid: varchar("service_area_uuid"),
  task: text("task"),
  status: text("status").notNull().default("active"),
  meta: jsonb("meta").default(sql`'{}'::jsonb`),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const places = pgTable("places", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  street1: text("street1").notNull().default(""),
  street2: text("street2"),
  city: text("city"),
  province: text("province"),
  postal_code: text("postal_code"),
  neighborhood: text("neighborhood"),
  district: text("district"),
  building: text("building"),
  security_access_code: text("security_access_code"),
  country: text("country"),
  location: jsonb("location"),
  phone: text("phone"),
  phone_number: text("phone_number"),
  phone_country_code: text("phone_country_code"),
  type: text("type").notNull().default(""),
  meta: jsonb("meta").default(sql`'{}'::jsonb`),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const contacts = pgTable("contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull().default("contact"),
  title: text("title"),
  email: text("email"),
  phone: text("phone"),
  phone_country_code: text("phone_country_code"),
  meta: jsonb("meta").default(sql`'{}'::jsonb`),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const vendors = pgTable("vendors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull().default(""),
  status: text("status").notNull().default("active"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  country: text("country"),
  website_url: text("website_url"),
  place_uuid: varchar("place_uuid"),
  meta: jsonb("meta").default(sql`'{}'::jsonb`),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const service_areas = pgTable("service_areas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull().default("country"),
  status: text("status").notNull().default("active"),
  border: jsonb("border"),
  country: text("country"),
  meta: jsonb("meta").default(sql`'{}'::jsonb`),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const zones = pgTable("zones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  service_area_uuid: varchar("service_area_uuid"),
  boundary: jsonb("boundary"),
  color: text("color"),
  stroke_color: text("stroke_color"),
  status: text("status").notNull().default("active"),
  description: text("description"),
  meta: jsonb("meta").default(sql`'{}'::jsonb`),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const service_rates = pgTable("service_rates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  service_type: text("service_type").notNull().default("parcel"),
  service_area_uuid: varchar("service_area_uuid"),
  zone_uuid: varchar("zone_uuid"),
  base_fee: numeric("base_fee", { precision: 10, scale: 2 }).default("0"),
  per_km_flat_rate_fee: numeric("per_km_flat_rate_fee", { precision: 10, scale: 2 }).default("0"),
  per_meter_flat_rate_fee: numeric("per_meter_flat_rate_fee", { precision: 10, scale: 2 }).default("0"),
  algorithm: text("algorithm").notNull().default("distance_and_time"),
  rate_calculation_method: text("rate_calculation_method").notNull().default("fixed_meter"),
  currency: text("currency").notNull().default("SAR"),
  has_peak_hours_fee: boolean("has_peak_hours_fee").default(false),
  peak_hours_surcharge: numeric("peak_hours_surcharge", { precision: 10, scale: 2 }).default("0"),
  duration_terms: jsonb("duration_terms").default(sql`'[]'::jsonb`),
  meta: jsonb("meta").default(sql`'{}'::jsonb`),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const service_quotes = pgTable("service_quotes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  request_id: text("request_id"),
  service_rate_uuid: varchar("service_rate_uuid"),
  amount: numeric("amount", { precision: 10, scale: 2 }).default("0"),
  currency: text("currency").notNull().default("SAR"),
  meta: jsonb("meta").default(sql`'{}'::jsonb`),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const entities = pgTable("entities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull().default("parcel"),
  sku: text("sku"),
  weight: numeric("weight", { precision: 10, scale: 2 }),
  weight_unit: text("weight_unit").default("kg"),
  length: numeric("length", { precision: 10, scale: 2 }),
  width: numeric("width", { precision: 10, scale: 2 }),
  height: numeric("height", { precision: 10, scale: 2 }),
  dimensions_unit: text("dimensions_unit").default("cm"),
  declared_value: numeric("declared_value", { precision: 10, scale: 2 }),
  price: numeric("price", { precision: 10, scale: 2 }),
  sale_price: numeric("sale_price", { precision: 10, scale: 2 }),
  currency: text("currency").default("SAR"),
  quantity: integer("quantity").default(1),
  payload_uuid: varchar("payload_uuid"),
  description: text("description"),
  photo_url: text("photo_url"),
  meta: jsonb("meta").default(sql`'{}'::jsonb`),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const payloads = pgTable("payloads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull().default("default"),
  pickup_uuid: varchar("pickup_uuid"),
  dropoff_uuid: varchar("dropoff_uuid"),
  return_uuid: varchar("return_uuid"),
  current_waypoint_uuid: varchar("current_waypoint_uuid"),
  waypoints: jsonb("waypoints").default(sql`'[]'::jsonb`),
  entities: jsonb("entities_list").default(sql`'[]'::jsonb`),
  cod_amount: numeric("cod_amount", { precision: 10, scale: 2 }),
  cod_currency: text("cod_currency"),
  cod_payment_method: text("cod_payment_method"),
  meta: jsonb("meta").default(sql`'{}'::jsonb`),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const tracking_numbers = pgTable("tracking_numbers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tracking_number: text("tracking_number").notNull(),
  type: text("type").notNull().default("order"),
  status: text("status").notNull().default("created"),
  status_code: text("status_code"),
  order_uuid: varchar("order_uuid"),
  meta: jsonb("meta").default(sql`'{}'::jsonb`),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const tracking_statuses = pgTable("tracking_statuses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tracking_number_uuid: varchar("tracking_number_uuid"),
  status: text("status").notNull(),
  details: text("details"),
  code: text("code"),
  city: text("city"),
  province: text("province"),
  country: text("country"),
  meta: jsonb("meta").default(sql`'{}'::jsonb`),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const purchase_rates = pgTable("purchase_rates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  service_quote_uuid: varchar("service_quote_uuid"),
  order_uuid: varchar("order_uuid"),
  transaction_uuid: varchar("transaction_uuid"),
  amount: numeric("amount", { precision: 10, scale: 2 }).default("0"),
  currency: text("currency").notNull().default("SAR"),
  meta: jsonb("meta").default(sql`'{}'::jsonb`),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// ==================== LOCAL-ONLY RESOURCES ====================
// These exist only in our app - Fleetbase doesn't provide these

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull().default(""),
  email: text("email").notNull().default(""),
  role: text("role").notNull().default("viewer"),
  status: text("status").notNull().default("active"),
  last_active: timestamp("last_active").defaultNow(),
  created_at: timestamp("created_at").defaultNow(),
});

export const routes = pgTable("routes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tracking_id: text("tracking_id").notNull(),
  driver_uuid: varchar("driver_uuid"),
  vehicle_uuid: varchar("vehicle_uuid"),
  status: text("status").notNull().default("draft"),
  distance: text("distance").notNull().default("0 km"),
  duration: text("duration").notNull().default("0 min"),
  stops: integer("stops").default(0),
  date: timestamp("date").defaultNow(),
  created_at: timestamp("created_at").defaultNow(),
});

export const issues = pgTable("issues", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tracking_id: text("tracking_id").notNull(),
  vehicle_uuid: text("vehicle_uuid").notNull().default(""),
  reported_by: text("reported_by").notNull().default(""),
  type: text("type").notNull().default("warning_light"),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("open"),
  description: text("description").notNull().default(""),
  reported_at: timestamp("reported_at").defaultNow(),
});

export const fuel_reports = pgTable("fuel_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tracking_id: text("tracking_id").notNull(),
  vehicle_uuid: text("vehicle_uuid").notNull(),
  driver_uuid: text("driver_uuid").notNull().default(""),
  date: timestamp("date").defaultNow(),
  volume: doublePrecision("volume").default(0),
  cost: text("cost").notNull().default("0"),
  odometer: integer("odometer").default(0),
  station: text("station").notNull().default(""),
});

export const devices = pgTable("devices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serial: text("serial").notNull(),
  type: text("type").notNull().default("gps_tracker"),
  status: text("status").notNull().default("online"),
  last_heartbeat: timestamp("last_heartbeat").defaultNow(),
  battery_level: integer("battery_level").default(100),
  created_at: timestamp("created_at").defaultNow(),
});

export const work_orders = pgTable("work_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tracking_id: text("tracking_id").notNull(),
  vehicle_uuid: text("vehicle_uuid").notNull(),
  type: text("type").notNull().default("maintenance"),
  status: text("status").notNull().default("pending"),
  priority: text("priority").notNull().default("medium"),
  due_date: timestamp("due_date"),
  cost: text("cost").notNull().default("0"),
  created_at: timestamp("created_at").defaultNow(),
});

export const parts = pgTable("parts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  sku: text("sku").notNull(),
  category: text("category").notNull().default("engine"),
  stock: integer("stock").default(0),
  min_stock: integer("min_stock").default(5),
  cost: text("cost").notNull().default("0"),
  location: text("location").notNull().default(""),
  created_at: timestamp("created_at").defaultNow(),
});

export const sensors = pgTable("sensors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull().default("temperature"),
  value: text("value").notNull().default("0"),
  status: text("status").notNull().default("normal"),
  battery: integer("battery").default(100),
  device_id: text("device_id").notNull().default(""),
  last_update: timestamp("last_update").defaultNow(),
});

export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull().default("system"),
  severity: text("severity").notNull().default("info"),
  message: text("message").notNull(),
  source: text("source").notNull().default("System"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const telematics_records = pgTable("telematics_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicle_uuid: text("vehicle_uuid").notNull(),
  event: text("event").notNull().default("Moving"),
  speed: integer("speed").default(0),
  rpm: integer("rpm").default(0),
  fuel: integer("fuel").default(100),
  location: text("location").notNull().default(""),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull().default("operations"),
  format: text("format").notNull().default("pdf"),
  size: text("size").notNull().default("0 KB"),
  status: text("status").notNull().default("ready"),
  generated_at: timestamp("generated_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull().default("0"),
  type: text("type").notNull().default("debit"),
  method: text("method").notNull().default("wallet"),
  status: text("status").notNull().default("completed"),
  reference: text("reference").default(""),
  order_uuid: varchar("order_uuid"),
  created_at: timestamp("created_at").defaultNow(),
});

export const custom_fields = pgTable("custom_fields", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  model: text("model").notNull().default("order"),
  label: text("label").notNull(),
  type: text("type").notNull().default("text"),
  required: boolean("required").default(false),
  sort_order: integer("sort_order").default(0),
  created_at: timestamp("created_at").defaultNow(),
});

export const time_off_requests = pgTable("time_off_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driver_uuid: varchar("driver_uuid").notNull(),
  driver_name: text("driver_name").notNull(),
  type: text("type").notNull().default("vacation"),
  start_date: text("start_date").notNull(),
  end_date: text("end_date").notNull(),
  reason: text("reason").notNull().default(""),
  status: text("status").notNull().default("pending"),
  created_at: timestamp("created_at").defaultNow(),
});

export const scheduler_tasks = pgTable("scheduler_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  resource_id: varchar("resource_id").notNull(),
  resource_name: text("resource_name").notNull(),
  resource_type: text("resource_type").notNull().default("driver"),
  title: text("title").notNull(),
  task_type: text("task_type").notNull().default("order"),
  color: text("color").notNull().default("blue"),
  start_hour: integer("start_hour").notNull().default(9),
  duration: integer("duration").notNull().default(2),
  date: text("date").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const fleetbase_servers = pgTable("fleetbase_servers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  organization: text("organization"),
  url: text("url").notNull(),
  api_key: text("api_key").notNull(),
  is_active: boolean("is_active").default(false),
  status: text("status").notNull().default("disconnected"),
  cityos_country: text("cityos_country"),
  cityos_city: text("cityos_city"),
  cityos_tenant: text("cityos_tenant"),
  cityos_channel: text("cityos_channel"),
  last_connected: timestamp("last_connected"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull(),
  key: text("key").notNull(),
  value: text("value").notNull().default(""),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const api_keys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  token: text("token").notNull(),
  type: text("type").notNull().default("publishable"),
  last_used: text("last_used").default("Never"),
  created_at: timestamp("created_at").defaultNow(),
});

export const webhooks = pgTable("webhooks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  url: text("url").notNull(),
  events: text("events").array().notNull().default(sql`'{}'::text[]`),
  status: text("status").notNull().default("active"),
  failures: integer("failures").default(0),
  created_at: timestamp("created_at").defaultNow(),
});

export const webhook_logs = pgTable("webhook_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  webhook_id: varchar("webhook_id"),
  event: text("event").notNull(),
  status_code: integer("status_code").notNull().default(200),
  duration: text("duration").notNull().default("0ms"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const integrations = pgTable("integrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  provider: text("provider").notNull(),
  category: text("category").notNull().default("general"),
  description: text("description").notNull().default(""),
  status: text("status").notNull().default("available"),
  api_key: text("api_key").default(""),
  webhooks_enabled: boolean("webhooks_enabled").default(false),
  config: jsonb("config").default(sql`'{}'::jsonb`),
  created_at: timestamp("created_at").defaultNow(),
});

export const order_configs = pgTable("order_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  type: text("type").notNull().default("transport"),
  status: text("status").notNull().default("draft"),
  fields: jsonb("fields").default(sql`'[]'::jsonb`),
  steps: jsonb("steps").default(sql`'[]'::jsonb`),
  options: jsonb("options").default(sql`'{}'::jsonb`),
  created_at: timestamp("created_at").defaultNow(),
});

// ==================== INSERT SCHEMAS ====================

// Fleetbase resources
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, created_at: true, updated_at: true });
export const insertDriverSchema = createInsertSchema(drivers).omit({ id: true, created_at: true, updated_at: true });
export const insertVehicleSchema = createInsertSchema(vehicles).omit({ id: true, created_at: true, updated_at: true });
export const insertFleetSchema = createInsertSchema(fleets).omit({ id: true, created_at: true, updated_at: true });
export const insertPlaceSchema = createInsertSchema(places).omit({ id: true, created_at: true, updated_at: true });
export const insertContactSchema = createInsertSchema(contacts).omit({ id: true, created_at: true, updated_at: true });
export const insertVendorSchema = createInsertSchema(vendors).omit({ id: true, created_at: true, updated_at: true });
export const insertServiceAreaSchema = createInsertSchema(service_areas).omit({ id: true, created_at: true, updated_at: true });
export const insertZoneSchema = createInsertSchema(zones).omit({ id: true, created_at: true, updated_at: true });
export const insertServiceRateSchema = createInsertSchema(service_rates).omit({ id: true, created_at: true, updated_at: true });
export const insertServiceQuoteSchema = createInsertSchema(service_quotes).omit({ id: true, created_at: true, updated_at: true });
export const insertEntitySchema = createInsertSchema(entities).omit({ id: true, created_at: true, updated_at: true });
export const insertPayloadSchema = createInsertSchema(payloads).omit({ id: true, created_at: true, updated_at: true });
export const insertTrackingNumberSchema = createInsertSchema(tracking_numbers).omit({ id: true, created_at: true, updated_at: true });
export const insertTrackingStatusSchema = createInsertSchema(tracking_statuses).omit({ id: true, created_at: true, updated_at: true });
export const insertPurchaseRateSchema = createInsertSchema(purchase_rates).omit({ id: true, created_at: true, updated_at: true });

export const insertFleetbaseServerSchema = createInsertSchema(fleetbase_servers).omit({ id: true, created_at: true, updated_at: true, last_connected: true });

// Local resources
export const insertUserSchema = createInsertSchema(users).omit({ id: true, created_at: true, last_active: true });
export const insertRouteSchema = createInsertSchema(routes).omit({ id: true, created_at: true });
export const insertIssueSchema = createInsertSchema(issues).omit({ id: true, reported_at: true });
export const insertFuelReportSchema = createInsertSchema(fuel_reports).omit({ id: true });
export const insertDeviceSchema = createInsertSchema(devices).omit({ id: true, created_at: true });
export const insertWorkOrderSchema = createInsertSchema(work_orders).omit({ id: true, created_at: true });
export const insertPartSchema = createInsertSchema(parts).omit({ id: true, created_at: true });
export const insertSensorSchema = createInsertSchema(sensors).omit({ id: true, last_update: true });
export const insertEventSchema = createInsertSchema(events).omit({ id: true, timestamp: true });
export const insertTelematicsRecordSchema = createInsertSchema(telematics_records).omit({ id: true, timestamp: true });
export const insertReportSchema = createInsertSchema(reports).omit({ id: true, generated_at: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, created_at: true });
export const insertCustomFieldSchema = createInsertSchema(custom_fields).omit({ id: true, created_at: true });
export const insertTimeOffRequestSchema = createInsertSchema(time_off_requests).omit({ id: true, created_at: true });
export const insertSchedulerTaskSchema = createInsertSchema(scheduler_tasks).omit({ id: true, created_at: true });
export const insertSettingSchema = createInsertSchema(settings).omit({ id: true, created_at: true, updated_at: true });
export const insertApiKeySchema = createInsertSchema(api_keys).omit({ id: true, created_at: true });
export const insertWebhookSchema = createInsertSchema(webhooks).omit({ id: true, created_at: true });
export const insertWebhookLogSchema = createInsertSchema(webhook_logs).omit({ id: true, timestamp: true });
export const insertIntegrationSchema = createInsertSchema(integrations).omit({ id: true, created_at: true });
export const insertOrderConfigSchema = createInsertSchema(order_configs).omit({ id: true, created_at: true });

// ==================== TYPE EXPORTS ====================

// Fleetbase resources
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Driver = typeof drivers.$inferSelect;
export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Fleet = typeof fleets.$inferSelect;
export type InsertFleet = z.infer<typeof insertFleetSchema>;
export type Place = typeof places.$inferSelect;
export type InsertPlace = z.infer<typeof insertPlaceSchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type ServiceArea = typeof service_areas.$inferSelect;
export type InsertServiceArea = z.infer<typeof insertServiceAreaSchema>;
export type Zone = typeof zones.$inferSelect;
export type InsertZone = z.infer<typeof insertZoneSchema>;
export type ServiceRate = typeof service_rates.$inferSelect;
export type InsertServiceRate = z.infer<typeof insertServiceRateSchema>;
export type ServiceQuote = typeof service_quotes.$inferSelect;
export type InsertServiceQuote = z.infer<typeof insertServiceQuoteSchema>;
export type Entity = typeof entities.$inferSelect;
export type InsertEntity = z.infer<typeof insertEntitySchema>;
export type Payload = typeof payloads.$inferSelect;
export type InsertPayload = z.infer<typeof insertPayloadSchema>;
export type TrackingNumber = typeof tracking_numbers.$inferSelect;
export type InsertTrackingNumber = z.infer<typeof insertTrackingNumberSchema>;
export type TrackingStatus = typeof tracking_statuses.$inferSelect;
export type InsertTrackingStatus = z.infer<typeof insertTrackingStatusSchema>;
export type PurchaseRate = typeof purchase_rates.$inferSelect;
export type InsertPurchaseRate = z.infer<typeof insertPurchaseRateSchema>;

// Local resources
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Route = typeof routes.$inferSelect;
export type InsertRoute = z.infer<typeof insertRouteSchema>;
export type Issue = typeof issues.$inferSelect;
export type InsertIssue = z.infer<typeof insertIssueSchema>;
export type FuelReport = typeof fuel_reports.$inferSelect;
export type InsertFuelReport = z.infer<typeof insertFuelReportSchema>;
export type Device = typeof devices.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type WorkOrder = typeof work_orders.$inferSelect;
export type InsertWorkOrder = z.infer<typeof insertWorkOrderSchema>;
export type Part = typeof parts.$inferSelect;
export type InsertPart = z.infer<typeof insertPartSchema>;
export type Sensor = typeof sensors.$inferSelect;
export type InsertSensor = z.infer<typeof insertSensorSchema>;
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type TelematicsRecord = typeof telematics_records.$inferSelect;
export type InsertTelematicsRecord = z.infer<typeof insertTelematicsRecordSchema>;
export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type CustomField = typeof custom_fields.$inferSelect;
export type InsertCustomField = z.infer<typeof insertCustomFieldSchema>;
export type TimeOffRequest = typeof time_off_requests.$inferSelect;
export type InsertTimeOffRequest = z.infer<typeof insertTimeOffRequestSchema>;
export type SchedulerTask = typeof scheduler_tasks.$inferSelect;
export type InsertSchedulerTask = z.infer<typeof insertSchedulerTaskSchema>;
export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type ApiKey = typeof api_keys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type Webhook = typeof webhooks.$inferSelect;
export type InsertWebhook = z.infer<typeof insertWebhookSchema>;
export type WebhookLog = typeof webhook_logs.$inferSelect;
export type InsertWebhookLog = z.infer<typeof insertWebhookLogSchema>;
export type Integration = typeof integrations.$inferSelect;
export type InsertIntegration = z.infer<typeof insertIntegrationSchema>;
export type OrderConfig = typeof order_configs.$inferSelect;
export type InsertOrderConfig = z.infer<typeof insertOrderConfigSchema>;

export type FleetbaseServer = typeof fleetbase_servers.$inferSelect;
export type InsertFleetbaseServer = z.infer<typeof insertFleetbaseServerSchema>;

// Legacy type aliases for backward compatibility during migration
export type ServiceZone = Zone;
export type InsertServiceZone = InsertZone;
