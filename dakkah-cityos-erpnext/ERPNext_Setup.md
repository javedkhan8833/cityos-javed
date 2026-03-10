# ERPNext Setup

## Purpose

This document describes the final working ERPNext local setup for CityOS after the recovery and restructuring completed on `2026-03-06`.

## Final Working URL

- ERPNext site: `http://erp.cityos.local/`
- Traefik dashboard: `http://localhost:8080/`

## Problem Summary

The original ERPNext setup had these root issues:

1. `erp.cityos.local` did not resolve to a correctly configured ERPNext site.
2. The stack used a single `frappe/erpnext` container instead of a full ERPNext runtime.
3. Bench config had broken Redis settings and fell back to localhost ports such as `127.0.0.1:11311`.
4. Assets under `/assets/...` returned `404`, so the UI loaded without styling.
5. Traefik could not reliably discover Docker services through its Docker provider on this host.

## Current Architecture

Browser request flow:

1. Browser requests `http://erp.cityos.local/`
2. Traefik receives the request on port `80`
3. Traefik matches the static route in `reverse-proxy/dynamic/erpnext.yml`
4. Traefik forwards the request to ERPNext `frontend`
5. Nginx `frontend` serves `/assets/...` directly
6. Nginx proxies application requests to `backend`
7. `backend` uses MariaDB and Redis services

## ERPNext Services

File:
- [docker-compose.yml](C:\laragon\www\cityos\dakkah-cityos-erpnext\docker-compose.yml)

The ERPNext stack now includes:

- `erp-db`
- `redis-cache`
- `redis-queue`
- `configurator`
- `backend` (`erpnext-app`)
- `frontend`
- `websocket`
- `queue-short`
- `queue-long`
- `scheduler`
- optional `create-site` profile

Why this layout matters:

- `frontend` serves static assets and proxies application traffic
- `backend` runs the Frappe/ERPNext app
- `websocket` handles socket connections
- `queue-short`, `queue-long`, and `scheduler` support background jobs
- `configurator` writes bench-level runtime config into `sites/common_site_config.json`

## Configuration Files

### ERPNext env file

File:
- [`.env`](C:\laragon\www\cityos\dakkah-cityos-erpnext\.env)

Important values:

- `ERPNEXT_SITE_NAME=erp.cityos.local`
- `ERPNEXT_DB_ROOT_PASSWORD=RootStrongPass123`
- `DB_HOST=erp-db`
- `DB_PORT=3306`
- `REDIS_CACHE=redis://redis-cache:6379`
- `REDIS_QUEUE=redis://redis-queue:6379`
- `REDIS_SOCKETIO=redis://redis-queue:6379`

### Bench global site config

File:
- [common_site_config.json](C:\laragon\www\cityos\dakkah-cityos-erpnext\sites\common_site_config.json)

Important values:

- `default_site` is `erp.cityos.local`
- `db_host` is `erp-db`
- Redis endpoints point to Docker services
- `serve_default_site` is enabled
- `socketio_port` is `9000`

### Site-specific config

Files:
- [site_config.json](C:\laragon\www\cityos\dakkah-cityos-erpnext\sites\erp.cityos.local\site_config.json)
- [currentsite.txt](C:\laragon\www\cityos\dakkah-cityos-erpnext\sites\currentsite.txt)

Purpose:

- preserves the actual ERPNext site across container recreation
- ensures Frappe matches the browser host `erp.cityos.local`

### Installed apps list

File:
- [apps.txt](C:\laragon\www\cityos\dakkah-cityos-erpnext\sites\apps.txt)

Current app list:

- `frappe`
- `erpnext`

Note:

- `cityos` was removed because it is not present in the running ERPNext image.

## Asset Handling

### What changed

Path:
- `C:\laragon\www\cityos\dakkah-cityos-erpnext\sites\assets`

This Windows environment did not preserve the original Linux symlink behavior for:

- `sites/assets/frappe`
- `sites/assets/erpnext`

Those entries were replaced with real copied asset directories from the backend container.

### Why the frontend mount is required

File:
- [docker-compose.yml](C:\laragon\www\cityos\dakkah-cityos-erpnext\docker-compose.yml)

Important mount:

- `./sites/assets:/usr/share/nginx/html/assets:ro`

Reason:

- the ERPNext Nginx image serves `/assets` from `/usr/share/nginx/html/assets`
- mounting only `sites` is not enough for the frontend to serve CSS and JS correctly

## Reverse Proxy Setup

Files:
- [docker-compose.yml](C:\laragon\www\cityos\reverse-proxy\docker-compose.yml)
- [erpnext.yml](C:\laragon\www\cityos\reverse-proxy\dynamic\erpnext.yml)

Reverse proxy changes:

- Docker auto-expose disabled in Traefik
- file provider enabled
- static route added for `erp.cityos.local`
- ERPNext traffic routed to `http://frontend:8080`

Reason:

- Traefik’s Docker provider is unreliable on this host
- file-based routing is the stable workaround

## Files Added or Modified

ERPNext project:

- [docker-compose.yml](C:\laragon\www\cityos\dakkah-cityos-erpnext\docker-compose.yml)
- [`.env`](C:\laragon\www\cityos\dakkah-cityos-erpnext\.env)
- [common_site_config.json](C:\laragon\www\cityos\dakkah-cityos-erpnext\sites\common_site_config.json)
- [apps.txt](C:\laragon\www\cityos\dakkah-cityos-erpnext\sites\apps.txt)
- [site_config.json](C:\laragon\www\cityos\dakkah-cityos-erpnext\sites\erp.cityos.local\site_config.json)
- [currentsite.txt](C:\laragon\www\cityos\dakkah-cityos-erpnext\sites\currentsite.txt)
- [logs/.gitkeep](C:\laragon\www\cityos\dakkah-cityos-erpnext\sites\erp.cityos.local\logs\.gitkeep)
- `sites/assets/frappe` converted to a real asset directory
- `sites/assets/erpnext` converted to a real asset directory

Reverse proxy project:

- [docker-compose.yml](C:\laragon\www\cityos\reverse-proxy\docker-compose.yml)
- [erpnext.yml](C:\laragon\www\cityos\reverse-proxy\dynamic\erpnext.yml)
