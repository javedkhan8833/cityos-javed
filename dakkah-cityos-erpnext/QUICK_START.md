# ERPNext Quick Start

## Important Startup Note

Do not rely on `latest` image pulls during normal daily starts.

Current compose behavior is set to reuse local images unless they are missing. This avoids unexpected UI breakage caused by new ERPNext asset hashes after an automatic image update.

Use normal startup for daily work:

```powershell
cd C:\laragon\www\cityos\reverse-proxy
docker compose up -d

cd C:\laragon\www\cityos\dakkah-cityos-erpnext
docker compose up -d
```

Only pull newer ERPNext images when you intentionally want to update:

```powershell
docker pull frappe/erpnext:latest
docker pull frappe/erpnext-nginx:latest
```

After a manual image update, if the UI looks broken or unstyled, the mounted `sites/assets` directories may need to be refreshed from the running backend container.

## Start Everything

Start reverse proxy:

```powershell
cd C:\laragon\www\cityos\reverse-proxy
docker compose up -d
```

Start ERPNext:

```powershell
cd C:\laragon\www\cityos\dakkah-cityos-erpnext
docker compose up -d
```

Open:

- `http://erp.cityos.local/`

## Manual Update Flow

If you intentionally want to update ERPNext images:

```powershell
docker pull frappe/erpnext:latest
docker pull frappe/erpnext-nginx:latest

cd C:\laragon\www\cityos\reverse-proxy
docker compose up -d

cd C:\laragon\www\cityos\dakkah-cityos-erpnext
docker compose up -d
```

If the design breaks after an update, refresh the asset directories:

```powershell
Remove-Item -Recurse -Force C:\laragon\www\cityos\dakkah-cityos-erpnext\sites\assets\frappe
Remove-Item -Recurse -Force C:\laragon\www\cityos\dakkah-cityos-erpnext\sites\assets\erpnext
docker cp erpnext-app:/home/frappe/frappe-bench/apps/frappe/frappe/public C:\laragon\www\cityos\dakkah-cityos-erpnext\sites\assets\frappe
docker cp erpnext-app:/home/frappe/frappe-bench/apps/erpnext/erpnext/public C:\laragon\www\cityos\dakkah-cityos-erpnext\sites\assets\erpnext
```

## Stop Everything

Stop ERPNext:

```powershell
cd C:\laragon\www\cityos\dakkah-cityos-erpnext
docker compose down
```

Stop reverse proxy:

```powershell
cd C:\laragon\www\cityos\reverse-proxy
docker compose down
```

## Restart ERPNext App Layer

```powershell
cd C:\laragon\www\cityos\dakkah-cityos-erpnext
docker compose restart frontend backend websocket scheduler queue-short queue-long
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

## View Logs

ERPNext:

```powershell
cd C:\laragon\www\cityos\dakkah-cityos-erpnext
docker compose logs --tail 100 backend
docker compose logs --tail 100 frontend
docker compose logs --tail 100 configurator
```

Reverse proxy:

```powershell
cd C:\laragon\www\cityos\reverse-proxy
docker compose logs --tail 100 traefik
```

## Login

- Username: `Administrator`
- Password: `admin123`

## Password Reset

```powershell
docker exec erpnext-app bash -lc "cd /home/frappe/frappe-bench && bench --site erp.cityos.local set-admin-password NewStrongPass123"
```
