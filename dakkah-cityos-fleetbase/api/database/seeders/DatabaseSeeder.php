<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run()
    {
        $this->call([
            \Fleetbase\Seeders\FleetbaseSeeder::class,
            DakkahOrganizationSeeder::class,
            \Fleetbase\CityOS\Seeders\CityOSHierarchySeeder::class,
            \Fleetbase\CityOS\Seeders\CityOSGovernanceSeeder::class,
            \Fleetbase\CityOS\Seeders\CityOSRegistrySeeder::class,
        ]);
    }
}
