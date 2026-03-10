import frappe
import os
import sys

os.chdir(os.environ.get('SITES_PATH', '/home/runner/workspace/sites'))
frappe.init(site='site1.local')
frappe.connect()

doctypes = frappe.db.sql(
    'SELECT name FROM "tabDocType" WHERE ifnull(issingle, 0) = 0',
    as_dict=True
)
existing = set(
    r[0] for r in frappe.db.sql(
        "SELECT tablename FROM pg_tables WHERE schemaname='public'"
    )
)
missing = [dt['name'] for dt in doctypes if 'tab' + dt['name'] not in existing]

if not missing:
    print("All tables present, no recreation needed")
    sys.exit(0)

print(f"Recreating {len(missing)} missing tables...")

for attempt in range(3):
    created = 0
    still_missing = []
    for dt_name in missing:
        try:
            frappe.db.updatedb(dt_name)
            frappe.db.commit()
            created += 1
        except Exception:
            frappe.db.rollback()
            still_missing.append(dt_name)
    print(f"  Pass {attempt+1}: created {created}, remaining {len(still_missing)}")
    if not still_missing:
        break
    missing = still_missing

after = frappe.db.sql(
    "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'"
)[0][0]
print(f"Total tables: {after}")
print("Table recreation complete")
