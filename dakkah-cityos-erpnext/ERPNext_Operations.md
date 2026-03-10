# ERPNext Operations

## Start Services

Reverse proxy:

```powershell
cd C:\laragon\www\cityos\reverse-proxy
docker compose up -d
```

ERPNext:

```powershell
cd C:\laragon\www\cityos\dakkah-cityos-erpnext
docker compose up -d
```

## Stop Services

```powershell
cd C:\laragon\www\cityos\dakkah-cityos-erpnext
docker compose down

cd C:\laragon\www\cityos\reverse-proxy
docker compose down
```

## Restart Common Services

Restart ERPNext frontend and backend:

```powershell
cd C:\laragon\www\cityos\dakkah-cityos-erpnext
docker compose restart frontend backend
```

Restart reverse proxy:

```powershell
cd C:\laragon\www\cityos\reverse-proxy
docker compose restart traefik
```

## Check Status

ERPNext:

```powershell
cd C:\laragon\www\cityos\dakkah-cityos-erpnext
docker compose ps
```

Reverse proxy:

```powershell
cd C:\laragon\www\cityos\reverse-proxy
docker compose ps
```

Expected ERPNext services:

- `backend`
- `frontend`
- `websocket`
- `scheduler`
- `queue-short`
- `queue-long`
- `erp-db`
- `redis-cache`
- `redis-queue`

Expected one-shot service:

- `configurator` should complete successfully and exit

## View Logs

ERPNext:

```powershell
cd C:\laragon\www\cityos\dakkah-cityos-erpnext
docker compose logs --tail 100 backend
docker compose logs --tail 100 frontend
docker compose logs --tail 100 scheduler
docker compose logs --tail 100 queue-short
docker compose logs --tail 100 queue-long
docker compose logs --tail 100 websocket
docker compose logs --tail 100 configurator
```

Reverse proxy:

```powershell
cd C:\laragon\www\cityos\reverse-proxy
docker compose logs --tail 100 traefik
```

## Access URLs

- ERPNext: `http://erp.cityos.local/`
- Traefik dashboard: `http://localhost:8080/`

## Admin Password Reset

Reset the ERPNext Administrator password:

```powershell
docker exec erpnext-app bash -lc "cd /home/frappe/frappe-bench && bench --site erp.cityos.local set-admin-password NewStrongPass123"
```

Current known login:

- Username: `Administrator`
- Password: `admin123`

## Site Creation Command

The compose file includes an optional `create-site` profile for creating a site from scratch:

```powershell
cd C:\laragon\www\cityos\dakkah-cityos-erpnext
docker compose --profile setup up create-site
```

Use it only when building a new site, not during normal restarts of the current working site.

## Quick Validation Checklist

Run this after changes:

1. Open `http://erp.cityos.local/`
2. Confirm the login page loads
3. Confirm CSS and JS load under `/assets/...`
4. Run `docker compose ps` in ERPNext and reverse-proxy folders
5. Confirm `backend`, `frontend`, `websocket`, `scheduler`, `queue-short`, and `queue-long` are `Up`
6. Confirm Traefik is `Up`
