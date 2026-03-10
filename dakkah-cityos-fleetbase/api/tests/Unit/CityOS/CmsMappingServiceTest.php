<?php

namespace Tests\Unit\CityOS;

use Tests\TestCase;
use Fleetbase\CityOS\Models\FeatureFlag;
use Fleetbase\CityOS\Models\GovernanceAuthority;
use Fleetbase\CityOS\Models\Node;
use Fleetbase\CityOS\Models\Policy;
use Fleetbase\CityOS\Models\Region;
use Fleetbase\CityOS\Models\Tenant;
use Fleetbase\CityOS\Services\CmsMappingService;

class CmsMappingServiceTest extends TestCase
{
    private CmsMappingService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new CmsMappingService();
    }

    public function test_sync_regions_creates_new()
    {
        $stats = $this->service->syncRegions([
            ['code' => 'TEST-CMS-REG', 'name' => 'CMS Test Region', 'residencyZone' => 'APAC'],
        ]);
        $this->assertEquals(1, $stats['created']);
        $this->assertDatabaseHas('cityos_regions', ['code' => 'TEST-CMS-REG']);
        Region::where('code', 'TEST-CMS-REG')->forceDelete();
    }

    public function test_sync_regions_updates_existing()
    {
        Region::create(['code' => 'TEST-UPD-REG', 'name' => 'Original']);
        $stats = $this->service->syncRegions([
            ['code' => 'TEST-UPD-REG', 'name' => 'Updated Name'],
        ]);
        $this->assertEquals(1, $stats['updated']);
        $this->assertDatabaseHas('cityos_regions', ['code' => 'TEST-UPD-REG', 'name' => 'Updated Name']);
        Region::where('code', 'TEST-UPD-REG')->forceDelete();
    }

    public function test_sync_countries_updates_existing()
    {
        $stats = $this->service->syncCountries([
            ['code' => 'SA', 'name' => 'Saudi Arabia', 'id' => 'cms-sa-sync'],
        ]);
        $this->assertEquals(1, $stats['updated']);
    }

    public function test_sync_governance_authorities_creates()
    {
        $stats = $this->service->syncGovernanceAuthorities([
            ['code' => 'TEST-CMS-AUTH', 'name' => 'CMS Auth', 'type' => 'regulatory', 'country' => 'SA'],
        ]);
        $this->assertEquals(1, $stats['created']);
        $this->assertDatabaseHas('cityos_governance_authorities', ['code' => 'TEST-CMS-AUTH']);
        GovernanceAuthority::where('code', 'TEST-CMS-AUTH')->forceDelete();
    }

    public function test_sync_policies_creates()
    {
        $stats = $this->service->syncPolicies([
            ['name' => 'CMS Policy', 'slug' => 'cms-test-policy', 'type' => 'compliance', 'scope' => 'global', 'policyData' => ['frameworks' => ['ISO27001']], 'enforced' => true],
        ]);
        $this->assertEquals(1, $stats['created']);
        $this->assertDatabaseHas('cityos_policies', ['slug' => 'cms-test-policy']);
        Policy::where('slug', 'cms-test-policy')->forceDelete();
    }

    public function test_sync_nodes_creates_in_hierarchy_order()
    {
        $stats = $this->service->syncNodes([
            ['id' => 'cms-city-1', 'type' => 'CITY', 'name' => 'Test City', 'slug' => 'cms-test-city', 'parent' => 'cms-global-1'],
            ['id' => 'cms-global-1', 'type' => 'GLOBAL', 'name' => 'Test Global', 'slug' => 'cms-test-global'],
        ]);
        $this->assertEquals(2, $stats['created']);
        Node::where('slug', 'cms-test-city')->forceDelete();
        Node::where('slug', 'cms-test-global')->forceDelete();
    }

    public function test_sync_feature_flags_creates()
    {
        $stats = $this->service->syncFeatureFlags([
            ['key' => 'cms-test-ff', 'name' => 'CMS Feature Flag', 'enabled' => true, 'conditions' => ['tenant_tiers' => ['MASTER']]],
        ]);
        $this->assertEquals(1, $stats['created']);
        $this->assertDatabaseHas('cityos_feature_flags', ['key' => 'cms-test-ff']);
        FeatureFlag::where('key', 'cms-test-ff')->forceDelete();
    }

    public function test_sync_tenants_creates()
    {
        $stats = $this->service->syncTenants([
            ['slug' => 'cms-test-tenant', 'name' => 'CMS Tenant', 'tier' => 'CITY', 'country' => 'SA', 'id' => 'cms-t-001'],
        ]);
        $this->assertEquals(1, $stats['created']);
        $this->assertDatabaseHas('cityos_tenants', ['handle' => 'cms-test-tenant']);
        Tenant::where('handle', 'cms-test-tenant')->forceDelete();
    }

    public function test_sync_tenants_sorted_by_tier()
    {
        $stats = $this->service->syncTenants([
            ['slug' => 'cms-city-t', 'name' => 'City T', 'tier' => 'CITY', 'id' => 'cms-city-t'],
            ['slug' => 'cms-master-t', 'name' => 'Master T', 'tier' => 'MASTER', 'id' => 'cms-master-t'],
        ]);
        $this->assertEquals(2, $stats['created']);
        Tenant::where('handle', 'cms-city-t')->forceDelete();
        Tenant::where('handle', 'cms-master-t')->forceDelete();
    }
}
