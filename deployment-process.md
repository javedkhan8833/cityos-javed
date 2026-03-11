# Deployment Process

## Scope

This document records the working deployment process used for the CityOS stack:

- `dakkah-cityos-erpnext`
- `dakkah-cityos-fleetbase`
- `dakkah-cityos-fleetops`
- `reverse-proxy`

It covers:

- local preparation
- ERPNext backup and VPS restore
- Hostinger VPS deployment
- temporary public access by IP and ports
- final DNS-based deployment plan

---

## 1. Current deployment model

### Local

Used for:

- development
- debugging
- configuration fixes
- backup creation

### VPS

Used for:

- production-like runtime
- public internet testing
- final DNS cutover

### Important distinction

Do **not** copy Docker containers from local to VPS.

Move only:

- source code via Git
- ERPNext backup files
- ERPNext database dump
- ERPNext `sites` data
- VPS-specific `.env` files

---

## 2. Local preparation

### 2.1 Verify local stack

Local services used:

- ERPNext
- Fleetbase
- FleetOps
- reverse proxy

### 2.2 ERPNext backup created locally

Backup artifacts:

- database backup
- site config backup
- public/private file backups
- full `sites` archive

Example generated files:

- `dakkah-cityos-erpnext/sites/erp.cityos.local/private/backups/20260310_113147-erp_cityos_local-database.sql.gz`
- `dakkah-cityos-erpnext/backups/erpnext-sites-20260310_113217.zip`

---

## 3. VPS layout

### 3.1 Project path

Current VPS project root:

- `~/srv/apps/cityos-javed`

### 3.2 Docker network

Required Docker network:

- `cityos-network`

Create if missing:

```bash
docker network create cityos-network || true
```

### 3.3 VPS public IPs

Current VPS IPs:

- IPv4: `72.62.29.11`
- IPv6: `2a02:4780:28:4c9::1`

---

## 4. ERPNext restore process on VPS

### 4.1 Upload backup files

Upload ERPNext backups from local machine to:

- `/opt/cityos-backups/erpnext/`

### 4.2 Restore `sites`

ERPNext project path on VPS:

- `~/srv/apps/cityos-javed/dakkah-cityos-erpnext`

Restore the uploaded `sites` archive there.

### 4.3 Start base services first

Start:

- `erp-db`
- `redis-cache`
- `redis-queue`
- `configurator`

### 4.4 Import database

Restore the ERPNext MariaDB dump into the database defined in:

- `sites/erp.cityos.local/site_config.json`

### 4.5 Start full ERPNext stack

Start:

- `backend`
- `frontend`
- `websocket`
- `queue-short`
- `queue-long`
- `scheduler`

### 4.6 Run migration

Run:

```bash
docker exec erpnext-app bash -lc "cd /home/frappe/frappe-bench && bench --site erp.cityos.local migrate && bench --site erp.cityos.local clear-cache"
```

---

## 5. VPS reverse proxy decision

### 5.1 Traefik was not used on VPS

Reason:

- host Nginx was already bound to `80` and `443`

Because of that, the deployment moved to the Nginx-based VPS setup instead of Traefik.

### 5.2 Nginx-based deployment files

Used files:

- `dakkah-cityos-erpnext/docker-compose.nginx-vps.yml`
- `dakkah-cityos-fleetbase/docker-compose.nginx-vps.yml`
- `dakkah-cityos-fleetops/docker-compose.nginx-vps.yml`
- `deploy/hostinger/nginx/cityos-mvplab.sa.conf`

---

## 6. Nginx-based VPS startup

### 6.1 ERPNext

```bash
cd ~/srv/apps/cityos-javed/dakkah-cityos-erpnext
docker compose --env-file .env -f docker-compose.nginx-vps.yml up -d
```

### 6.2 Fleetbase

```bash
cd ~/srv/apps/cityos-javed/dakkah-cityos-fleetbase
docker compose --env-file .env -f docker-compose.nginx-vps.yml up -d
```

### 6.3 FleetOps

```bash
cd ~/srv/apps/cityos-javed/dakkah-cityos-fleetops
docker compose --env-file .env -f docker-compose.nginx-vps.yml up -d
```

### 6.4 Nginx site config

Copy:

- `deploy/hostinger/nginx/cityos-mvplab.sa.conf`

To:

- `/etc/nginx/sites-available/cityos-mvplab.sa`

Enable it and reload Nginx.

---

## 7. Temporary public access without public DNS

Because public DNS for `mvplab.sa` subdomains was not available, temporary access was opened using the VPS public IP and custom ports.

### 7.1 Temporary public URLs

- ERPNext: `http://72.62.29.11:18080`
- Fleetbase backend: `http://72.62.29.11:18000`
- FleetOps: `http://72.62.29.11:15000`

### 7.2 Temporary browser host mapping

For testing by hostname before public DNS exists, add these entries to the Windows `hosts` file:

```text
72.62.29.11 erpnext.mvplab.sa
72.62.29.11 fleetbase.mvplab.sa
72.62.29.11 fleetops.mvplab.sa
```

Then use:

- `http://erpnext.mvplab.sa/`
- `http://fleetbase.mvplab.sa/`
- `http://fleetops.mvplab.sa/`

This works only on machines where the `hosts` file is edited.

---

## 8. ERPNext asset issue and resolution

### 8.1 Problem

ERPNext initially loaded with:

- broken styling on login page
- blank `/desk` page after login

### 8.2 Root cause

The backend-generated asset hashes and the frontend-served asset files did not match.

This happened because:

- ERPNext runtime referenced one set of bundle hashes
- Nginx served another set from `sites/assets`

### 8.3 Resolution

The fix was to ensure the `frontend` container actually mounted and served the correct `sites/assets` tree, then copy the required runtime asset files into the served asset tree so Nginx could resolve the requested hashes.

### 8.4 Important note

Using floating `latest` images is risky for ERPNext because asset hashes can change between builds.

Recommended long-term improvement:

- pin ERPNext images to explicit versions instead of `latest`

---

## 9. Fleetbase backend-only note

Fleetbase UI is optional.

For backend/API testing, the current public temporary endpoint is:

- `http://72.62.29.11:18000`

Internal-only routes:

- Docker network: `http://fleetbase-api:8000`
- VPS localhost: `http://127.0.0.1:18000`

These are not valid from a normal external browser unless exposed publicly.

---

## 10. Credentials used during testing

### ERPNext

- Username: `Administrator`
- Password: `admin123`

### Fleetbase Console

- Email: `admin@dakkah.io`
- Password: `Dakkah@2026!`

These are working/test credentials and should be rotated before production use.

---

## 11. Final DNS-based production target

Planned public domains:

- `erpnext.mvplab.sa`
- `fleetbase.mvplab.sa`
- `fleetops.mvplab.sa`

Required DNS records:

### A records

- `erpnext` → `72.62.29.11`
- `fleetbase` → `72.62.29.11`
- `fleetops` → `72.62.29.11`

### Optional AAAA records

- `erpnext` → `2a02:4780:28:4c9::1`
- `fleetbase` → `2a02:4780:28:4c9::1`
- `fleetops` → `2a02:4780:28:4c9::1`

After DNS propagation:

```bash
certbot --nginx -d erpnext.mvplab.sa -d fleetbase.mvplab.sa -d fleetops.mvplab.sa
```

---

## 12. Git and runtime file handling

### Problem seen on VPS

`git pull` was blocked repeatedly by runtime-generated ERPNext files such as:

- `logs/*`
- `sites/*/logs/*`
- `sites/assets/*`
- runtime site files

### Current fix

Runtime paths were added to ignore rules so deployment pulls do not keep breaking.

Relevant files:

- `.gitignore`
- `dakkah-cityos-erpnext/.gitignore`

### Recommendation

Do not commit:

- real `.env` files
- logs
- generated asset trees
- runtime site state

---

## 13. Recommended next improvements

1. Configure public DNS for `mvplab.sa` subdomains
2. Move users from IP+port testing to real hostnames
3. Issue Let's Encrypt certificates through Nginx
4. Pin ERPNext image versions instead of `latest`
5. Remove temporary public custom ports once DNS and HTTPS are live
6. Rotate all temporary or exposed credentials

---

## 14. Current working temporary endpoints

- ERPNext:
  - `http://72.62.29.11:18080`
  - `http://erpnext.mvplab.sa/` only on machines with local `hosts` entry

- Fleetbase backend:
  - `http://72.62.29.11:18000`
  - `http://fleetbase.mvplab.sa/` only on machines with local `hosts` entry or public DNS

- FleetOps:
  - `http://72.62.29.11:15000`
  - `http://fleetops.mvplab.sa/` only on machines with local `hosts` entry or public DNS
