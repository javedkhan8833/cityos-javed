# Hostinger VPS Setup With Existing Nginx

## Use This Mode

Use this setup if the VPS already has Nginx serving other sites on ports `80` and `443`.

Do not start Traefik in this mode.

## Public Domains

- `erpnext.mvplab.sa`
- `fleetbase.mvplab.sa`
- `fleetops.mvplab.sa`

## App Compose Files

Use these compose files instead of the Traefik-based Hostinger files:

- `dakkah-cityos-erpnext/docker-compose.nginx-vps.yml`
- `dakkah-cityos-fleetbase/docker-compose.nginx-vps.yml`
- `dakkah-cityos-fleetops/docker-compose.nginx-vps.yml`

These publish app services on localhost-only ports:

- ERPNext frontend → `127.0.0.1:18080`
- Fleetbase console → `127.0.0.1:14200`
- Fleetbase httpd → `127.0.0.1:18000`
- FleetOps → `127.0.0.1:15000`

## Start Order

```bash
cd ~/srv/apps/cityos-javed/dakkah-cityos-fleetbase
docker compose --env-file .env -f docker-compose.nginx-vps.yml up -d

cd ~/srv/apps/cityos-javed/dakkah-cityos-fleetops
docker compose --env-file .env -f docker-compose.nginx-vps.yml up -d

cd ~/srv/apps/cityos-javed/dakkah-cityos-erpnext
docker compose --env-file .env -f docker-compose.nginx-vps.yml up -d
```

## Nginx Site Config

Copy `deploy/hostinger/nginx/cityos-mvplab.sa.conf` to:

```bash
/etc/nginx/sites-available/cityos-mvplab.sa
```

Enable it:

```bash
ln -s /etc/nginx/sites-available/cityos-mvplab.sa /etc/nginx/sites-enabled/cityos-mvplab.sa
nginx -t
systemctl reload nginx
```

## SSL

After DNS for all three subdomains points to the VPS, issue certificates with Certbot:

```bash
certbot --nginx -d erpnext.mvplab.sa -d fleetbase.mvplab.sa -d fleetops.mvplab.sa
```

## DNS

Create public DNS records pointing to the VPS.

- `A` record for each subdomain to the VPS IPv4
- `AAAA` record for each subdomain to the VPS IPv6 if you want IPv6 access

## Verification

From the VPS:

```bash
curl -I http://127.0.0.1:18080
curl -I http://127.0.0.1:14200
curl -I http://127.0.0.1:15000
```

Then verify public routing:

```bash
curl -I http://erpnext.mvplab.sa
curl -I http://fleetbase.mvplab.sa
curl -I http://fleetops.mvplab.sa
```
