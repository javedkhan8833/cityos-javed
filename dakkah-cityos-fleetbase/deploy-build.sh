#!/bin/bash
echo "=== Deployment Build Step ==="

cd /home/runner/workspace/api

echo "Step 1: Creating required storage directories..."
mkdir -p storage/logs storage/app/public storage/framework/{cache,sessions,testing,views}

echo "Step 2: Installing PHP dependencies..."
composer install --no-dev --optimize-autoloader --no-interaction 2>&1

echo "Step 3: Patching vendor migration bugs..."
# All Fleetbase migrations define ->unique() on the uuid column inline AND
# again via $table->unique(['uuid']). On Neon (PgBouncer + emulated prepares),
# both constraints run, causing "relation already exists" errors.
# Strip the inline ->unique() from uuid column definitions so only the
# explicit $table->unique(['uuid']) call creates the named constraint.
find vendor/fleetbase -name "*.php" -path "*/migrations/*" | while IFS= read -r f; do
  if grep -qF "unique(['uuid'])" "$f" 2>/dev/null; then
    perl -i -pe "
      if (/uuid.*->unique\(\)/ && !/unique\(\[.uuid.\]\)/) {
        s/->unique\(\)//g;
      }
    " "$f"
  fi
done
echo "Patched duplicate uuid unique constraints in vendor migrations"

# vehicle_devices.uuid needs a unique constraint so vehicle_device_events can
# create a foreign key referencing it. The original migration omits this.
VDEV_MIG="vendor/fleetbase/fleetops-api/server/migrations/2023_09_14_074619_create_vehicle_devices_table.php"
if [ -f "$VDEV_MIG" ] && ! grep -qF "unique(['uuid'])" "$VDEV_MIG" 2>/dev/null; then
  sed -i "s/->char('uuid', 36)->nullable();/->char('uuid', 36)->nullable();\n            \$table->unique(['uuid']);/" "$VDEV_MIG" 2>/dev/null || true
  echo "Patched vehicle_devices missing uuid unique constraint"
fi

# Fix performance indexes migration: it uses deprecated Doctrine indexExists()
# and declares `public bool $withinTransaction` (rejected by PHP when parent has no type).
PERF_MIG="vendor/fleetbase/fleetops-api/server/migrations/2025_12_16_000003_add_performance_indexes_to_fleetops_core_tables.php"
if [ -f "$PERF_MIG" ] && grep -q "getDoctrineSchemaManager\|public bool \$withinTransaction" "$PERF_MIG" 2>/dev/null; then
  cat > "$PERF_MIG" << 'MIGRATION_EOF'
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
return new class extends Migration {
    public $withinTransaction = false;
    public function up(): void
    {
        $indexes = [
            ['orders',['company_uuid','driver_assigned_uuid','status'],'orders_company_driver_status_idx'],
            ['orders',['company_uuid','created_at'],'orders_company_created_idx'],
            ['orders',['company_uuid','scheduled_at'],'orders_company_scheduled_idx'],
            ['orders',['company_uuid','dispatched','dispatched_at'],'orders_company_dispatched_idx'],
            ['orders',['payload_uuid'],'orders_payload_uuid_idx'],
            ['orders',['tracking_number_uuid'],'orders_tracking_number_uuid_idx'],
            ['orders',['vehicle_assigned_uuid'],'orders_vehicle_assigned_uuid_idx'],
            ['payloads',['company_uuid','created_at'],'payloads_company_created_idx'],
            ['payloads',['pickup_uuid'],'payloads_pickup_uuid_idx'],
            ['payloads',['dropoff_uuid'],'payloads_dropoff_uuid_idx'],
            ['payloads',['return_uuid'],'payloads_return_uuid_idx'],
            ['waypoints',['payload_uuid','created_at'],'waypoints_payload_created_idx'],
            ['waypoints',['company_uuid','created_at'],'waypoints_company_created_idx'],
            ['waypoints',['place_uuid'],'waypoints_place_uuid_idx'],
            ['entities',['payload_uuid','created_at'],'entities_payload_created_idx'],
            ['entities',['company_uuid','created_at'],'entities_company_created_idx'],
            ['entities',['destination_uuid'],'entities_destination_uuid_idx'],
            ['places',['company_uuid','created_at'],'places_company_created_idx'],
            ['places',['owner_uuid','owner_type'],'places_owner_idx'],
            ['drivers',['company_uuid','status','online'],'drivers_company_status_online_idx'],
            ['drivers',['company_uuid','created_at'],'drivers_company_created_idx'],
            ['drivers',['user_uuid'],'drivers_user_uuid_idx'],
            ['drivers',['vendor_uuid'],'drivers_vendor_uuid_idx'],
            ['vehicles',['company_uuid','status','online'],'vehicles_company_status_online_idx'],
            ['vehicles',['company_uuid','created_at'],'vehicles_company_created_idx'],
            ['vehicles',['vendor_uuid'],'vehicles_vendor_uuid_idx'],
            ['vendors',['company_uuid','status'],'vendors_company_status_idx'],
            ['contacts',['company_uuid','created_at'],'contacts_company_created_idx'],
            ['contacts',['company_uuid','type'],'contacts_company_type_idx'],
            ['routes',['company_uuid','created_at'],'routes_company_created_idx'],
            ['tracking_numbers',['company_uuid','created_at'],'tracking_numbers_company_created_idx'],
            ['tracking_numbers',['tracking_number'],'tracking_numbers_tracking_number_idx'],
            ['tracking_numbers',['owner_uuid','owner_type'],'tracking_numbers_owner_idx'],
            ['tracking_statuses',['tracking_number_uuid','created_at'],'tracking_statuses_tracking_created_idx'],
            ['tracking_statuses',['company_uuid','created_at'],'tracking_statuses_company_created_idx'],
        ];
        foreach ($indexes as [$table,$columns,$name]) {
            $exists = DB::selectOne("SELECT 1 FROM pg_indexes WHERE indexname = ?",[$name]);
            if (!$exists) {
                try { $cols=implode(',',$columns); DB::statement("CREATE INDEX IF NOT EXISTS \"{$name}\" ON \"{$table}\" ({$cols})"); } catch(\Throwable $e) {}
            }
        }
    }
    public function down(): void {}
};
MIGRATION_EOF
  echo "Patched performance indexes migration (removed deprecated Doctrine + fixed type)"
fi

PAT_MIG="vendor/fleetbase/core-api/migrations/2023_04_25_094311_fix_personal_access_tokens.php"
if [ -f "$PAT_MIG" ]; then
  cat > "$PAT_MIG" << 'PAT_EOF'
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
return new class extends Migration {
    public function up()
    {
        if (config('database.default') === config('fleetbase.connection.sandbox')) {
            return;
        }
        DB::statement("ALTER TABLE personal_access_tokens ALTER COLUMN tokenable_id TYPE varchar(255) USING tokenable_id::varchar");
    }
    public function down()
    {
        if (config('database.default') === config('fleetbase.connection.sandbox')) {
            return;
        }
        DB::table('personal_access_tokens')->truncate();
        DB::statement("ALTER TABLE personal_access_tokens ALTER COLUMN tokenable_id TYPE bigint USING tokenable_id::bigint");
    }
};
PAT_EOF
  echo "Patched fix_personal_access_tokens migration (raw SQL instead of Doctrine change())"
fi

echo "Step 4: Caching views..."
php artisan view:cache 2>&1 || true

echo "=== Build complete ==="
