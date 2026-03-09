# Hostinger VPS Deployment

## Goal

This deployment bundle keeps the current local Docker setup intact and adds a separate production path for a Hostinger VPS.

## Domains

Use real public domains on the VPS:

- `ERP_DOMAIN` → public ERPNext URL, `erpnext.mvplab.sa`
- `FLEET_DOMAIN` → public Fleetbase console URL, `fleetbase.mvplab.sa`
- `FLEETOPS_DOMAIN` → public FleetOps URL, `fleetops.mvplab.sa`

Important: `ERPNEXT_SITE_NAME` does not have to match `ERP_DOMAIN`. If you are migrating the existing site, keep `ERPNEXT_SITE_NAME` as the current Frappe site folder name and route the public host through Traefik.

## Files To Configure

Copy these example files on the VPS and fill in real values:

- `reverse-proxy/.env.hostinger.example` → `reverse-proxy/.env.hostinger`
- `dakkah-cityos-fleetbase/.env.hostinger.example` → `dakkah-cityos-fleetbase/.env.hostinger`
- `dakkah-cityos-fleetbase/api/.env.hostinger.example` → `dakkah-cityos-fleetbase/api/.env`
- `dakkah-cityos-fleetops/.env.hostinger.example` → `dakkah-cityos-fleetops/.env`
- `dakkah-cityos-erpnext/.env.hostinger.example` → `dakkah-cityos-erpnext/.env.hostinger`

## DNS

Point your public DNS records to the VPS IP:

- `erpnext.mvplab.sa`
- `fleetbase.mvplab.sa`
- `fleetops.mvplab.sa`

Only expose ports `22`, `80`, and `443` on the VPS firewall.

## One-Time VPS Setup

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl ca-certificates
sudo docker network create cityos-network
```

Create the Let’s Encrypt storage file before starting Traefik:

```bash
mkdir -p reverse-proxy/letsencrypt
touch reverse-proxy/letsencrypt/acme.json
chmod 600 reverse-proxy/letsencrypt/acme.json
```

## Start Order

Run each stack with its Hostinger compose file:

```bash
cd reverse-proxy
docker compose --env-file .env.hostinger -f docker-compose.hostinger.yml up -d

cd ../dakkah-cityos-fleetbase
docker compose --env-file .env.hostinger -f docker-compose.hostinger.yml up -d

cd ../dakkah-cityos-fleetops
docker compose --env-file .env -f docker-compose.hostinger.yml up -d

cd ../dakkah-cityos-erpnext
docker compose --env-file .env.hostinger -f docker-compose.hostinger.yml up -d
```

## ERPNext Migration

ERPNext needs both database and site files migrated.

- Site files live in `dakkah-cityos-erpnext/sites`
- MariaDB data lives in the `erp_db_data` Docker volume

Recommended path:

1. Back up the current ERPNext site and files from the local environment.
2. Copy `dakkah-cityos-erpnext/sites` to the VPS.
3. Restore the MariaDB dump into the VPS ERP database.
4. Keep `ERPNEXT_SITE_NAME` set to the existing site name in `dakkah-cityos-erpnext/.env.hostinger`.

## Notes

- Production traffic goes only through Traefik on `80` and `443`.
- The Hostinger compose files intentionally remove direct public exposure of Fleetbase, FleetOps, and ERPNext internal services.
- Fleetbase and FleetOps currently depend on Neon PostgreSQL. That database does not need Docker-volume migration unless you move it onto the VPS later.
