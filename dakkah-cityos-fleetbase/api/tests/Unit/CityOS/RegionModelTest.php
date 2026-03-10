<?php

namespace Tests\Unit\CityOS;

use Tests\TestCase;
use Fleetbase\CityOS\Models\Region;

class RegionModelTest extends TestCase
{
    public function test_can_create_region()
    {
        $region = Region::create(['code' => 'TEST-REG', 'name' => 'Test Region', 'residency_zone' => 'GLOBAL', 'status' => 'active']);
        $this->assertNotNull($region->uuid);
        $this->assertEquals('TEST-REG', $region->code);
        $region->forceDelete();
    }

    public function test_region_has_relationships()
    {
        $region = Region::create(['code' => 'TEST-REL', 'name' => 'Test Region Rel', 'residency_zone' => 'GLOBAL']);
        $this->assertNotNull($region->countries());
        $this->assertNotNull($region->policies());
        $this->assertNotNull($region->tenants());
        $region->forceDelete();
    }

    public function test_region_casts_policy_json()
    {
        $region = Region::create([
            'code' => 'TEST-JSON', 'name' => 'Test JSON Region',
            'data_residency_policy' => ['allowedRegions' => ['me-central-1'], 'zone' => 'GCC'],
            'compliance_policy' => ['frameworks' => ['PDPL']],
            'classification_policy' => ['defaultLevel' => 'INTERNAL'],
        ]);
        $this->assertIsArray($region->data_residency_policy);
        $this->assertEquals('GCC', $region->data_residency_policy['zone']);
        $this->assertContains('PDPL', $region->compliance_policy['frameworks']);
        $region->forceDelete();
    }
}
