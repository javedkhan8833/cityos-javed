# replit.md

## Overview

This is a **fleet management and logistics platform** — a full-stack web application for managing delivery operations, including orders, drivers, vehicles, fleets, routes, service zones, work orders, fuel reports, devices, and more. The app also includes a "Landmark Explorer" feature that uses the Wikipedia geosearch API to display nearby historical sites on an interactive map.

The project follows a monorepo structure with a React frontend, Express backend, and PostgreSQL database using Drizzle ORM.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Directory Structure
- **`client/`** — React frontend (Vite-based SPA)
- **`server/`** — Express.js backend API
- **`shared/`** — Shared code (database schema, types) used by both client and server
- **`migrations/`** — Drizzle-generated database migrations
- **`script/`** — Build scripts

### Frontend Architecture
- **Framework**: React with TypeScript, bundled by Vite
- **Routing**: Wouter (lightweight client-side router)
- **State/Data Fetching**: TanStack React Query for server state management
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives
- **Styling**: Tailwind CSS v4 with CSS variables for theming, using `@tailwindcss/vite` plugin
- **Maps**: Leaflet via `react-leaflet` for interactive map views
- **Icons**: Lucide React
- **Fonts**: Inter (sans) and Merriweather (serif) via Google Fonts
- **Reusable Blocks**: Custom composite components in `client/src/components/blocks/` (DataTable, PageHeader, StatsCard, StatusBadge, EntityForm, DetailSheet, EmptyState) provide consistent UI patterns across all entity pages
- **API Layer**: `client/src/lib/api.ts` provides a generic `createEntityHooks` factory that generates CRUD hooks (useList, useById, useCreate, useUpdate, useDelete) for any entity type
- **CityOS Context**: Server-driven multi-tenant context. CityOS fields (Country, City, Tenant, Channel) are stored in each `fleetbase_servers` record and auto-injected by the backend into all Fleetbase API requests. No manual input needed from users.
- **Authentication**: Fleetbase API key-based auth via `client/src/lib/auth.tsx`. No local user accounts — users connect by providing a Fleetbase server URL + API key. Sessions track the active server connection. Fresh deployments show a setup page; returning users see saved servers to reconnect.
- **Mock Data**: `@faker-js/faker` used for generating sample data

### Backend Architecture
- **Framework**: Express.js with TypeScript, run via `tsx`
- **API Pattern**: RESTful CRUD endpoints generated via a generic `crudRoutes` helper function in `server/routes.ts`
- **Database**: PostgreSQL with Drizzle ORM (`drizzle-orm/node-postgres`)
- **Schema**: Defined in `shared/schema.ts` using Drizzle's `pgTable` definitions with Zod validation schemas via `drizzle-zod`
- **Storage Layer**: `server/storage.ts` provides a `DatabaseStorage` class implementing an `IStorage` interface, abstracting all database operations
- **Seeding**: `server/seed.ts` populates the database with realistic sample data on first run
- **Build**: Production build uses esbuild for the server and Vite for the client, outputting to `dist/`

### Database Schema
All tables use UUID primary keys (`gen_random_uuid()`). Key entities:
- **users** — authentication and team management
- **orders** — delivery orders with tracking numbers, status, pricing
- **drivers** — driver profiles with status, rating, fleet assignment
- **vehicles** — vehicle fleet with plate, model, type, status, GPS coordinates
- **fleets** — fleet groupings by zone
- **places** — warehouses, hubs, customer sites
- **contacts** — customer/partner contacts
- **vendors** — third-party vendor management
- **serviceZones** — geographic service areas (stored as JSONB polygons)
- **routes** — delivery routes with waypoints (JSONB)
- **issues** — incident/problem tracking
- **fuelReports** — fuel consumption tracking
- **parts** — inventory parts management (name, SKU, category, stock, cost, location)
- **devices** — IoT/GPS device management
- **workOrders** — maintenance work orders
- **serviceRates** — pricing configuration
- **customFields** — user-defined custom fields (JSONB config)
- **timeOffRequests** — driver time-off/availability requests (driverId, type, startDate, endDate, status, notes)
- **schedulerTasks** — scheduler timeline tasks (resourceId, resourceName, resourceType, title, taskType, color, startHour, duration, date)
- **settings** — application settings key-value store with categories (category, key, value) using bulk upsert pattern

### Key Design Decisions
1. **Generic CRUD pattern**: Both server routes and client hooks use factory functions to minimize boilerplate — adding a new entity requires only schema definition and wiring
2. **Shared schema**: Types and validation schemas are shared between frontend and backend via the `shared/` directory, ensuring type safety across the stack
3. **String IDs**: All entity IDs are UUIDs stored as `varchar`, passed as strings throughout the app
4. **Dev/Prod mode**: In development, Vite dev server runs as middleware on the Express server with HMR; in production, the pre-built static files are served directly

### Page Structure
The app has extensive routing covering:
- **Dashboard** — overview metrics
- **Operations** — orders, tracking, routes, scheduling, service zones, service rates
- **Management** — drivers, vehicles, fleets, places, contacts, vendors
- **Maintenance** — work orders, parts
- **Resources** — fuel reports, issues
- **Connectivity** — devices, sensors, events, telematics
- **Settings** — team, profile, organization, payments, notifications, routing, custom fields
- **Other** — analytics, integrations, developers, auth (login/register), onboarding

## External Dependencies

### Database
- **PostgreSQL** — primary data store, connected via `DATABASE_URL` environment variable
- **Drizzle ORM** — schema definition, queries, and migrations (`drizzle-kit push` for schema sync)
- **pg** — Node.js PostgreSQL client (node-postgres)

### External APIs
- **Wikipedia Geosearch API** — fetches nearby landmarks/historical sites based on coordinates (client-side, no API key needed)

### Key npm Dependencies
- **Server**: express, drizzle-orm, pg, connect-pg-simple, express-session, zod
- **Client**: react, wouter, @tanstack/react-query, leaflet/react-leaflet, framer-motion, recharts, shadcn/ui (Radix primitives), tailwindcss, @faker-js/faker
- **Shared**: drizzle-zod, zod

### Environment Variables Required
- `DATABASE_URL` — PostgreSQL connection string (required)