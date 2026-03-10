CREATE TABLE "api_keys" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"token" text NOT NULL,
	"type" text DEFAULT 'publishable' NOT NULL,
	"last_used" text DEFAULT 'Never',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'contact' NOT NULL,
	"title" text,
	"email" text,
	"phone" text,
	"phone_country_code" text,
	"meta" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "custom_fields" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model" text DEFAULT 'order' NOT NULL,
	"label" text NOT NULL,
	"type" text DEFAULT 'text' NOT NULL,
	"required" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"serial" text NOT NULL,
	"type" text DEFAULT 'gps_tracker' NOT NULL,
	"status" text DEFAULT 'online' NOT NULL,
	"last_heartbeat" timestamp DEFAULT now(),
	"battery_level" integer DEFAULT 100,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "drivers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'inactive' NOT NULL,
	"drivers_license_number" text,
	"photo_url" text,
	"vehicle_uuid" varchar,
	"vendor_uuid" varchar,
	"fleet_uuid" varchar,
	"current_job_uuid" varchar,
	"location" jsonb,
	"heading" integer,
	"altitude" integer,
	"speed" integer,
	"country" text,
	"online" boolean DEFAULT false,
	"meta" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "entities" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'parcel' NOT NULL,
	"sku" text,
	"weight" numeric(10, 2),
	"weight_unit" text DEFAULT 'kg',
	"length" numeric(10, 2),
	"width" numeric(10, 2),
	"height" numeric(10, 2),
	"dimensions_unit" text DEFAULT 'cm',
	"declared_value" numeric(10, 2),
	"price" numeric(10, 2),
	"sale_price" numeric(10, 2),
	"currency" text DEFAULT 'SAR',
	"quantity" integer DEFAULT 1,
	"payload_uuid" varchar,
	"description" text,
	"photo_url" text,
	"meta" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text DEFAULT 'system' NOT NULL,
	"severity" text DEFAULT 'info' NOT NULL,
	"message" text NOT NULL,
	"source" text DEFAULT 'System' NOT NULL,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fleetbase_servers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"organization" text,
	"url" text NOT NULL,
	"api_key" text NOT NULL,
	"is_active" boolean DEFAULT false,
	"status" text DEFAULT 'disconnected' NOT NULL,
	"cityos_country" text,
	"cityos_city" text,
	"cityos_tenant" text,
	"cityos_channel" text,
	"last_connected" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fleets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"service_area_uuid" varchar,
	"task" text,
	"status" text DEFAULT 'active' NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fuel_reports" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tracking_id" text NOT NULL,
	"vehicle_uuid" text NOT NULL,
	"driver_uuid" text DEFAULT '' NOT NULL,
	"date" timestamp DEFAULT now(),
	"volume" double precision DEFAULT 0,
	"cost" text DEFAULT '0' NOT NULL,
	"odometer" integer DEFAULT 0,
	"station" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"provider" text NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"api_key" text DEFAULT '',
	"webhooks_enabled" boolean DEFAULT false,
	"config" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "issues" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tracking_id" text NOT NULL,
	"vehicle_uuid" text DEFAULT '' NOT NULL,
	"reported_by" text DEFAULT '' NOT NULL,
	"type" text DEFAULT 'warning_light' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"reported_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "order_configs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"type" text DEFAULT 'transport' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"fields" jsonb DEFAULT '[]'::jsonb,
	"steps" jsonb DEFAULT '[]'::jsonb,
	"options" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tracking_number" text NOT NULL,
	"public_id" text,
	"internal_id" text,
	"type" text DEFAULT 'default' NOT NULL,
	"status" text DEFAULT 'created' NOT NULL,
	"payload_uuid" varchar,
	"driver_assigned_uuid" varchar,
	"facilitator_uuid" varchar,
	"customer_uuid" varchar,
	"customer_type" text,
	"pickup_uuid" varchar,
	"dropoff_uuid" varchar,
	"total_amount" numeric(10, 2) DEFAULT '0',
	"currency" text DEFAULT 'SAR' NOT NULL,
	"notes" text,
	"meta" jsonb DEFAULT '{}'::jsonb,
	"scheduled_at" timestamp,
	"dispatched_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "parts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"sku" text NOT NULL,
	"category" text DEFAULT 'engine' NOT NULL,
	"stock" integer DEFAULT 0,
	"min_stock" integer DEFAULT 5,
	"cost" text DEFAULT '0' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payloads" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text DEFAULT 'default' NOT NULL,
	"pickup_uuid" varchar,
	"dropoff_uuid" varchar,
	"return_uuid" varchar,
	"current_waypoint_uuid" varchar,
	"waypoints" jsonb DEFAULT '[]'::jsonb,
	"entities_list" jsonb DEFAULT '[]'::jsonb,
	"cod_amount" numeric(10, 2),
	"cod_currency" text,
	"cod_payment_method" text,
	"meta" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "places" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"street1" text DEFAULT '' NOT NULL,
	"street2" text,
	"city" text,
	"province" text,
	"postal_code" text,
	"neighborhood" text,
	"district" text,
	"building" text,
	"security_access_code" text,
	"country" text,
	"location" jsonb,
	"phone" text,
	"phone_number" text,
	"phone_country_code" text,
	"type" text DEFAULT '' NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "purchase_rates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_quote_uuid" varchar,
	"order_uuid" varchar,
	"transaction_uuid" varchar,
	"amount" numeric(10, 2) DEFAULT '0',
	"currency" text DEFAULT 'SAR' NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT 'operations' NOT NULL,
	"format" text DEFAULT 'pdf' NOT NULL,
	"size" text DEFAULT '0 KB' NOT NULL,
	"status" text DEFAULT 'ready' NOT NULL,
	"generated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "routes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tracking_id" text NOT NULL,
	"driver_uuid" varchar,
	"vehicle_uuid" varchar,
	"status" text DEFAULT 'draft' NOT NULL,
	"distance" text DEFAULT '0 km' NOT NULL,
	"duration" text DEFAULT '0 min' NOT NULL,
	"stops" integer DEFAULT 0,
	"date" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scheduler_tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_id" varchar NOT NULL,
	"resource_name" text NOT NULL,
	"resource_type" text DEFAULT 'driver' NOT NULL,
	"title" text NOT NULL,
	"task_type" text DEFAULT 'order' NOT NULL,
	"color" text DEFAULT 'blue' NOT NULL,
	"start_hour" integer DEFAULT 9 NOT NULL,
	"duration" integer DEFAULT 2 NOT NULL,
	"date" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sensors" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'temperature' NOT NULL,
	"value" text DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'normal' NOT NULL,
	"battery" integer DEFAULT 100,
	"device_id" text DEFAULT '' NOT NULL,
	"last_update" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_areas" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'country' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"border" jsonb,
	"country" text,
	"meta" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_quotes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" text,
	"service_rate_uuid" varchar,
	"amount" numeric(10, 2) DEFAULT '0',
	"currency" text DEFAULT 'SAR' NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_rates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"service_type" text DEFAULT 'parcel' NOT NULL,
	"service_area_uuid" varchar,
	"zone_uuid" varchar,
	"base_fee" numeric(10, 2) DEFAULT '0',
	"per_km_flat_rate_fee" numeric(10, 2) DEFAULT '0',
	"per_meter_flat_rate_fee" numeric(10, 2) DEFAULT '0',
	"algorithm" text DEFAULT 'distance_and_time' NOT NULL,
	"rate_calculation_method" text DEFAULT 'fixed_meter' NOT NULL,
	"currency" text DEFAULT 'SAR' NOT NULL,
	"has_peak_hours_fee" boolean DEFAULT false,
	"peak_hours_surcharge" numeric(10, 2) DEFAULT '0',
	"duration_terms" jsonb DEFAULT '[]'::jsonb,
	"meta" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" text NOT NULL,
	"key" text NOT NULL,
	"value" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "telematics_records" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_uuid" text NOT NULL,
	"event" text DEFAULT 'Moving' NOT NULL,
	"speed" integer DEFAULT 0,
	"rpm" integer DEFAULT 0,
	"fuel" integer DEFAULT 100,
	"location" text DEFAULT '' NOT NULL,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "time_off_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"driver_uuid" varchar NOT NULL,
	"driver_name" text NOT NULL,
	"type" text DEFAULT 'vacation' NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tracking_numbers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tracking_number" text NOT NULL,
	"type" text DEFAULT 'order' NOT NULL,
	"status" text DEFAULT 'created' NOT NULL,
	"status_code" text,
	"order_uuid" varchar,
	"meta" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tracking_statuses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tracking_number_uuid" varchar,
	"status" text NOT NULL,
	"details" text,
	"code" text,
	"city" text,
	"province" text,
	"country" text,
	"meta" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"type" text DEFAULT 'debit' NOT NULL,
	"method" text DEFAULT 'wallet' NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"reference" text DEFAULT '',
	"order_uuid" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"role" text DEFAULT 'viewer' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"last_active" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plate_number" text NOT NULL,
	"make" text DEFAULT '' NOT NULL,
	"model" text DEFAULT '' NOT NULL,
	"year" integer,
	"type" text DEFAULT 'van' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"vin_number" text,
	"driver_uuid" varchar,
	"vendor_uuid" varchar,
	"location" jsonb,
	"speed" integer,
	"heading" integer,
	"altitude" integer,
	"meta" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"country" text,
	"website_url" text,
	"place_uuid" varchar,
	"meta" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webhook_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webhook_id" varchar,
	"event" text NOT NULL,
	"status_code" integer DEFAULT 200 NOT NULL,
	"duration" text DEFAULT '0ms' NOT NULL,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webhooks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"events" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"failures" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "work_orders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tracking_id" text NOT NULL,
	"vehicle_uuid" text NOT NULL,
	"type" text DEFAULT 'maintenance' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"due_date" timestamp,
	"cost" text DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "zones" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"service_area_uuid" varchar,
	"boundary" jsonb,
	"color" text,
	"stroke_color" text,
	"status" text DEFAULT 'active' NOT NULL,
	"description" text,
	"meta" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
