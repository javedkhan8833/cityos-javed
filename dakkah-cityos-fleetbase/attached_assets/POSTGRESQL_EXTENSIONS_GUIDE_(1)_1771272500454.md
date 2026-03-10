# PostgreSQL Extensions Guide for Dakkah CityOS

This guide documents the actual state of PostgreSQL extensions in the Dakkah CityOS platform, a multi-tenant, localized CMS for smart city management built on Next.js 15 + Payload CMS 3.74 with PostgreSQL (Neon-backed in production, helium/heliumdb in development).

Last audited: February 16, 2026

---

## Table of Contents

- [1. Schema Audit: Current State](#1-schema-audit-current-state)
- [2. Installed Extensions -- Detailed Guide](#2-installed-extensions----detailed-guide)
  - [2.1 PostGIS -- Geospatial](#21-postgis----geospatial)
  - [2.2 pgvector -- AI/Embeddings](#22-pgvector----aiembeddings)
  - [2.3 TimescaleDB -- Time-Series](#23-timescaledb----time-series)
  - [2.4 pg_trgm -- Fuzzy Text Search](#24-pg_trgm----fuzzy-text-search)
  - [2.5 btree_gist -- Composite Indexes and Exclusion Constraints](#25-btree_gist----composite-indexes-and-exclusion-constraints)
  - [2.6 unaccent -- Accent-Insensitive Search](#26-unaccent----accent-insensitive-search)
  - [2.7 plpgsql -- Procedural Language](#27-plpgsql----procedural-language)
- [3. Recommended Extensions (Not Yet Installed)](#3-recommended-extensions-not-yet-installed)
  - [3.1 h3 + h3_postgis](#31-h3--h3_postgis)
  - [3.2 pg_uuidv7](#32-pg_uuidv7)
  - [3.3 pgrag](#33-pgrag)
  - [3.4 pg_tiktoken](#34-pg_tiktoken)
  - [3.5 pg_jsonschema](#35-pg_jsonschema)
  - [3.6 ltree](#36-ltree)
  - [3.7 citext](#37-citext)
  - [3.8 pg_stat_statements](#38-pg_stat_statements)
  - [3.9 hll (HyperLogLog)](#39-hll-hyperloglog)
  - [3.10 pg_partman](#310-pg_partman)
  - [3.11 pgrouting](#311-pgrouting)
  - [3.12 postgis_topology](#312-postgis_topology)
  - [3.13 anon (PostgreSQL Anonymizer)](#313-anon-postgresql-anonymizer)
  - [3.14 bloom](#314-bloom)
  - [3.15 cube + earthdistance](#315-cube--earthdistance)
- [4. How to Install and Manage Extensions in Payload CMS](#4-how-to-install-and-manage-extensions-in-payload-cms)
  - [4.1 Installing on Neon Production Database](#41-installing-on-neon-production-database)
  - [4.2 Installing on Development Database](#42-installing-on-development-database)
  - [4.3 Configuring tablesFilter](#43-configuring-tablesfilter)
  - [4.4 Using Raw SQL via payload.db.drizzle](#44-using-raw-sql-via-payloaddbdrizzle)
  - [4.5 Creating Migration Files for Extension-Dependent Changes](#45-creating-migration-files-for-extension-dependent-changes)
  - [4.6 Environment-Specific Extension Handling](#46-environment-specific-extension-handling)
- [5. Extension Compatibility and Neon Limitations](#5-extension-compatibility-and-neon-limitations)
  - [5.1 Citus -- Not Available on Neon](#51-citus----not-available-on-neon)
  - [5.2 spatial_ref_sys Ownership Issue](#52-spatial_ref_sys-ownership-issue)
  - [5.3 TimescaleDB Limitations on Neon](#53-timescaledb-limitations-on-neon)
  - [5.4 Extension Dependencies](#54-extension-dependencies)
  - [5.5 Dev vs Production Parity Issues](#55-dev-vs-production-parity-issues)
- [6. Implementation Priority Roadmap](#6-implementation-priority-roadmap)

---

## 1. Schema Audit: Current State

### Critical Finding

**NONE of the optional extensions (PostGIS, pgvector, TimescaleDB, pg_trgm, btree_gist, unaccent) are actually being used in the database schema.** All six are installed but have zero columns, indexes, or constraints that depend on them. All spatial computation, text search, and AI operations happen in JavaScript application code rather than in PostgreSQL. The only extension in active use is plpgsql, which is the default procedural language built into every PostgreSQL installation — no custom functions or triggers have been created with it.

### Extension Installation Status

| Extension | Version (Production / Neon) | Version (Dev / heliumdb) | Actually Used in Schema? | Evidence |
|-----------|----------------------------|--------------------------|--------------------------|----------|
| PostGIS | 3.3.3 | 3.5.3 | **NO** | Zero geometry/geography columns. `geometry_columns` and `geography_columns` views return zero rows. Coordinates stored as `numeric` type. |
| pgvector | 0.8.0 | NOT installed | **NO** | Zero `vector` columns in any table. No embedding storage anywhere. AI uses OpenAI API directly. |
| TimescaleDB | 2.13.0 | NOT installed | **NO** | Zero hypertables. `audit_logs`, `event_tracking`, `integration_health` are all regular tables. |
| pg_trgm | 1.6 | NOT installed | **NO** | Zero GIN indexes with `gin_trgm_ops`. Discovery engine uses `LIKE` via Payload's `contains` operator. |
| btree_gist | 1.7 | NOT installed | **NO** | Zero GiST indexes. No exclusion constraints. |
| unaccent | 1.1 | NOT installed | **NO** | No custom text search configurations. Only built-in PG text search configs exist. |
| plpgsql | 1.0 | 1.0 | **Default only** | Default procedural language, always present. Used internally by PostgreSQL. No custom functions or triggers have been created. |

### How Spatial Data is Actually Handled

| What | Current Implementation | File |
|------|----------------------|------|
| Coordinate storage | `pois.coordinates_lat` and `pois.coordinates_lng` as `numeric` columns | `src/collections/POIs/index.ts` |
| Polygon storage | `pois.geo_polygon` as `jsonb` | `src/collections/POIs/index.ts` |
| H3 index computation | JavaScript `h3-js` library (`latLngToCell`, `gridDisk`) | `src/lib/poi/geo-utils.ts` |
| Geohash computation | JavaScript `ngeohash` library | `src/lib/poi/geo-utils.ts` |
| Before-save geo hook | `computeGeoIndexesHook` writes `h3_index`, `h3_index_r7`, `geohash` to POI | `src/hooks/geoIndexHook.ts` |
| Proximity search | JavaScript `haversineDistance()` function (lines 190-198) | `src/lib/poi/discoveryEngine.ts` |
| Bounding box queries | Manual lat/lng comparison via Payload `greater_than`/`less_than` (lines 101-109) | `src/lib/poi/discoveryEngine.ts` |
| Text search | Payload `contains` operator (maps to SQL `LIKE`) on name/title/description (lines 83-91) | `src/lib/poi/discoveryEngine.ts` |
| Node coordinates | `nodes.coordinates_lat` and `nodes.coordinates_lng` as `numeric` | `src/collections/Nodes/index.ts` |

### How AI is Actually Handled

| What | Current Implementation | File |
|------|----------------------|------|
| Prompt execution | Direct OpenAI API call, no local embeddings | `src/app/api/ai/execute/route.ts` |
| AI playground | Direct OpenAI API call | `src/app/api/ai/playground/route.ts` |
| Prompt storage | Text fields (`systemPrompt`, `userPromptTemplate`) -- no vector columns | `src/collections/AIPrompts/index.ts` |
| Response storage | Text/jsonb fields (`output`, `parsedOutput`) with metrics -- no embeddings | `src/collections/AIResponses/index.ts` |
| Block manifests | Metadata fields (`slug`, `label`, `domain`, `keywords`) -- no vector column | `src/collections/BlockManifests/index.ts` |

### Actual POIs Table Indexes (All btree, No Spatial)

| Index Name | Column(s) | Type |
|-----------|-----------|------|
| `pois_pkey` | `id` | btree (primary key) |
| `pois_slug_idx` | `slug` | btree |
| `pois_tenant_idx` | `tenant_id` | btree |
| `pois_node_idx` | `node_id` | btree |
| `pois_created_at_idx` | `created_at` | btree |
| `pois_updated_at_idx` | `updated_at` | btree |
| `idx_pois_tier` | `tier` | btree |
| `idx_pois_parent_poi` | `parent_poi_id` | btree |
| `idx_pois_depth_level` | `depth_level` | btree |
| `idx_pois_residency_class` | `residency_class` | btree |

**Missing indexes:** `h3_index`, `h3_index_r7`, and `geohash` columns have `index: true` in the Payload collection config but the actual database has NO indexes on these columns. This is because Payload's `push: false` setting means schema changes are only applied via explicit migrations, and no migration has created these indexes.

---

## 2. Installed Extensions -- Detailed Guide

### 2.1 PostGIS -- Geospatial

#### What It Does

PostGIS adds geographic object support to PostgreSQL. It provides `geometry` and `geography` data types, spatial indexing via GiST, and hundreds of functions for spatial queries (distance calculations, containment checks, intersection tests, coordinate transformations). It allows the database to answer questions like "find everything within 2km of this point" using spatial indexes instead of scanning every row.

#### Current State in Dakkah

**Installed but not used.** PostGIS is installed on both dev (v3.5.3) and production (v3.3.3), but:

- The `pois` table stores coordinates as two separate `numeric` columns: `coordinates_lat` and `coordinates_lng`
- The `pois.geo_polygon` column is `jsonb`, not a PostGIS geometry type
- The `nodes` table also uses `numeric` for `coordinates_lat` and `coordinates_lng`
- There are zero GiST spatial indexes in the entire database
- The `geometry_columns` and `geography_columns` PostGIS metadata views return zero rows
- All proximity search is done via JavaScript `haversineDistance()` in `src/lib/poi/discoveryEngine.ts` (lines 190-198), which fetches all candidate POIs from the database and filters them in memory
- Bounding box queries use manual lat/lng range comparisons via Payload operators (lines 101-109)
- The `tablesFilter` in `src/payload.config.ts` already excludes PostGIS system tables: `['!spatial_ref_sys', '!geography_columns', '!geometry_columns', '!raster_columns', '!raster_overviews']`

#### Where It Should Be Used

1. **POI proximity search** -- Replace JavaScript `haversineDistance()` with `ST_DWithin()` on a geography column, enabling index-accelerated spatial queries
2. **POI bounding box queries** -- Replace manual lat/lng comparisons with `ST_MakeEnvelope()` or the `&&` operator
3. **Node spatial queries** -- Same pattern for the `nodes` table
4. **Polygon storage** -- Replace `geo_polygon` jsonb with a proper `geometry(Polygon, 4326)` column for containment queries
5. **District/zone boundary queries** -- Determine which district or zone a POI falls within using `ST_Contains()`

#### Implementation Plan

**Step 1: Add geometry/geography columns to the `pois` table**

```sql
-- Add a geography column for distance queries (uses meters, works globally)
ALTER TABLE pois ADD COLUMN geog geography(Point, 4326);

-- Populate from existing numeric columns
UPDATE pois
SET geog = ST_MakePoint(coordinates_lng, coordinates_lat)::geography
WHERE coordinates_lat IS NOT NULL AND coordinates_lng IS NOT NULL;

-- Create a spatial index
CREATE INDEX idx_pois_geog ON pois USING GIST (geog);
```

**Step 2: Add geometry column to `nodes` table**

```sql
ALTER TABLE nodes ADD COLUMN geog geography(Point, 4326);

UPDATE nodes
SET geog = ST_MakePoint(coordinates_lng, coordinates_lat)::geography
WHERE coordinates_lat IS NOT NULL AND coordinates_lng IS NOT NULL;

CREATE INDEX idx_nodes_geog ON nodes USING GIST (geog);
```

**Step 3: Convert `geo_polygon` from jsonb to geometry**

```sql
ALTER TABLE pois ADD COLUMN geom_polygon geometry(Polygon, 4326);

-- Migration would need custom logic to convert GeoJSON stored in jsonb
-- to actual PostGIS geometry via ST_GeomFromGeoJSON
UPDATE pois
SET geom_polygon = ST_GeomFromGeoJSON(geo_polygon::text)
WHERE geo_polygon IS NOT NULL
  AND geo_polygon != 'null'::jsonb
  AND jsonb_typeof(geo_polygon) = 'object';

CREATE INDEX idx_pois_geom_polygon ON pois USING GIST (geom_polygon);
```

**Step 4: Proximity search using PostGIS**

```sql
-- Find all active POIs within 2km of a given point
SELECT id, coordinates_lat, coordinates_lng,
       ST_Distance(
         geog,
         ST_MakePoint(55.2708, 25.2048)::geography
       ) AS distance_meters
FROM pois
WHERE status = 'active'
  AND ST_DWithin(
    geog,
    ST_MakePoint(55.2708, 25.2048)::geography,
    2000  -- meters
  )
ORDER BY distance_meters ASC
LIMIT 20;
```

**Step 5: Bounding box query using PostGIS**

```sql
SELECT id, coordinates_lat, coordinates_lng
FROM pois
WHERE geog && ST_MakeEnvelope(55.1, 25.0, 55.4, 25.3, 4326)::geography;
```

**Step 6: Verification queries**

```sql
-- Check that PostGIS columns exist
SELECT column_name, udt_name
FROM information_schema.columns
WHERE table_name = 'pois' AND udt_name IN ('geography', 'geometry');

-- Check spatial indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'pois' AND indexdef LIKE '%GIST%';

-- Verify geography_columns view
SELECT * FROM geography_columns WHERE f_table_name = 'pois';

-- Test a proximity query
EXPLAIN ANALYZE
SELECT id FROM pois
WHERE ST_DWithin(geog, ST_MakePoint(55.27, 25.20)::geography, 5000);
```

#### Payload CMS Integration -- Sync Hook

```typescript
// src/hooks/postgisGeoSyncHook.ts
import type { CollectionBeforeChangeHook } from 'payload'
import { sql } from 'drizzle-orm'

export const syncPostGISGeography: CollectionBeforeChangeHook = async ({
  data,
  req,
  operation,
  originalDoc,
}) => {
  const lat = data?.coordinates?.lat
  const lng = data?.coordinates?.lng

  if (lat != null && lng != null && req.payload?.db?.drizzle) {
    const docId = operation === 'update' ? originalDoc?.id : null
    if (docId) {
      await req.payload.db.drizzle.execute(sql`
        UPDATE pois
        SET geog = ST_MakePoint(${lng}, ${lat})::geography
        WHERE id = ${docId}
      `)
    }
  }

  return data
}
```

#### Payload CMS Integration -- Nearby API Route

```typescript
// src/app/api/bff/pois/nearby/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { sql } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = parseFloat(searchParams.get('lat') || '0')
  const lng = parseFloat(searchParams.get('lng') || '0')
  const radiusKm = parseFloat(searchParams.get('radius') || '5')
  const limit = parseInt(searchParams.get('limit') || '20')

  const payload = await getPayload({ config: configPromise })
  const db = payload.db.drizzle

  const results = await db.execute(sql`
    SELECT id, coordinates_lat, coordinates_lng,
           ST_Distance(
             geog,
             ST_MakePoint(${lng}, ${lat})::geography
           ) AS distance_meters
    FROM pois
    WHERE status = 'active'
      AND ST_DWithin(
        geog,
        ST_MakePoint(${lng}, ${lat})::geography,
        ${radiusKm * 1000}
      )
    ORDER BY distance_meters ASC
    LIMIT ${limit}
  `)

  return NextResponse.json({
    pois: results.rows,
    center: { lat, lng },
    radiusKm,
  })
}
```

#### How to Install

```sql
-- Already installed on both dev and production
-- Dev: PostGIS 3.5.3
-- Production (Neon): PostGIS 3.3.3

-- If reinstalling:
CREATE EXTENSION IF NOT EXISTS postgis;
```

---

### 2.2 pgvector -- AI/Embeddings

#### What It Does

pgvector adds a `vector` data type to PostgreSQL for storing embeddings (arrays of floating-point numbers). It provides operators for cosine similarity (`<=>`), inner product (`<#>`), and Euclidean distance (`<->`), plus HNSW and IVFFlat index types for fast approximate nearest-neighbor search. This lets you do semantic similarity search directly in the database.

#### Current State in Dakkah

**Installed on production but not used. Not installed on dev.**

- Zero `vector` columns exist in any table across the entire database
- The AI system calls OpenAI API directly (`src/app/api/ai/execute/route.ts`) and stores responses as text/jsonb in the `ai_responses` table
- The `ai_prompts` table stores prompts as text fields (`system_prompt`, `user_prompt_template`) with no embeddings
- The `block_manifests` table has metadata fields (`slug`, `label`, `domain`, `category`, `keywords`, `visual_type`, `use_cases`, `pairings`) but no vector column
- No embedding generation or storage happens anywhere in the codebase

#### Where It Should Be Used

1. **Block manifest semantic search** -- Add an `embedding` column to `block_manifests` for the AI Page Composer to find relevant blocks based on natural language descriptions
2. **POI semantic search** -- Add an `embedding` column to `pois` so users can search for places using natural language ("quiet cafe with a garden near downtown")
3. **Content recommendation** -- Embed page content for related content suggestions
4. **RAG (Retrieval-Augmented Generation)** -- Store document chunks with embeddings for context-aware AI responses

#### Implementation Plan

**Step 1: Install pgvector on dev**

```sql
-- Production: already installed (v0.8.0)
-- Dev: needs installation
CREATE EXTENSION IF NOT EXISTS vector;
```

**Step 2: Add embedding column to `block_manifests`**

```sql
-- OpenAI text-embedding-3-small produces 1536-dimensional vectors
ALTER TABLE block_manifests ADD COLUMN embedding vector(1536);

-- Create HNSW index for fast cosine similarity search
CREATE INDEX idx_block_manifests_embedding
ON block_manifests
USING hnsw (embedding vector_cosine_ops);
```

**Step 3: Add embedding column to `pois`**

```sql
ALTER TABLE pois ADD COLUMN embedding vector(1536);

CREATE INDEX idx_pois_embedding
ON pois
USING hnsw (embedding vector_cosine_ops);
```

**Step 4: Semantic search query**

```sql
-- Find the 5 most similar block manifests to a query embedding
-- $1 is a 1536-dimensional vector from OpenAI text-embedding-3-small
SELECT id, slug, label, domain,
       1 - (embedding <=> $1::vector) AS similarity
FROM block_manifests
WHERE embedding IS NOT NULL
ORDER BY embedding <=> $1::vector
LIMIT 5;
```

**Step 5: Combined semantic + metadata filtering**

```sql
-- Find tourism blocks semantically similar to a query
SELECT id, slug, label, domain,
       1 - (embedding <=> $1::vector) AS similarity
FROM block_manifests
WHERE embedding IS NOT NULL
  AND domain = 'culture-tourism'
ORDER BY embedding <=> $1::vector
LIMIT 10;
```

**Step 6: Verification queries**

```sql
-- Check vector columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'block_manifests' AND column_name = 'embedding';

-- Check HNSW index exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'block_manifests' AND indexdef LIKE '%hnsw%';

-- Verify extension version
SELECT extversion FROM pg_extension WHERE extname = 'vector';
```

#### Payload CMS Integration -- Embedding Generation Hook

```typescript
// src/hooks/embeddingHook.ts
import type { CollectionAfterChangeHook } from 'payload'
import { sql } from 'drizzle-orm'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export const generateEmbeddingHook: CollectionAfterChangeHook = async ({
  doc,
  req,
  collection,
}) => {
  if (!process.env.OPENAI_API_KEY || !req.payload?.db?.drizzle) return doc

  const textToEmbed = [
    doc.label || doc.name || '',
    doc.description || '',
    ...(Array.isArray(doc.keywords) ? doc.keywords : []),
    ...(Array.isArray(doc.useCases) ? doc.useCases : []),
  ]
    .filter(Boolean)
    .join(' ')

  if (!textToEmbed.trim()) return doc

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: textToEmbed,
    })

    const embedding = response.data[0].embedding
    const vectorLiteral = `[${embedding.join(',')}]`
    const tableName = collection.slug.replace(/-/g, '_')

    await req.payload.db.drizzle.execute(sql`
      UPDATE ${sql.raw(tableName)}
      SET embedding = ${vectorLiteral}::vector
      WHERE id = ${doc.id}
    `)
  } catch (err) {
    console.error('Embedding generation failed:', err)
  }

  return doc
}
```

#### Payload CMS Integration -- Semantic Search API Route

```typescript
// src/app/api/ai/semantic-search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { sql } from 'drizzle-orm'
import OpenAI from 'openai'

export async function POST(req: NextRequest) {
  const { query, collection = 'block_manifests', limit = 10 } = await req.json()

  if (!query) {
    return NextResponse.json({ error: 'query is required' }, { status: 400 })
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  })
  const queryEmbedding = embeddingResponse.data[0].embedding
  const vectorLiteral = `[${queryEmbedding.join(',')}]`

  const payload = await getPayload({ config: configPromise })
  const db = payload.db.drizzle

  const results = await db.execute(sql`
    SELECT id, slug, label, domain,
           1 - (embedding <=> ${vectorLiteral}::vector) AS similarity
    FROM block_manifests
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${vectorLiteral}::vector
    LIMIT ${limit}
  `)

  return NextResponse.json({ results: results.rows, query })
}
```

#### How to Install

```sql
-- Production (Neon): already installed (v0.8.0)
CREATE EXTENSION IF NOT EXISTS vector;

-- Dev (heliumdb): NOT installed, needs to be added
CREATE EXTENSION IF NOT EXISTS vector;
```

---

### 2.3 TimescaleDB -- Time-Series

#### What It Does

TimescaleDB turns regular PostgreSQL tables into hypertables that are automatically partitioned by time. It provides continuous aggregates (auto-refreshing materialized views), data compression, retention policies, and time-oriented functions like `time_bucket()`. It is designed for append-heavy workloads with time-stamped data.

#### Current State in Dakkah

**Installed on production only, not used anywhere.**

- NOT installed on the dev database at all, creating a dev/production parity gap
- Zero hypertables exist in the database
- The `audit_logs` table is a regular table with columns: `id`, `action`, `entity_type`, `user_id`, `tenant_id`, `timestamp`, `changes` (jsonb), `metadata` (jsonb), `updated_at`, `created_at`, `prev_hash`, `integrity_hash`
- The `event_tracking` table is a regular table with columns: `id`, `action`, `collection`, `document_id`, `user_id`, `ip`, `user_agent`, `metadata` (jsonb), `timestamp`, `tenant_id`, `correlation_id`
- The `integration_health` table is a regular table with columns: `id`, `integration`, `type`, `status`, `last_check`, `last_success`, `last_failure`, `success_rate`, `avg_response_time`, `error_count`, `tenant_id`, `metadata`, `updated_at`, `created_at`
- The analytics dashboard (`src/app/api/bff/analytics/dashboard/route.ts`) generates mock time-series data using a seeded random number generator, not real data

#### Where It Should Be Used

1. **`audit_logs`** -- High-volume append-only table with a `timestamp` column; ideal candidate for a hypertable with automatic time-based partitioning
2. **`event_tracking`** -- Append-only event log with `timestamp`; benefits from hypertable partitioning and retention policies
3. **`integration_health`** -- Periodic health check snapshots; benefits from compression and retention
4. **Analytics dashboards** -- Replace mock data with real continuous aggregates over audit_logs and event_tracking

#### Implementation Plan

**Step 1: Install TimescaleDB on dev**

```sql
-- Production (Neon): already installed (v2.13.0)
-- Dev: NOT installed, needs to be added
CREATE EXTENSION IF NOT EXISTS timescaledb;
```

**Step 2: Convert `audit_logs` to a hypertable**

```sql
-- IMPORTANT: audit_logs.timestamp must be NOT NULL for hypertable conversion
-- First ensure no NULL timestamps exist
UPDATE audit_logs SET timestamp = created_at WHERE timestamp IS NULL;
ALTER TABLE audit_logs ALTER COLUMN timestamp SET NOT NULL;

-- Convert to hypertable (migrate_data => true moves existing rows)
SELECT create_hypertable('audit_logs', 'timestamp',
  migrate_data => true,
  chunk_time_interval => INTERVAL '7 days'
);
```

**Step 3: Convert `event_tracking` to a hypertable**

```sql
UPDATE event_tracking SET timestamp = created_at WHERE timestamp IS NULL;
ALTER TABLE event_tracking ALTER COLUMN timestamp SET NOT NULL;

SELECT create_hypertable('event_tracking', 'timestamp',
  migrate_data => true,
  chunk_time_interval => INTERVAL '7 days'
);
```

**Step 4: Create a continuous aggregate for daily activity**

```sql
CREATE MATERIALIZED VIEW daily_audit_activity
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 day', timestamp) AS day,
  tenant_id,
  action,
  entity_type,
  COUNT(*) AS event_count
FROM audit_logs
WHERE entity_type IS NOT NULL
GROUP BY day, tenant_id, action, entity_type
WITH NO DATA;

SELECT add_continuous_aggregate_policy('daily_audit_activity',
  start_offset => INTERVAL '2 days',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour'
);
```

**Step 5: Add retention and compression policies**

```sql
-- Retention: drop audit log chunks older than 1 year
SELECT add_retention_policy('audit_logs', INTERVAL '1 year');

-- Retention: drop event tracking older than 90 days
SELECT add_retention_policy('event_tracking', INTERVAL '90 days');

-- Compression on audit_logs after 30 days
ALTER TABLE audit_logs SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'tenant_id',
  timescaledb.compress_orderby = 'timestamp DESC'
);
SELECT add_compression_policy('audit_logs', INTERVAL '30 days');
```

**Step 6: Verification queries**

```sql
-- List all hypertables
SELECT hypertable_name, num_chunks
FROM timescaledb_information.hypertables;

-- Check chunks for audit_logs
SELECT chunk_name, range_start, range_end, is_compressed
FROM timescaledb_information.chunks
WHERE hypertable_name = 'audit_logs'
ORDER BY range_start DESC;

-- Check continuous aggregates
SELECT view_name, materialization_hypertable_name
FROM timescaledb_information.continuous_aggregates;

-- Test time_bucket query
SELECT time_bucket('1 hour', timestamp) AS hour, COUNT(*)
FROM audit_logs
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour;
```

#### Payload CMS Integration -- Real Analytics Dashboard

```typescript
// src/app/api/bff/analytics/dashboard/route.ts (refactored to use real data)
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { sql } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tenantId = searchParams.get('tenantId')
  const from = searchParams.get('from') || new Date(Date.now() - 30 * 86400000).toISOString()
  const to = searchParams.get('to') || new Date().toISOString()

  const payload = await getPayload({ config: configPromise })
  const db = payload.db.drizzle

  const contentActivity = await db.execute(sql`
    SELECT
      time_bucket('1 day', timestamp) AS day,
      action,
      COUNT(*) AS count
    FROM audit_logs
    WHERE tenant_id = ${tenantId}
      AND timestamp >= ${from}::timestamptz
      AND timestamp <= ${to}::timestamptz
    GROUP BY day, action
    ORDER BY day ASC
  `)

  const eventStats = await db.execute(sql`
    SELECT
      time_bucket('1 day', timestamp) AS day,
      action,
      collection,
      COUNT(*) AS count
    FROM event_tracking
    WHERE tenant_id = ${tenantId}
      AND timestamp >= ${from}::timestamptz
      AND timestamp <= ${to}::timestamptz
    GROUP BY day, action, collection
    ORDER BY day ASC
  `)

  return NextResponse.json({
    contentActivity: contentActivity.rows,
    eventStats: eventStats.rows,
  })
}
```

#### How to Install

```sql
-- Production (Neon): already installed (v2.13.0)
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Dev (heliumdb): NOT installed, needs to be added
CREATE EXTENSION IF NOT EXISTS timescaledb;
```

---

### 2.4 pg_trgm -- Fuzzy Text Search

#### What It Does

pg_trgm (trigram) enables fuzzy string matching by breaking text into groups of three consecutive characters. It provides the `similarity()` function and `%` operator for typo-tolerant matching, plus GIN and GiST index support for accelerating `LIKE`, `ILIKE`, and similarity queries. A trigram GIN index on a text column makes `LIKE '%search%'` queries use the index instead of scanning every row.

#### Current State in Dakkah

**Installed on production only, not used anywhere.**

- NOT installed on the dev database
- Zero GIN indexes with `gin_trgm_ops` exist in the database
- No trigram-based search anywhere in the codebase
- The discovery engine (`src/lib/poi/discoveryEngine.ts`, lines 83-91) uses Payload's `contains` operator, which maps to SQL `LIKE '%text%'` -- this performs a full table scan on every search because there are no trigram indexes
- Current search code:
  ```typescript
  if (filters.searchText) {
    where.and.push({
      or: [
        { name: { contains: filters.searchText } },
        { title: { contains: filters.searchText } },
        { description: { contains: filters.searchText } },
      ],
    })
  }
  ```

#### Where It Should Be Used

1. **POI name search** -- GIN index on `pois.name_en` (and other locale variants) for fast `LIKE '%text%'` queries
2. **POI description search** -- GIN index for full-text-like search on descriptions
3. **Page title search** -- GIN index on `pages.title` for CMS content search
4. **Fuzzy matching** -- Typo-tolerant search ("restraunt" matching "restaurant")

#### Implementation Plan

**Step 1: Install pg_trgm on dev**

```sql
-- Production (Neon): already installed (v1.6)
-- Dev: NOT installed
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

**Step 2: Create trigram GIN indexes**

```sql
-- GIN indexes on POI searchable text columns
-- Note: Payload stores localized fields with _en, _fr, _ar suffixes in the DB
CREATE INDEX idx_pois_name_en_trgm ON pois USING GIN (name_en gin_trgm_ops);
CREATE INDEX idx_pois_name_fr_trgm ON pois USING GIN (name_fr gin_trgm_ops);
CREATE INDEX idx_pois_name_ar_trgm ON pois USING GIN (name_ar gin_trgm_ops);
CREATE INDEX idx_pois_description_en_trgm ON pois USING GIN (description_en gin_trgm_ops);

-- GIN indexes on pages
CREATE INDEX idx_pages_title_en_trgm ON pages USING GIN (title_en gin_trgm_ops);
```

**Step 3: Fuzzy search query**

```sql
-- Find POIs with names similar to a misspelled term
SELECT id, name_en, similarity(name_en, 'restraunt') AS sim_score
FROM pois
WHERE name_en % 'restraunt'
ORDER BY sim_score DESC
LIMIT 20;
```

**Step 4: Fast LIKE query (now index-accelerated)**

```sql
-- This now uses the GIN trigram index instead of a full table scan
SELECT id, name_en
FROM pois
WHERE name_en ILIKE '%coffee%'
ORDER BY name_en
LIMIT 20;
```

**Step 5: Set similarity threshold**

```sql
-- Lower the threshold for more tolerant matching (default is 0.3)
SET pg_trgm.similarity_threshold = 0.2;

SELECT id, name_en, similarity(name_en, 'musseum') AS score
FROM pois
WHERE name_en % 'musseum'
ORDER BY score DESC;
```

**Step 6: Verification queries**

```sql
-- Check trigram indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'pois' AND indexdef LIKE '%gin_trgm_ops%';

-- Verify index is being used
EXPLAIN ANALYZE
SELECT id, name_en FROM pois WHERE name_en ILIKE '%restaurant%';

-- Test similarity function
SELECT similarity('restaurant', 'restraunt');
-- Expected: ~0.4
```

#### Payload CMS Integration -- Fuzzy Search API Route

```typescript
// src/app/api/bff/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { sql } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q') || ''
  const locale = searchParams.get('locale') || 'en'
  const limit = parseInt(searchParams.get('limit') || '20')

  if (!query.trim()) {
    return NextResponse.json({ results: [] })
  }

  const payload = await getPayload({ config: configPromise })
  const db = payload.db.drizzle

  const nameCol = `name_${locale}`

  const results = await db.execute(sql`
    SELECT id, ${sql.raw(nameCol)} AS name, coordinates_lat, coordinates_lng,
           similarity(${sql.raw(nameCol)}, ${query}) AS score
    FROM pois
    WHERE ${sql.raw(nameCol)} % ${query}
       OR ${sql.raw(nameCol)} ILIKE ${'%' + query + '%'}
    ORDER BY score DESC NULLS LAST
    LIMIT ${limit}
  `)

  return NextResponse.json({ results: results.rows, query })
}
```

#### How to Install

```sql
-- Production (Neon): already installed (v1.6)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Dev (heliumdb): NOT installed
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

---

### 2.5 btree_gist -- Composite Indexes and Exclusion Constraints

#### What It Does

btree_gist provides GiST (Generalized Search Tree) index operator classes for standard scalar data types (integer, text, timestamp, etc.). This is important because GiST indexes normally only support spatial/range types. With btree_gist, you can create GiST indexes on regular columns, which unlocks:

1. **Exclusion constraints** -- Prevent overlapping ranges (e.g., "no two bookings for the same room can overlap in time")
2. **Multi-column GiST indexes** that mix scalar and range types

#### Current State in Dakkah

**Installed on production only, not used anywhere.**

- NOT installed on the dev database
- Zero GiST indexes in the database
- No exclusion constraints
- The `poi_hours` table has columns: `day_of_week` (enum), `open_time` (varchar), `close_time` (varchar), `is24_hours`, `is_closed`, `seasonal_period`, `effective_from` (timestamptz), `effective_to` (timestamptz) -- but no constraints prevent overlapping hours for the same POI and day

#### Where It Should Be Used

1. **`poi_hours` table** -- Prevent overlapping operating hours for the same POI on the same day of week
2. **Booking/reservation systems** -- Prevent double-booking of facilities or venues
3. **Seasonal periods** -- Prevent overlapping seasonal period definitions for the same POI

#### Implementation Plan

**Step 1: Install btree_gist on dev**

```sql
-- Production (Neon): already installed (v1.7)
-- Dev: NOT installed
CREATE EXTENSION IF NOT EXISTS btree_gist;
```

**Step 2: Add exclusion constraint to `poi_hours`**

The current `poi_hours` table uses `open_time` and `close_time` as `varchar`. To use an exclusion constraint, these would ideally be `time` or `tsrange` types. With the current varchar schema, we can still use btree_gist for seasonal period overlap prevention:

```sql
-- Prevent overlapping seasonal periods for the same POI + day_of_week
-- This requires effective_from and effective_to to be NOT NULL
ALTER TABLE poi_hours
ADD CONSTRAINT poi_hours_no_overlap
EXCLUDE USING GIST (
  poi_id WITH =,
  day_of_week WITH =,
  tstzrange(effective_from, effective_to) WITH &&
)
WHERE (effective_from IS NOT NULL AND effective_to IS NOT NULL);
```

**Step 3: Verification queries**

```sql
-- Check exclusion constraints
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'poi_hours'::regclass AND contype = 'x';

-- Test that overlapping inserts are rejected
-- (should fail if an overlapping row already exists)
INSERT INTO poi_hours (poi_id, day_of_week, open_time, close_time, effective_from, effective_to)
VALUES (1, 'monday', '09:00', '17:00', '2026-01-01', '2026-06-30');

-- This should fail with exclusion violation:
INSERT INTO poi_hours (poi_id, day_of_week, open_time, close_time, effective_from, effective_to)
VALUES (1, 'monday', '10:00', '18:00', '2026-03-01', '2026-09-30');
```

#### How to Install

```sql
-- Production (Neon): already installed (v1.7)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Dev (heliumdb): NOT installed
CREATE EXTENSION IF NOT EXISTS btree_gist;
```

---

### 2.6 unaccent -- Accent-Insensitive Search

#### What It Does

unaccent is a text search dictionary that removes accents (diacritical marks) from characters. For example, "cafe" and "caf&eacute;" are treated as equivalent. It is used with PostgreSQL's full-text search system to create custom text search configurations that normalize accented characters during indexing and querying.

#### Current State in Dakkah

**Installed on production only, not used anywhere.**

- NOT installed on the dev database
- No custom text search configurations exist
- Only built-in PostgreSQL text search configs are present (arabic, danish, dutch, english, finnish, french, german, hungarian, indonesian, irish, italian, lithuanian, nepali, norwegian, portuguese, romanian, russian, simple, spanish, swedish, tamil, turkish, yiddish)
- The platform supports English, French, and Arabic locales -- French content frequently includes accented characters (e, a, c, u, etc.)
- The discovery engine uses `LIKE` for text search (no full-text search at all)

#### Where It Should Be Used

1. **French content search** -- Search for "cafe" should match "caf&eacute;", "ecole" should match "&eacute;cole"
2. **Multi-language POI search** -- POI names in French often have accents
3. **Combined with pg_trgm** -- Create an unaccent-aware trigram search for fuzzy + accent-insensitive matching

#### Implementation Plan

**Step 1: Install unaccent on dev**

```sql
-- Production (Neon): already installed (v1.1)
-- Dev: NOT installed
CREATE EXTENSION IF NOT EXISTS unaccent;
```

**Step 2: Create an unaccent-aware text search configuration**

```sql
-- Create a custom text search config based on French
CREATE TEXT SEARCH CONFIGURATION fr_unaccent (COPY = french);

-- Add unaccent dictionary to the pipeline
ALTER TEXT SEARCH CONFIGURATION fr_unaccent
  ALTER MAPPING FOR hword, hword_part, word
  WITH unaccent, french_stem;

-- Create a similar config for English
CREATE TEXT SEARCH CONFIGURATION en_unaccent (COPY = english);
ALTER TEXT SEARCH CONFIGURATION en_unaccent
  ALTER MAPPING FOR hword, hword_part, word
  WITH unaccent, english_stem;
```

**Step 3: Create full-text search indexes using the unaccent config**

```sql
-- Add a tsvector column for full-text search (French)
ALTER TABLE pois ADD COLUMN fts_name_fr tsvector
  GENERATED ALWAYS AS (to_tsvector('fr_unaccent', COALESCE(name_fr, ''))) STORED;

CREATE INDEX idx_pois_fts_name_fr ON pois USING GIN (fts_name_fr);

-- English equivalent
ALTER TABLE pois ADD COLUMN fts_name_en tsvector
  GENERATED ALWAYS AS (to_tsvector('en_unaccent', COALESCE(name_en, ''))) STORED;

CREATE INDEX idx_pois_fts_name_en ON pois USING GIN (fts_name_en);
```

**Step 4: Search queries with accent insensitivity**

```sql
-- Search for "cafe" matches "Cafe", "Cafe", "CAFE" etc.
SELECT id, name_fr
FROM pois
WHERE fts_name_fr @@ to_tsquery('fr_unaccent', 'cafe');

-- Or use unaccent() directly in simpler queries
SELECT id, name_fr
FROM pois
WHERE unaccent(name_fr) ILIKE '%' || unaccent('cafe') || '%';
```

**Step 5: Verification queries**

```sql
-- Test unaccent function
SELECT unaccent('cafe ecole chateau');
-- Expected: 'cafe ecole chateau'

-- Check custom text search configs exist
SELECT cfgname FROM pg_ts_config WHERE cfgname IN ('fr_unaccent', 'en_unaccent');

-- Test full-text search
SELECT to_tsvector('fr_unaccent', 'Cafe de Paris') @@ to_tsquery('fr_unaccent', 'cafe');
-- Expected: true
```

#### How to Install

```sql
-- Production (Neon): already installed (v1.1)
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Dev (heliumdb): NOT installed
CREATE EXTENSION IF NOT EXISTS unaccent;
```

---

### 2.7 plpgsql -- Procedural Language

#### What It Does

PL/pgSQL is the default procedural language for PostgreSQL. It allows writing stored procedures, functions, and triggers using a SQL-based scripting language with variables, loops, conditionals, and exception handling.

#### Current State in Dakkah

**Installed on both dev and production. Always present by default.**

plpgsql is automatically installed in every PostgreSQL database. It is used internally by PostgreSQL and is required by many extensions (including TimescaleDB). The Dakkah codebase does not define any custom PL/pgSQL functions or triggers -- all business logic is implemented in TypeScript via Payload hooks and API routes.

#### Where It Could Be Used

1. **Trigger functions** -- Automatically sync PostGIS geography column when coordinates change
2. **Stored procedures** -- Complex multi-step operations that benefit from running inside the database
3. **Custom aggregates** -- Specialized aggregation functions for analytics

#### Example: Auto-sync geography column trigger

```sql
CREATE OR REPLACE FUNCTION sync_pois_geography()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.coordinates_lat IS NOT NULL AND NEW.coordinates_lng IS NOT NULL THEN
    NEW.geog := ST_MakePoint(NEW.coordinates_lng, NEW.coordinates_lat)::geography;
  ELSE
    NEW.geog := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pois_sync_geography
  BEFORE INSERT OR UPDATE OF coordinates_lat, coordinates_lng
  ON pois
  FOR EACH ROW
  EXECUTE FUNCTION sync_pois_geography();
```

#### How to Install

```sql
-- Always installed by default. No action needed.
-- Verify:
SELECT extversion FROM pg_extension WHERE extname = 'plpgsql';
```

---

## 3. Recommended Extensions (Not Yet Installed)

### 3.1 h3 + h3_postgis

#### What It Does

H3 is Uber's hexagonal hierarchical geospatial indexing system. The `h3` PostgreSQL extension provides H3 functions natively in SQL, and `h3_postgis` bridges H3 with PostGIS geometry types.

#### Why Dakkah Needs It

The codebase already computes H3 indexes in JavaScript (`src/lib/poi/geo-utils.ts` uses `h3-js` to call `latLngToCell` and `gridDisk`), stores results in `pois.h3_index` and `pois.h3_index_r7` varchar columns, and uses H3 for spatial lookups. Moving this to PostgreSQL would:

- Eliminate the JavaScript computation step in the `computeGeoIndexesHook`
- Enable SQL-based H3 proximity queries (k-ring neighbors)
- Allow computed/generated columns instead of hook-maintained fields

#### Installation

```sql
-- Check Neon availability first; h3 may not be available on all Neon plans
CREATE EXTENSION IF NOT EXISTS h3;
CREATE EXTENSION IF NOT EXISTS h3_postgis;  -- requires postgis
```

#### Example Usage with Dakkah Tables

```sql
-- Compute H3 index directly in SQL instead of JavaScript
SELECT id,
       h3_lat_lng_to_cell(POINT(coordinates_lng, coordinates_lat), 9) AS h3_r9,
       h3_lat_lng_to_cell(POINT(coordinates_lng, coordinates_lat), 7) AS h3_r7
FROM pois
WHERE coordinates_lat IS NOT NULL;

-- Find POIs in neighboring H3 cells (k-ring query)
SELECT p.id, p.h3_index
FROM pois p
WHERE p.h3_index = ANY(
  SELECT h3_grid_disk('891f1d48a4bffff'::h3index, 1)
);

-- Generated column (replaces JavaScript hook entirely)
ALTER TABLE pois ADD COLUMN h3_index_computed h3index
  GENERATED ALWAYS AS (
    CASE WHEN coordinates_lat IS NOT NULL AND coordinates_lng IS NOT NULL
         THEN h3_lat_lng_to_cell(POINT(coordinates_lng, coordinates_lat), 9)
         ELSE NULL END
  ) STORED;
```

---

### 3.2 pg_uuidv7

#### What It Does

Generates UUIDv7 values, which are time-ordered UUIDs. Unlike UUIDv4 (random), UUIDv7 embeds a timestamp, making them naturally sortable by creation time and better for B-tree index performance.

#### Why Dakkah Needs It

Currently, all tables use auto-incrementing `integer` IDs. If the platform ever moves to UUID primary keys (for better distributed system compatibility, API security, or multi-region deployments), UUIDv7 is the preferred format because it maintains B-tree index locality.

#### Installation

```sql
CREATE EXTENSION IF NOT EXISTS pg_uuidv7;
```

#### Example Usage

```sql
-- Generate a UUIDv7
SELECT uuid_generate_v7();

-- Use as default for new tables
CREATE TABLE example (
  id uuid DEFAULT uuid_generate_v7() PRIMARY KEY,
  name text
);
```

---

### 3.3 pgrag

#### What It Does

pgrag provides Retrieval-Augmented Generation (RAG) pipeline utilities directly in PostgreSQL. It combines document chunking, embedding generation, and vector search into SQL functions.

#### Why Dakkah Needs It

The AI Intelligence Layer plans include RAG-based content generation. pgrag would allow:
- Chunking CMS page content stored in `pages` for embedding
- Building a RAG pipeline that retrieves relevant content chunks before calling OpenAI

#### Installation

```sql
-- Check Neon availability
CREATE EXTENSION IF NOT EXISTS pgrag;
```

#### Example Usage

```sql
-- Chunk a page's content for embedding
SELECT pgrag.chunk_text(
  (SELECT content FROM pages WHERE id = 1),
  max_tokens := 500,
  overlap := 50
);
```

---

### 3.4 pg_tiktoken

#### What It Does

pg_tiktoken provides OpenAI's tiktoken tokenizer as PostgreSQL functions. It counts tokens for a given model, which is useful for cost estimation and chunk sizing.

#### Why Dakkah Needs It

The AI system (`src/app/api/ai/execute/route.ts`) tracks token usage and costs. pg_tiktoken would allow pre-flight token counting in SQL before sending prompts to OpenAI, enabling better cost control and prompt size validation.

#### Installation

```sql
CREATE EXTENSION IF NOT EXISTS pg_tiktoken;
```

#### Example Usage

```sql
-- Count tokens for a prompt before sending to OpenAI
SELECT tiktoken_count('gpt-4o', 'What restaurants are near the Dubai Mall?');

-- Estimate cost before execution
SELECT
  name,
  tiktoken_count('gpt-4o', system_prompt || user_prompt_template) AS estimated_tokens
FROM ai_prompts
WHERE status = 'active';
```

---

### 3.5 pg_jsonschema

#### What It Does

pg_jsonschema validates JSON/JSONB data against JSON Schema specifications directly in PostgreSQL using CHECK constraints.

#### Why Dakkah Needs It

The `pois` table has many `jsonb` columns (`tags`, `attributes`, `allowed_capabilities`, `activated_capabilities`, `ancestor_path`, `geo_polygon`, `opening_hours`, `social_media`, `accessibility`, `key_features`, etc.) with no schema validation at the database level. pg_jsonschema would enforce structure on these fields.

#### Installation

```sql
CREATE EXTENSION IF NOT EXISTS pg_jsonschema;
```

#### Example Usage

```sql
-- Validate that tags is always an array of strings
ALTER TABLE pois ADD CONSTRAINT tags_schema CHECK (
  tags IS NULL OR json_matches_schema(
    '{
      "type": "array",
      "items": { "type": "string" }
    }'::json,
    tags::json
  )
);

-- Validate opening_hours structure
ALTER TABLE pois ADD CONSTRAINT opening_hours_schema CHECK (
  opening_hours IS NULL OR json_matches_schema(
    '{
      "type": "object",
      "patternProperties": {
        "^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$": {
          "type": "object",
          "properties": {
            "open": { "type": "string" },
            "close": { "type": "string" }
          }
        }
      }
    }'::json,
    opening_hours::json
  )
);
```

---

### 3.6 ltree

#### What It Does

ltree provides a data type for representing labels of data stored in a hierarchical tree-like structure. It supports efficient queries for ancestors, descendants, and path matching.

#### Why Dakkah Needs It

Dakkah has multiple hierarchical structures:
- `tenants` table: `parent_tenant_id` (self-referencing) with 5 tiers (MASTER, GLOBAL, REGIONAL, COUNTRY, CITY)
- `nodes` table: `parent_id` (self-referencing)
- `pois` table: `parent_poi_id` (self-referencing) with `ancestor_path` (jsonb) and `depth_level`

Currently, `ancestor_path` is stored as jsonb. ltree would provide native path-based queries that are much more efficient.

#### Installation

```sql
CREATE EXTENSION IF NOT EXISTS ltree;
```

#### Example Usage

```sql
-- Add an ltree column to pois for hierarchy path
ALTER TABLE pois ADD COLUMN hierarchy_path ltree;

-- Example: POI 42 is inside POI 10, which is inside POI 1
UPDATE pois SET hierarchy_path = '1.10.42' WHERE id = 42;

-- Find all descendants of POI 1
SELECT id, hierarchy_path FROM pois WHERE hierarchy_path <@ '1';

-- Find all ancestors of POI 42
SELECT id, hierarchy_path FROM pois WHERE '1.10.42' <@ hierarchy_path;

-- Create index for efficient path queries
CREATE INDEX idx_pois_hierarchy_path ON pois USING GIST (hierarchy_path);

-- Same pattern for tenants
ALTER TABLE tenants ADD COLUMN tenant_path ltree;
CREATE INDEX idx_tenants_path ON tenants USING GIST (tenant_path);
```

---

### 3.7 citext

#### What It Does

citext provides a case-insensitive text data type. Unlike regular `varchar`/`text`, comparisons and indexing on `citext` columns are case-insensitive by default.

#### Why Dakkah Needs It

The `users` table has `email` as `varchar`. Email addresses should be case-insensitive ("User@Example.com" and "user@example.com" should be treated as the same email). Currently, duplicate detection would require explicit `LOWER()` calls.

#### Installation

```sql
CREATE EXTENSION IF NOT EXISTS citext;
```

#### Example Usage

```sql
-- Convert email column to citext
ALTER TABLE users ALTER COLUMN email TYPE citext;

-- Now lookups are automatically case-insensitive
SELECT * FROM users WHERE email = 'User@Example.COM';
-- Matches 'user@example.com' without LOWER()

-- Unique constraint automatically case-insensitive
ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
-- Prevents both 'user@example.com' and 'User@Example.COM' from being inserted

-- Also useful for POI slugs
ALTER TABLE pois ALTER COLUMN slug TYPE citext;
```

---

### 3.8 pg_stat_statements

#### What It Does

pg_stat_statements tracks planning and execution statistics for all SQL statements executed by the server. It shows which queries are slowest, most frequent, and use the most resources.

#### Why Dakkah Needs It

Essential for performance monitoring. With 69+ collections and complex multi-tenant queries, identifying slow queries is critical for scaling. This is typically the first extension a DBA installs.

#### Installation

```sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

#### Example Usage

```sql
-- Find the slowest queries by total time
SELECT
  calls,
  round(total_exec_time::numeric, 2) AS total_ms,
  round(mean_exec_time::numeric, 2) AS avg_ms,
  rows,
  left(query, 100) AS query_preview
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;

-- Find queries with the most calls (hot paths)
SELECT calls, query
FROM pg_stat_statements
ORDER BY calls DESC
LIMIT 20;

-- Reset statistics
SELECT pg_stat_statements_reset();
```

---

### 3.9 hll (HyperLogLog)

#### What It Does

hll provides a HyperLogLog data type for probabilistic cardinality estimation. It can estimate the number of distinct elements in a set using very little memory (typically 1.2KB per counter), making it ideal for analytics at scale.

#### Why Dakkah Needs It

For analytics dashboards: counting unique visitors per POI, unique users per tenant, unique event types -- all without storing individual values. Especially useful with TimescaleDB continuous aggregates.

#### Installation

```sql
CREATE EXTENSION IF NOT EXISTS hll;
```

#### Example Usage

```sql
-- Track unique visitors per POI per day
CREATE TABLE poi_daily_stats (
  poi_id integer,
  day date,
  unique_visitors hll DEFAULT hll_empty(),
  PRIMARY KEY (poi_id, day)
);

-- Add a visitor (idempotent, duplicates ignored)
UPDATE poi_daily_stats
SET unique_visitors = hll_add(unique_visitors, hll_hash_text('user-abc-123'))
WHERE poi_id = 42 AND day = CURRENT_DATE;

-- Count unique visitors
SELECT poi_id, hll_cardinality(unique_visitors)::integer AS approx_uniques
FROM poi_daily_stats
WHERE day = CURRENT_DATE;

-- Union across multiple days for weekly count
SELECT poi_id, hll_cardinality(hll_union_agg(unique_visitors))::integer AS weekly_uniques
FROM poi_daily_stats
WHERE day >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY poi_id;
```

---

### 3.10 pg_partman

#### What It Does

pg_partman automates creation and management of time-based and serial-based table partitions. It handles partition creation, retention, and maintenance without manual DDL.

#### Why Dakkah Needs It

If TimescaleDB is not suitable (due to Neon limitations), pg_partman provides an alternative for partitioning `audit_logs` and `event_tracking` by time. It uses native PostgreSQL declarative partitioning.

#### Installation

```sql
CREATE EXTENSION IF NOT EXISTS pg_partman;
```

#### Example Usage

```sql
-- Convert audit_logs to a partitioned table (monthly partitions)
-- Note: requires table recreation since you can't add partitioning to existing tables

CREATE TABLE audit_logs_partitioned (
  LIKE audit_logs INCLUDING ALL
) PARTITION BY RANGE (timestamp);

SELECT partman.create_parent(
  'public.audit_logs_partitioned',
  'timestamp',
  'native',
  'monthly'
);

-- Migrate data
INSERT INTO audit_logs_partitioned SELECT * FROM audit_logs;

-- Automatic maintenance (creates future partitions, drops old ones)
SELECT partman.run_maintenance();
```

---

### 3.11 pgrouting

#### What It Does

pgRouting extends PostGIS with routing and network analysis functionality. It provides shortest path algorithms (Dijkstra, A*), traveling salesman, driving distance, and more.

#### Why Dakkah Needs It

For a smart city platform, routing between POIs is a natural feature: "find the shortest route between three landmarks" or "what's the walking distance from the metro station to the museum." Requires PostGIS.

#### Installation

```sql
-- Requires postgis
CREATE EXTENSION IF NOT EXISTS pgrouting;
```

#### Example Usage

```sql
-- Shortest path between two nodes in a road network
SELECT * FROM pgr_dijkstra(
  'SELECT id, source, target, cost FROM road_network',
  start_node_id,
  end_node_id,
  directed := false
);

-- Driving distance (isochrone): all reachable nodes within cost limit
SELECT * FROM pgr_drivingDistance(
  'SELECT id, source, target, cost FROM road_network',
  start_node_id,
  max_cost := 1000  -- meters
);
```

---

### 3.12 postgis_topology

#### What It Does

postgis_topology adds topological data management capabilities to PostGIS. It models spatial data as nodes, edges, and faces with explicit topological relationships, ensuring geometric consistency (no gaps, no overlaps between adjacent polygons).

#### Why Dakkah Needs It

For managing city district boundaries, zones, and administrative areas where boundaries must share edges without gaps or overlaps. Useful for the hierarchical POI structure (city > district > zone > building).

#### Installation

```sql
-- Requires postgis
CREATE EXTENSION IF NOT EXISTS postgis_topology;
```

#### Example Usage

```sql
-- Create a topology for city districts
SELECT topology.CreateTopology('city_districts', 4326, 0.0001);

-- Add a layer for district polygons
SELECT topology.AddTopoGeometryColumn('city_districts', 'public', 'pois', 'topo_geom', 'POLYGON');
```

---

### 3.13 anon (PostgreSQL Anonymizer)

#### What It Does

anon provides data masking and anonymization functions for PostgreSQL. It can mask personal data in-place or generate anonymized views, supporting GDPR compliance.

#### Why Dakkah Needs It

The platform stores user PII (emails, phone numbers) in `users`, contact information in `pois` (phone, email, website), and user activity in `audit_logs` and `event_tracking` (user_id, ip, user_agent). Data anonymization is needed for:
- GDPR compliance (right to be forgotten)
- Creating safe development/staging copies of production data
- Analytics that don't expose individual user identity

#### Installation

```sql
-- May not be available on Neon; check provider support
CREATE EXTENSION IF NOT EXISTS anon;
```

#### Example Usage

```sql
-- Define masking rules
SELECT anon.init();

SECURITY LABEL FOR anon ON COLUMN users.email IS 'MASKED WITH FUNCTION anon.fake_email()';
SECURITY LABEL FOR anon ON COLUMN event_tracking.ip IS 'MASKED WITH FUNCTION anon.partial(ip, 2, $$***$$, 0)';
SECURITY LABEL FOR anon ON COLUMN event_tracking.user_agent IS 'MASKED WITH VALUE $$REDACTED$$';

-- Create an anonymized dump for staging
-- pg_dump with anon.anonymize_database() called first
```

---

### 3.14 bloom

#### What It Does

bloom provides a Bloom filter index access method. A Bloom index is a space-efficient data structure that can test set membership. It is useful when you have queries that filter on many different column combinations and creating a separate B-tree index for each combination would be impractical.

#### Why Dakkah Needs It

The `pois` table has many filterable columns (status, category, primary_category, tier, type, residency_class, source, business_status, price_level). Users might filter on any combination of these. A Bloom index handles multi-column ad-hoc queries efficiently.

#### Installation

```sql
CREATE EXTENSION IF NOT EXISTS bloom;
```

#### Example Usage

```sql
-- Create a bloom index on commonly filtered POI columns
CREATE INDEX idx_pois_bloom ON pois USING bloom (
  status,
  category,
  primary_category,
  tier,
  type,
  residency_class,
  source
);

-- Queries filtering on any subset of these columns can use the index
SELECT id FROM pois
WHERE status = 'active' AND tier = 'meso' AND primary_category = 'restaurant';

SELECT id FROM pois
WHERE type = 'facility' AND residency_class = 'public';
```

---

### 3.15 cube + earthdistance

#### What It Does

`cube` provides a data type for multidimensional cubes. `earthdistance` builds on `cube` to provide earth distance calculations using a spherical model. Together they offer a lightweight alternative to PostGIS for simple point-distance queries.

#### Why Dakkah Needs It

If PostGIS is considered too heavyweight for simple proximity queries, cube + earthdistance provides basic "find nearby POIs" functionality with much less overhead. However, since PostGIS is already installed, this is mainly useful as a fallback or for environments where PostGIS is not available.

#### Installation

```sql
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;  -- depends on cube
```

#### Example Usage

```sql
-- Calculate distance between two points (in meters)
SELECT earth_distance(
  ll_to_earth(25.2048, 55.2708),  -- Dubai Mall
  ll_to_earth(25.1972, 55.2744)   -- Burj Khalifa
) AS distance_meters;

-- Find POIs within 5km of a point
SELECT id, coordinates_lat, coordinates_lng,
       earth_distance(
         ll_to_earth(coordinates_lat, coordinates_lng),
         ll_to_earth(25.2048, 55.2708)
       ) AS distance_meters
FROM pois
WHERE earth_box(ll_to_earth(25.2048, 55.2708), 5000) @> ll_to_earth(coordinates_lat, coordinates_lng)
  AND earth_distance(ll_to_earth(coordinates_lat, coordinates_lng), ll_to_earth(25.2048, 55.2708)) < 5000
ORDER BY distance_meters;

-- Create an index for earth_distance queries
CREATE INDEX idx_pois_earthdistance ON pois USING GIST (ll_to_earth(coordinates_lat, coordinates_lng));
```

---

## 4. How to Install and Manage Extensions in Payload CMS

### 4.1 Installing on Neon Production Database

Neon supports installing extensions via SQL. Connect to your Neon database using the Neon Console SQL Editor or `psql`:

```sql
-- Install an extension
CREATE EXTENSION IF NOT EXISTS <extension_name>;

-- Verify installation
SELECT extname, extversion FROM pg_extension WHERE extname = '<extension_name>';

-- List all available extensions on Neon
SELECT name, default_version, installed_version
FROM pg_available_extensions
ORDER BY name;
```

Note: Not all extensions are available on Neon. Check the [Neon extensions documentation](https://neon.tech/docs/extensions/pg-extensions) for the current list. Extensions are installed per-database, not per-schema.

### 4.2 Installing on Development Database

The development database (heliumdb) runs a standard PostgreSQL instance. Extensions need to be installed by a superuser:

```sql
-- Connect to the dev database
-- psql -h localhost -U helium -d heliumdb

CREATE EXTENSION IF NOT EXISTS <extension_name>;
```

For extensions that require shared library preloading (like TimescaleDB), the PostgreSQL server configuration (`postgresql.conf`) may need to be updated:

```
shared_preload_libraries = 'timescaledb'
```

Then restart PostgreSQL.

### 4.3 Configuring tablesFilter

Payload CMS's `db-postgres` adapter has a `tablesFilter` option that controls which tables Payload manages. Extensions often create system tables that should be excluded from Payload's schema management.

Current configuration in `src/payload.config.ts`:

```typescript
db: postgresAdapter({
  pool: {
    connectionString: process.env.DATABASE_URL as string,
  },
  push: false,
  migrationDir: path.resolve(dirname, 'migrations'),
  tablesFilter: [
    '!spatial_ref_sys',
    '!geography_columns',
    '!geometry_columns',
    '!raster_columns',
    '!raster_overviews',
  ],
}),
```

When adding new extensions, update `tablesFilter` to exclude their system tables:

```typescript
tablesFilter: [
  // PostGIS system tables
  '!spatial_ref_sys',
  '!geography_columns',
  '!geometry_columns',
  '!raster_columns',
  '!raster_overviews',
  // TimescaleDB system tables (if using TimescaleDB)
  '!_timescaledb_*',
  // pgRouting (if using pgRouting)
  '!_pgrouting_*',
  // PostGIS topology (if using postgis_topology)
  '!topology',
  '!layer',
],
```

### 4.4 Using Raw SQL via payload.db.drizzle

Payload CMS exposes the underlying Drizzle ORM instance, which allows executing raw SQL. This is the primary mechanism for using extension-specific features that Payload does not natively support.

```typescript
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { sql } from 'drizzle-orm'

// In an API route or hook:
const payload = await getPayload({ config: configPromise })
const db = payload.db.drizzle

// Execute raw SQL
const results = await db.execute(sql`
  SELECT id, coordinates_lat, coordinates_lng,
         ST_Distance(
           geog,
           ST_MakePoint(${lng}, ${lat})::geography
         ) AS distance_meters
  FROM pois
  WHERE ST_DWithin(geog, ST_MakePoint(${lng}, ${lat})::geography, ${radiusMeters})
  ORDER BY distance_meters
  LIMIT ${limit}
`)

// Results are in results.rows
console.log(results.rows)
```

Important notes:
- Use `sql` template literals from `drizzle-orm` for parameterized queries (prevents SQL injection)
- Use `sql.raw()` only for trusted, static SQL fragments (table names, column names) -- never for user input
- The `db.execute()` method returns `{ rows: any[], rowCount: number }`

### 4.5 Creating Migration Files for Extension-Dependent Changes

Since Payload uses `push: false`, all schema changes must go through migrations. For extension-dependent changes:

**Step 1: Create the migration file**

```bash
npx payload migrate:create --name add_postgis_columns
```

This creates a file in `src/migrations/`.

**Step 2: Write the migration**

```typescript
// src/migrations/20260216_add_postgis_columns.ts
import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'
import { sql } from 'drizzle-orm'

export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  const db = payload.db.drizzle

  // Ensure extension is available
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS postgis`)

  // Add geography column
  await db.execute(sql`
    ALTER TABLE pois ADD COLUMN IF NOT EXISTS geog geography(Point, 4326)
  `)

  // Populate from existing data
  await db.execute(sql`
    UPDATE pois
    SET geog = ST_MakePoint(coordinates_lng, coordinates_lat)::geography
    WHERE coordinates_lat IS NOT NULL
      AND coordinates_lng IS NOT NULL
      AND geog IS NULL
  `)

  // Create spatial index
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_pois_geog ON pois USING GIST (geog)
  `)
}

export async function down({ payload, req }: MigrateDownArgs): Promise<void> {
  const db = payload.db.drizzle

  await db.execute(sql`DROP INDEX IF EXISTS idx_pois_geog`)
  await db.execute(sql`ALTER TABLE pois DROP COLUMN IF EXISTS geog`)
}
```

**Step 3: Run the migration**

```bash
npx payload migrate
```

### 4.6 Environment-Specific Extension Handling

Since dev and production have different extensions installed, code that uses extensions should handle the difference:

```typescript
// src/lib/db/extensionCheck.ts
import { sql } from 'drizzle-orm'

export async function isExtensionAvailable(
  db: any,
  extensionName: string,
): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT 1 FROM pg_extension WHERE extname = ${extensionName}
    `)
    return (result.rows?.length || 0) > 0
  } catch {
    return false
  }
}

// Usage in an API route:
const hasPostGIS = await isExtensionAvailable(db, 'postgis')

if (hasPostGIS) {
  // Use ST_DWithin for spatial query
  results = await db.execute(sql`
    SELECT id FROM pois
    WHERE ST_DWithin(geog, ST_MakePoint(${lng}, ${lat})::geography, ${radius})
  `)
} else {
  // Fallback to bounding box approximation
  const latDelta = radius / 111320
  const lngDelta = radius / (111320 * Math.cos(lat * Math.PI / 180))
  results = await db.execute(sql`
    SELECT id FROM pois
    WHERE coordinates_lat BETWEEN ${lat - latDelta} AND ${lat + latDelta}
      AND coordinates_lng BETWEEN ${lng - lngDelta} AND ${lng + lngDelta}
  `)
}
```

For migrations, guard extension-specific operations:

```typescript
export async function up({ payload }: MigrateUpArgs): Promise<void> {
  const db = payload.db.drizzle

  // Check if TimescaleDB is available before creating hypertables
  const hasTimescale = await db.execute(sql`
    SELECT 1 FROM pg_available_extensions WHERE name = 'timescaledb'
  `)

  if (hasTimescale.rows.length > 0) {
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS timescaledb`)
    await db.execute(sql`
      SELECT create_hypertable('audit_logs', 'timestamp',
        migrate_data => true, if_not_exists => true
      )
    `)
  }
}
```

---

## 5. Extension Compatibility and Neon Limitations

### 5.1 Citus -- Not Available on Neon

Citus (distributed PostgreSQL) is NOT available on Neon. Neon has its own horizontal scaling approach through its serverless architecture. If distributed query processing is needed, consider:
- Neon's branch-based scaling
- Application-level sharding by tenant
- Read replicas for query distribution

### 5.2 spatial_ref_sys Ownership Issue

PostGIS creates a `spatial_ref_sys` table that is owned by the extension. On Neon, this table is read-only for regular users. Common issues:

```
ERROR: permission denied for table spatial_ref_sys
```

**Fix:** The `tablesFilter` in `src/payload.config.ts` already excludes this table:

```typescript
tablesFilter: ['!spatial_ref_sys', '!geography_columns', '!geometry_columns', '!raster_columns', '!raster_overviews'],
```

If you need to add custom SRIDs:

```sql
-- On Neon, you may need to contact support for custom SRID additions
-- On dev, you can insert directly:
INSERT INTO spatial_ref_sys (srid, auth_name, auth_srid, proj4text, srtext)
VALUES (900913, 'EPSG', 900913, '+proj=merc ...', 'PROJCS["Google Maps Global Mercator" ...]');
```

### 5.3 TimescaleDB Limitations on Neon

TimescaleDB on Neon has specific limitations:

1. **No continuous aggregates with real-time updates** -- Neon's serverless compute can scale to zero, which conflicts with TimescaleDB's background workers
2. **No compression policies that require background workers** -- Manual compression is possible, but automated policies may not work reliably
3. **No data retention policies via background workers** -- Must be handled manually or via cron
4. **Hypertable creation works** -- `create_hypertable()` and `time_bucket()` work fine
5. **No multi-node TimescaleDB** -- Only single-node mode is supported

**Alternative:** If TimescaleDB limitations are too restrictive on Neon, use `pg_partman` for native PostgreSQL partitioning, which has no background worker requirements.

### 5.4 Extension Dependencies

Some extensions depend on others:

| Extension | Depends On |
|-----------|-----------|
| h3_postgis | h3, postgis |
| postgis_topology | postgis |
| pgrouting | postgis |
| earthdistance | cube |
| pgrag | vector (pgvector) |

Install dependencies first:

```sql
-- Example: installing pgrouting
CREATE EXTENSION IF NOT EXISTS postgis;    -- dependency
CREATE EXTENSION IF NOT EXISTS pgrouting;  -- depends on postgis
```

### 5.5 Dev vs Production Parity Issues

**Current parity gaps:**

| Extension | Production (Neon) | Dev (heliumdb) | Gap Impact |
|-----------|-------------------|----------------|------------|
| PostGIS | 3.3.3 | 3.5.3 | Version mismatch (dev is newer). Function signatures may differ between 3.3 and 3.5. |
| pgvector | 0.8.0 | NOT installed | Cannot test vector queries locally. Embeddings can only be tested against production. |
| TimescaleDB | 2.13.0 | NOT installed | Cannot test hypertables, continuous aggregates, or time_bucket() locally. |
| pg_trgm | 1.6 | NOT installed | Cannot test trigram search or GIN indexes locally. |
| btree_gist | 1.7 | NOT installed | Cannot test exclusion constraints locally. |
| unaccent | 1.1 | NOT installed | Cannot test accent-insensitive search locally. |

**Recommendation:** Install all production extensions on dev to achieve parity:

```sql
-- Run on dev database (heliumdb):
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS unaccent;
```

Note: Some extensions (especially TimescaleDB) may require PostgreSQL server configuration changes and a restart on the dev environment.

---

## 6. Implementation Priority Roadmap

This roadmap prioritizes changes by impact, risk, and dependency order.

### Priority 1: Quick Wins (No Extension Changes Needed)

**1a. Add missing btree indexes for h3_index, h3_index_r7, geohash**

The POI collection config has `index: true` on these fields, but the actual database has no indexes. This is because `push: false` means Payload does not auto-create indexes.

```sql
-- These are simple btree indexes, no extension required
CREATE INDEX IF NOT EXISTS idx_pois_h3_index ON pois (h3_index);
CREATE INDEX IF NOT EXISTS idx_pois_h3_index_r7 ON pois (h3_index_r7);
CREATE INDEX IF NOT EXISTS idx_pois_geohash ON pois (geohash);
```

**Impact:** Immediate improvement to H3-based and geohash-based POI lookups.
**Risk:** None. Pure additive change.
**Dependency:** None.

### Priority 2: Install Missing Extensions on Dev

Install all production extensions on the dev database to achieve parity. This is a prerequisite for testing any extension-dependent features.

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS unaccent;
-- TimescaleDB may require shared_preload_libraries config change
CREATE EXTENSION IF NOT EXISTS timescaledb;
```

**Impact:** Enables local testing of all extension-dependent features.
**Risk:** Low. TimescaleDB may require PostgreSQL restart.
**Dependency:** None.

### Priority 3: Add pg_trgm GIN Indexes for Text Search

This provides the highest immediate search quality improvement with minimal code changes.

```sql
-- Create trigram indexes on POI name columns
CREATE INDEX idx_pois_name_en_trgm ON pois USING GIN (name_en gin_trgm_ops);
CREATE INDEX idx_pois_name_fr_trgm ON pois USING GIN (name_fr gin_trgm_ops);
CREATE INDEX idx_pois_name_ar_trgm ON pois USING GIN (name_ar gin_trgm_ops);
CREATE INDEX idx_pois_description_en_trgm ON pois USING GIN (description_en gin_trgm_ops);
```

**Impact:** Accelerates existing `LIKE '%text%'` queries (currently full table scans). Enables future fuzzy search.
**Risk:** Low. Index creation may take time on large tables. Use `CONCURRENTLY` in production.
**Dependency:** pg_trgm must be installed on dev (Priority 2).

### Priority 4: Add PostGIS Geography Column and Spatial Index to POIs

Replace JavaScript haversine distance computation with database-level spatial queries.

```sql
ALTER TABLE pois ADD COLUMN geog geography(Point, 4326);

UPDATE pois
SET geog = ST_MakePoint(coordinates_lng, coordinates_lat)::geography
WHERE coordinates_lat IS NOT NULL AND coordinates_lng IS NOT NULL;

CREATE INDEX idx_pois_geog ON pois USING GIST (geog);
```

Then update the discovery engine to use `ST_DWithin()` instead of JavaScript `haversineDistance()`, and add a Payload hook to sync the `geog` column when coordinates change.

**Impact:** Proximity search moves from O(n) JavaScript filtering to O(log n) spatial index lookup. Major performance improvement at scale.
**Risk:** Medium. Requires code changes to discovery engine and adding a sync hook. Needs thorough testing.
**Dependency:** PostGIS (already installed on both environments).

### Priority 5: Add pgvector Embedding Column to Block Manifests

Enable semantic search for the AI Page Composer.

```sql
ALTER TABLE block_manifests ADD COLUMN embedding vector(1536);
CREATE INDEX idx_block_manifests_embedding ON block_manifests USING hnsw (embedding vector_cosine_ops);
```

Then create a hook that generates embeddings via OpenAI on block manifest save, and a semantic search API route.

**Impact:** Enables the planned AI Page Composer feature.
**Risk:** Medium. Requires OpenAI API calls for embedding generation (cost). Needs fallback for when API is unavailable.
**Dependency:** pgvector must be installed on dev (Priority 2). Requires OPENAI_API_KEY.

### Priority 6: Convert audit_logs to TimescaleDB Hypertable

Enable time-based partitioning and analytics on the highest-volume table.

```sql
-- Ensure timestamp is NOT NULL
UPDATE audit_logs SET timestamp = created_at WHERE timestamp IS NULL;
ALTER TABLE audit_logs ALTER COLUMN timestamp SET NOT NULL;

SELECT create_hypertable('audit_logs', 'timestamp',
  migrate_data => true,
  chunk_time_interval => INTERVAL '7 days'
);
```

**Impact:** Improves query performance on audit_logs for time-range queries. Enables continuous aggregates for dashboards.
**Risk:** High. Hypertable conversion modifies the table structure. Some Payload operations may not work correctly with hypertables. TimescaleDB has limitations on Neon (see Section 5.3). Test thoroughly.
**Dependency:** TimescaleDB must be installed on dev (Priority 2).

### Priority 7: Set Up unaccent Text Search Configuration

Create accent-insensitive search for French content.

```sql
CREATE TEXT SEARCH CONFIGURATION fr_unaccent (COPY = french);
ALTER TEXT SEARCH CONFIGURATION fr_unaccent
  ALTER MAPPING FOR hword, hword_part, word
  WITH unaccent, french_stem;
```

**Impact:** Improves French content search quality.
**Risk:** Low. Additive change.
**Dependency:** unaccent must be installed on dev (Priority 2).

### Priority 8: Add btree_gist Exclusion Constraints for poi_hours

Prevent overlapping operating hours at the database level.

```sql
ALTER TABLE poi_hours
ADD CONSTRAINT poi_hours_no_overlap
EXCLUDE USING GIST (
  poi_id WITH =,
  day_of_week WITH =,
  tstzrange(effective_from, effective_to) WITH &&
)
WHERE (effective_from IS NOT NULL AND effective_to IS NOT NULL);
```

**Impact:** Data integrity improvement. Prevents invalid schedule data.
**Risk:** Medium. May reject existing rows that violate the constraint. Must clean data first.
**Dependency:** btree_gist must be installed on dev (Priority 2).

### Summary Table

| Priority | Task | Extension | Risk | Effort |
|----------|------|-----------|------|--------|
| 1a | Add btree indexes for h3_index, h3_index_r7, geohash | None | None | 5 min |
| 2 | Install missing extensions on dev | All | Low | 30 min |
| 3 | Add pg_trgm GIN indexes for text search | pg_trgm | Low | 1 hour |
| 4 | Add PostGIS geography column + spatial index | PostGIS | Medium | 4 hours |
| 5 | Add pgvector embeddings to block_manifests | pgvector | Medium | 8 hours |
| 6 | Convert audit_logs to TimescaleDB hypertable | TimescaleDB | High | 8 hours |
| 7 | Set up unaccent text search config | unaccent | Low | 1 hour |
| 8 | Add btree_gist exclusion constraints | btree_gist | Medium | 2 hours |
