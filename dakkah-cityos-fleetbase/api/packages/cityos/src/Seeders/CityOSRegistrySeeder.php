<?php

namespace Fleetbase\CityOS\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CityOSRegistrySeeder extends Seeder
{
    public function run()
    {
        $this->command->info('Seeding CityOS registry extension...');

        $extension = DB::table('registry_extensions')
            ->where('slug', 'cityos')
            ->whereNull('deleted_at')
            ->first();

        if ($extension) {
            $this->command->info('CityOS registry extension already exists, skipping.');
            $this->ensureInstalls($extension->uuid);
            return;
        }

        $extensionUuid = (string) Str::uuid();
        $bundleUuid = (string) Str::uuid();
        $companyUuids = DB::table('companies')
            ->whereNull('deleted_at')
            ->pluck('uuid')
            ->toArray();

        if (empty($companyUuids)) {
            $this->command->warn('No companies found, skipping registry extension install.');
            return;
        }

        DB::table('registry_extensions')->insert([
            'uuid' => $extensionUuid,
            'company_uuid' => $companyUuids[0],
            'public_id' => 'registry_ext_' . Str::random(10),
            'name' => 'CityOS',
            'subtitle' => 'Multi-hierarchy governance & tenant management for CityOS platform',
            'slug' => 'cityos',
            'version' => '0.0.1',
            'fa_icon' => 'city',
            'description' => 'CityOS extension provides hierarchical multi-tenancy (Country > City > Sector > Category > Tenant > Channel > Surface > Portal), cascading governance policies, integration management for Temporal/CMS/ERPNext, and NodeContext resolution.',
            'currency' => 'USD',
            'payment_required' => DB::raw('false'),
            'on_sale' => DB::raw('false'),
            'subscription_required' => DB::raw('false'),
            'core_extension' => DB::raw('true'),
            'self_managed' => DB::raw('true'),
            'status' => 'published',
            'meta' => json_encode([]),
            'tags' => json_encode(['cityos', 'governance', 'multi-tenant', 'hierarchy']),
            'current_bundle_uuid' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('registry_extension_bundles')->insert([
            'uuid' => $bundleUuid,
            'public_id' => str_pad('registry_bundle_' . Str::random(10), 36),
            'bundle_id' => str_pad('bundle_cityos_' . Str::random(10), 36),
            'company_uuid' => $companyUuids[0],
            'extension_uuid' => $extensionUuid,
            'bundle_number' => '1.0.0',
            'version' => '0.0.1',
            'status' => 'published',
            'meta' => json_encode([
                'package.json' => [
                    'name' => '@fleetbase/cityos-engine',
                    'version' => '0.0.1',
                    'fleetbase' => ['route' => 'cityos'],
                    'keywords' => ['fleetbase-extension', 'cityos'],
                ],
                'composer.json' => [
                    'name' => 'fleetbase/cityos-api',
                    'version' => '0.0.1',
                ],
            ]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('registry_extensions')
            ->where('uuid', $extensionUuid)
            ->update(['current_bundle_uuid' => $bundleUuid]);

        foreach ($companyUuids as $companyUuid) {
            DB::table('registry_extension_installs')->insert([
                'uuid' => (string) Str::uuid(),
                'company_uuid' => $companyUuid,
                'extension_uuid' => $extensionUuid,
                'meta' => json_encode([]),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $this->command->info('CityOS registry extension created and installed for ' . count($companyUuids) . ' companies.');
    }

    protected function ensureInstalls(string $extensionUuid): void
    {
        $companyUuids = DB::table('companies')
            ->whereNull('deleted_at')
            ->pluck('uuid')
            ->toArray();

        $existingInstalls = DB::table('registry_extension_installs')
            ->where('extension_uuid', $extensionUuid)
            ->whereNull('deleted_at')
            ->pluck('company_uuid')
            ->toArray();

        $missing = array_diff($companyUuids, $existingInstalls);

        foreach ($missing as $companyUuid) {
            DB::table('registry_extension_installs')->insert([
                'uuid' => (string) Str::uuid(),
                'company_uuid' => $companyUuid,
                'extension_uuid' => $extensionUuid,
                'meta' => json_encode([]),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        if (count($missing) > 0) {
            $this->command->info('Installed CityOS extension for ' . count($missing) . ' additional companies.');
        }
    }
}
