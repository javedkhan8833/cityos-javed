<?php

namespace Tests\Unit\CityOS;

use Tests\TestCase;
use Fleetbase\CityOS\Models\Tenant;

class TenantHierarchyTest extends TestCase
{
    public function test_tenant_tier_constants()
    {
        $this->assertEquals('MASTER', Tenant::TIER_MASTER);
        $this->assertEquals('GLOBAL', Tenant::TIER_GLOBAL);
        $this->assertEquals('REGIONAL', Tenant::TIER_REGIONAL);
        $this->assertEquals('COUNTRY', Tenant::TIER_COUNTRY);
        $this->assertEquals('CITY', Tenant::TIER_CITY);
        $this->assertCount(5, Tenant::VALID_TIERS);
    }

    public function test_parent_child_tenant_relationship()
    {
        $parent = Tenant::create(['handle' => 'test-parent-th', 'name' => 'Parent Tenant', 'tenant_tier' => 'GLOBAL']);
        $child = Tenant::create(['handle' => 'test-child-th', 'name' => 'Child Tenant', 'tenant_tier' => 'COUNTRY', 'parent_tenant_uuid' => $parent->uuid]);
        $this->assertEquals($parent->uuid, $child->parentTenant->uuid);
        $this->assertCount(1, $parent->childTenants);
        $child->forceDelete();
        $parent->forceDelete();
    }

    public function test_ancestry_chain()
    {
        $master = Tenant::create(['handle' => 'test-master-ac', 'name' => 'Master', 'tenant_tier' => 'MASTER']);
        $global = Tenant::create(['handle' => 'test-global-ac', 'name' => 'Global', 'tenant_tier' => 'GLOBAL', 'parent_tenant_uuid' => $master->uuid]);
        $city = Tenant::create(['handle' => 'test-city-ac', 'name' => 'City', 'tenant_tier' => 'CITY', 'parent_tenant_uuid' => $global->uuid]);

        $chain = $city->getAncestryChain();
        $this->assertCount(3, $chain);
        $this->assertEquals('test-master-ac', $chain[0]);
        $this->assertEquals('test-global-ac', $chain[1]);
        $this->assertEquals('test-city-ac', $chain[2]);

        $city->forceDelete();
        $global->forceDelete();
        $master->forceDelete();
    }

    public function test_is_master()
    {
        $tenant = new Tenant(['tenant_tier' => 'MASTER']);
        $this->assertTrue($tenant->isMaster());
        $this->assertFalse($tenant->isGlobal());
    }

    public function test_is_global()
    {
        $tenant = new Tenant(['tenant_tier' => 'GLOBAL']);
        $this->assertFalse($tenant->isMaster());
        $this->assertTrue($tenant->isGlobal());
    }

    public function test_get_node_context()
    {
        $tenant = Tenant::where('handle', 'dakkah-riyadh-logistics')->first();
        $this->assertNotNull($tenant);
        $ctx = $tenant->getNodeContext();
        $this->assertEquals('SA', $ctx['country']);
        $this->assertEquals('riyadh', $ctx['cityOrTheme']);
        $this->assertEquals('logistics', $ctx['sector']);
        $this->assertEquals('dakkah-riyadh-logistics', $ctx['tenant']);
    }
}
