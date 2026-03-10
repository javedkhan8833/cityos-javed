<?php

namespace Fleetbase\CityOS\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Fleetbase\CityOS\Models\Tenant;

class BackfillNodeContextCommand extends Command
{
    protected $signature = 'cityos:backfill-node-context
        {--dry-run : Show what would be updated without making changes}
        {--company= : Backfill for a specific company UUID}
        {--tenant= : Backfill using a specific tenant handle or UUID (required when company has multiple tenants)}';

    protected $description = 'Backfill tenant_uuid, country_code, city_uuid, sector_uuid on all core operational tables from company→tenant mapping';

    protected array $tables = [
        'orders', 'drivers', 'vehicles', 'fleets', 'places', 'contacts',
        'service_areas', 'payloads',
        'pallet_inventories', 'pallet_stock_transactions', 'pallet_stock_adjustment',
        'pallet_purchase_orders', 'pallet_sales_orders', 'pallet_batches',
        'stores', 'products', 'checkouts', 'carts', 'catalogs',
    ];

    public function handle(): int
    {
        $dryRun = $this->option('dry-run');
        $companyFilter = $this->option('company');
        $tenantFilter = $this->option('tenant');

        $this->info($dryRun ? '=== DRY RUN ===' : '=== BACKFILL NODE CONTEXT ===');

        $tenantQuery = Tenant::with(['country', 'city', 'sector']);
        if ($tenantFilter) {
            $tenantQuery->where(function ($q) use ($tenantFilter) {
                $q->where('handle', $tenantFilter)->orWhere('uuid', $tenantFilter);
            });
        }
        $tenants = $tenantQuery->get();

        if ($tenants->isEmpty()) {
            $this->error('No CityOS tenants found. Cannot backfill.');
            return 1;
        }

        $companyTenantMap = [];
        foreach ($tenants as $tenant) {
            if (empty($tenant->company_uuid)) {
                continue;
            }
            $companyTenantMap[$tenant->company_uuid][] = $tenant;
        }

        if (empty($companyTenantMap)) {
            $this->error('No tenants have company_uuid set. Link tenants to companies first.');
            return 1;
        }

        foreach ($companyTenantMap as $companyUuid => $companyTenants) {
            if (count($companyTenants) > 1 && !$tenantFilter) {
                $tenantNames = array_map(fn ($t) => "{$t->name} ({$t->handle})", $companyTenants);
                $this->error("Company {$companyUuid} has multiple tenants: " . implode(', ', $tenantNames));
                $this->error('Use --tenant=<handle> to specify which tenant to backfill with.');
                return 1;
            }
        }

        $this->info('Company → Tenant mappings:');
        foreach ($companyTenantMap as $companyUuid => $companyTenants) {
            $tenant = $companyTenants[0];
            $this->line("  {$companyUuid} → {$tenant->name} ({$tenant->handle})");
            $this->line("    country: {$tenant->country?->code}, city: {$tenant->city_uuid}, sector: {$tenant->sector_uuid}");
        }

        $totalUpdated = 0;

        foreach ($this->tables as $table) {
            if (!Schema::hasTable($table)) {
                $this->warn("  Table '{$table}' does not exist, skipping.");
                continue;
            }

            $hasCompanyUuid = Schema::hasColumn($table, 'company_uuid');
            $hasTenantUuid = Schema::hasColumn($table, 'tenant_uuid');

            if (!$hasCompanyUuid || !$hasTenantUuid) {
                $this->warn("  Table '{$table}' missing required columns, skipping.");
                continue;
            }

            $query = DB::table($table)->whereNull('tenant_uuid');
            if ($companyFilter) {
                $query->where('company_uuid', $companyFilter);
            }

            $nullCount = $query->count();
            if ($nullCount === 0) {
                $this->line("  [{$table}] No records need backfilling.");
                continue;
            }

            $this->info("  [{$table}] {$nullCount} records to backfill...");

            if ($dryRun) {
                continue;
            }

            foreach ($companyTenantMap as $companyUuid => $companyTenants) {
                $tenant = $companyTenants[0];
                $countryCode = $tenant->country?->code ?? '';

                $updateData = ['tenant_uuid' => $tenant->uuid];
                if (Schema::hasColumn($table, 'country_code')) {
                    $updateData['country_code'] = $countryCode;
                }
                if (Schema::hasColumn($table, 'city_uuid')) {
                    $updateData['city_uuid'] = $tenant->city_uuid;
                }
                if (Schema::hasColumn($table, 'sector_uuid')) {
                    $updateData['sector_uuid'] = $tenant->sector_uuid;
                }

                $updated = DB::table($table)
                    ->where('company_uuid', $companyUuid)
                    ->whereNull('tenant_uuid')
                    ->update($updateData);

                if ($updated > 0) {
                    $this->line("    Updated {$updated} rows for company {$companyUuid}");
                    $totalUpdated += $updated;
                }
            }
        }

        $this->newLine();
        if ($dryRun) {
            $this->info('Dry run complete. No changes made.');
        } else {
            $this->info("Backfill complete. Total records updated: {$totalUpdated}");
        }

        return 0;
    }
}
