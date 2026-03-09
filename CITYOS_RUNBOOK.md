# CityOS Runbook

## Startup Order

### 1. Reverse Proxy
```powershell
cd C:\laragon\www\cityos\reverse-proxy
docker compose up -d
```

### 2. Fleetbase
```powershell
cd C:\laragon\www\cityos\dakkah-cityos-fleetbase
docker compose up -d
```

### 3. FleetOps
```powershell
cd C:\laragon\www\cityos\dakkah-cityos-fleetops
docker compose up -d
```

### 4. ERPNext
```powershell
cd C:\laragon\www\cityos\dakkah-cityos-erpnext
docker compose up -d
```

## Shutdown Order

### 1. ERPNext
```powershell
cd C:\laragon\www\cityos\dakkah-cityos-erpnext
docker compose down --remove-orphans
```

### 2. FleetOps
```powershell
cd C:\laragon\www\cityos\dakkah-cityos-fleetops
docker compose down
```

### 3. Fleetbase
```powershell
cd C:\laragon\www\cityos\dakkah-cityos-fleetbase
docker compose down
```

### 4. Reverse Proxy
```powershell
cd C:\laragon\www\cityos\reverse-proxy
docker compose down
```

## Status Checks

```powershell
docker ps
docker ps -a
```

## Main URLs

- ERPNext: `http://erp.cityos.local/`
- FleetOps: `http://localhost:5000/`
- Fleetbase Console: `http://localhost:4200/`

## Notes

- Start services in the listed order.
- Stop services in the reverse dependency order shown above.
- Use `docker compose down --remove-orphans` for ERPNext to clean up the old standalone `erpnext-app` if it appears again.
