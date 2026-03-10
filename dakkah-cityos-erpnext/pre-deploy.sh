#!/bin/bash

LOGFILE="/home/runner/workspace/pre-deploy.log"
: > "$LOGFILE"
exec > >(tee -a "$LOGFILE") 2>&1

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

export FRAPPE_BENCH_ROOT=/home/runner/workspace
export SITES_PATH=$FRAPPE_BENCH_ROOT/sites
export PYTHONPATH=$FRAPPE_BENCH_ROOT/apps/frappe:$FRAPPE_BENCH_ROOT:$FRAPPE_BENCH_ROOT/apps/cityos:$FRAPPE_BENCH_ROOT/apps/erpnext:$PYTHONPATH

log "=== Pre-Deploy: Drop empty tables to reduce database copy time ==="
log "Tables will be recreated automatically when the app starts."

cd $SITES_PATH

log "Phase 1: Dropping empty tables..."
python3 << 'PYEOF'
import frappe
frappe.init(site='site1.local')
frappe.connect()

frappe.db.sql('ANALYZE')
frappe.db.commit()

before = frappe.db.sql("SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")[0][0]
print(f"Tables before: {before}")

result = frappe.db.sql("""
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.reltuples = 0
    ORDER BY c.relname
""")

empty_tables = [r[0] for r in result]
dropped = 0
skipped = 0

for tbl in empty_tables:
    try:
        frappe.db.sql(f'DROP TABLE IF EXISTS "{tbl}" CASCADE')
        dropped += 1
    except Exception as e:
        skipped += 1
        print(f"  Skip {tbl}: {e}")

frappe.db.commit()

after = frappe.db.sql("SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")[0][0]
idx_count = frappe.db.sql("SELECT count(*) FROM pg_indexes WHERE schemaname='public'")[0][0]

print(f"Dropped {dropped} empty tables, skipped {skipped}")
print(f"Tables after: {after}")
print(f"Indexes after: {idx_count}")
print(f"Total objects for copy: {after + idx_count}")
PYEOF

EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
    log "ERROR: Pre-deploy script failed with exit code $EXIT_CODE"
    exit 1
fi

log ""
log "=== Pre-deploy complete ==="
log "Now click Publish in the Replit UI."
log "Tables will be recreated automatically when the app starts."
log "To restore tables in dev, just restart the workflow."
