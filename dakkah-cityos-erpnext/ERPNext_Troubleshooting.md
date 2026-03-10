# ERPNext Troubleshooting

## 1. `erp.cityos.local` shows `Not Found`

Symptom:

- Browser returns `Not Found`
- Frappe message says `erp.cityos.local does not exist`

Likely cause:

- requested host does not match a configured site
- `default_site` or site directory is incorrect

Check:

```powershell
Get-Content C:\laragon\www\cityos\dakkah-cityos-erpnext\sites\common_site_config.json
Get-Content C:\laragon\www\cityos\dakkah-cityos-erpnext\sites\currentsite.txt
Get-ChildItem C:\laragon\www\cityos\dakkah-cityos-erpnext\sites
```

Expected:

- `default_site` is `erp.cityos.local`
- `currentsite.txt` contains `erp.cityos.local`
- site folder `sites\erp.cityos.local` exists

## 2. Bench or startup uses Redis `127.0.0.1:11311`

Symptom:

- stack traces mention `redis.exceptions.ConnectionError`
- host is `127.0.0.1`
- port is something like `11311`

Likely cause:

- bad bench config
- fallback to old localhost Redis settings

Fix:

Check and correct:

- [common_site_config.json](C:\laragon\www\cityos\dakkah-cityos-erpnext\sites\common_site_config.json)
- [`.env`](C:\laragon\www\cityos\dakkah-cityos-erpnext\.env)

Expected Redis values:

- `redis://redis-cache:6379`
- `redis://redis-queue:6379`

## 3. Login page loads without styling

Symptom:

- page HTML loads
- CSS/JS under `/assets/...` return `404`
- layout looks broken or plain

Likely causes:

1. `sites/assets/frappe` and `sites/assets/erpnext` are broken placeholder files
2. `frontend` is not mounting `./sites/assets` into `/usr/share/nginx/html/assets`

Checks:

```powershell
Get-Item C:\laragon\www\cityos\dakkah-cityos-erpnext\sites\assets\frappe
Get-Item C:\laragon\www\cityos\dakkah-cityos-erpnext\sites\assets\erpnext
```

They should be directories in this Windows setup, not plain text files.

Recovery:

```powershell
Remove-Item -Force C:\laragon\www\cityos\dakkah-cityos-erpnext\sites\assets\frappe
Remove-Item -Force C:\laragon\www\cityos\dakkah-cityos-erpnext\sites\assets\erpnext
docker cp erpnext-app:/home/frappe/frappe-bench/apps/frappe/frappe/public C:\laragon\www\cityos\dakkah-cityos-erpnext\sites\assets\frappe
docker cp erpnext-app:/home/frappe/frappe-bench/apps/erpnext/erpnext/public C:\laragon\www\cityos\dakkah-cityos-erpnext\sites\assets\erpnext
```

## 4. Frontend returns `502 Bad Gateway`

Symptom:

- browser shows `502`
- `frontend` logs mention `upstream prematurely closed connection`

Likely cause:

- backend crashed before responding

Common backend cause found in this setup:

- missing site log directory:
  - `C:\laragon\www\cityos\dakkah-cityos-erpnext\sites\erp.cityos.local\logs`

Check backend logs:

```powershell
cd C:\laragon\www\cityos\dakkah-cityos-erpnext
docker compose logs --tail 100 backend
```

Fix:

- ensure `sites\erp.cityos.local\logs` exists
- restart backend and frontend

```powershell
cd C:\laragon\www\cityos\dakkah-cityos-erpnext
docker compose restart backend frontend
```

## 5. Traefik returns plain `404 page not found`

Symptom:

- `http://erp.cityos.local/` returns a plain Traefik `404`

Likely cause:

- Traefik Docker provider failed to discover services

Current solution:

- keep the file-based route in:
  - [erpnext.yml](C:\laragon\www\cityos\reverse-proxy\dynamic\erpnext.yml)

Check Traefik:

```powershell
cd C:\laragon\www\cityos\reverse-proxy
docker compose logs --tail 100 traefik
```

If necessary, recreate Traefik:

```powershell
cd C:\laragon\www\cityos\reverse-proxy
docker compose up -d
```

## 6. Old `erpnext-app` container blocks startup

Symptom:

- compose reports container name conflict for `/erpnext-app`

Cause:

- stale old standalone container still exists

Fix:

```powershell
docker rm -f erpnext-app

cd C:\laragon\www\cityos\dakkah-cityos-erpnext
docker compose down --remove-orphans
docker compose up -d
```

## 7. Docker commands hang or behave inconsistently

Symptom:

- `docker rm`, `docker kill`, or `docker compose` hang
- multiple stale `docker-compose.exe` processes appear

Cause:

- Docker Desktop or the Linux engine is in a bad state

Recovery:

1. Quit Docker Desktop fully
2. Start Docker Desktop again
3. Wait until the engine is healthy
4. Retry the ERPNext commands

If Docker still does not recover, reboot Windows.

## 8. `configurator` exits with an error

Symptom:

- `docker compose up -d` stops because `configurator` failed

Check:

```powershell
cd C:\laragon\www\cityos\dakkah-cityos-erpnext
docker compose logs --tail 100 configurator
```

Known issue already fixed:

- `bench set-config` rejected lowercase `true`
- this was corrected by setting `serve_default_site` to `1`

## 9. Site password is unknown

Reset admin password:

```powershell
docker exec erpnext-app bash -lc "cd /home/frappe/frappe-bench && bench --site erp.cityos.local set-admin-password NewStrongPass123"
```

## 10. Traefik Docker provider remains unreliable

Symptom:

- Traefik logs repeated errors:
  - `Failed to retrieve information of the docker client and server host`

Mitigation:

- keep using the file-based route
- do not depend on Docker label discovery alone in this environment
