<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

echo "=== Fleetbase Database Reset ===\n\n";

echo "Step 1: Wiping database...\n";
DB::statement('DROP SCHEMA public CASCADE');
DB::statement('CREATE SCHEMA public');
DB::statement('GRANT ALL ON SCHEMA public TO PUBLIC');
echo "  Schema wiped\n\n";

echo "Step 2: Running migrations (via PgBouncer)...\n";
$exitCode = Artisan::call('migrate', ['--force' => true, '--no-interaction' => true]);
echo Artisan::output();
if ($exitCode !== 0) {
    echo "ERROR: Migrations failed with exit code {$exitCode}\n";
    exit(1);
}
echo "\n";

echo "Step 3: Running seeders (via direct connection)...\n";
config(['database.default' => 'pgsql_direct']);
DB::purge('pgsql_direct');
$exitCode = Artisan::call('db:seed', ['--force' => true, '--no-interaction' => true]);
echo Artisan::output();
if ($exitCode !== 0) {
    echo "ERROR: Seeders failed with exit code {$exitCode}\n";
    exit(1);
}

echo "\n=== Database reset complete ===\n";
echo "Admin: " . (getenv('DAKKAH_ADMIN_EMAIL') ?: 'admin@dakkah.io') . "\n";
echo "Pass:  " . (getenv('DAKKAH_ADMIN_PASSWORD') ?: 'Dakkah@2026!') . "\n";
