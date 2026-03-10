#!/bin/bash
echo "=== Production Startup ==="

cd /home/runner/workspace/api

mkdir -p storage/logs storage/app/public storage/framework/{cache,sessions,testing,views}

php artisan config:clear 2>&1 || true
php artisan route:clear 2>&1 || true
php artisan view:clear 2>&1 || true

(
    sleep 10
    echo "[deploy-run] Background database sync starting..."

    MIGRATION_COUNT=$(php artisan tinker --no-interaction --execute="echo DB::table('migrations')->count();" 2>/dev/null | grep -oE '^[0-9]+')

    if [ -z "$MIGRATION_COUNT" ] || [ "$MIGRATION_COUNT" -lt 5 ]; then
        echo "[deploy-run] Fresh database detected ($MIGRATION_COUNT migrations). Running full migrate + seed..."
        php -d memory_limit=1024M -d max_execution_time=0 artisan migrate --force --no-interaction 2>&1 || echo "[deploy-run] WARNING: Migrations failed but server stays up"
        config_default='pgsql_direct'
        php -d memory_limit=1024M -d max_execution_time=0 artisan tinker --no-interaction --execute="
            config(['database.default' => 'pgsql_direct']);
            DB::purge('pgsql_direct');
            Artisan::call('db:seed', ['--force' => true, '--no-interaction' => true]);
            echo Artisan::output();
        " 2>&1 || echo "[deploy-run] WARNING: Seeders failed but server stays up"
    else
        echo "[deploy-run] Database has $MIGRATION_COUNT migrations. Running safe incremental migrate..."
        php -d memory_limit=1024M artisan migrate --force --no-interaction 2>&1 || echo "[deploy-run] WARNING: Incremental migrations failed"
    fi

    echo "[deploy-run] Background database sync complete."
) &

echo "Starting PHP server on 0.0.0.0:5000..."
exec php -d memory_limit=1024M -S 0.0.0.0:5000 -t public server.php
