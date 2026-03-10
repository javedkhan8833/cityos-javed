<?php

namespace Tests\Unit\CityOS;

use Tests\TestCase;
use Fleetbase\CityOS\Models\Country;
use Fleetbase\CityOS\Models\Tenant;
use Fleetbase\CityOS\Support\GovernanceChainBuilder;

class GovernanceChainTest extends TestCase
{
    public function test_build_with_sa_country()
    {
        $country = Country::where('code', 'SA')->first();
        $this->assertNotNull($country);
        $chain = GovernanceChainBuilder::build(null, $country);
        $this->assertEquals('GCC', $chain['region']['code']);
        $this->assertEquals('SA', $chain['country']['code']);
    }

    public function test_build_with_ae_country()
    {
        $country = Country::where('code', 'AE')->first();
        $this->assertNotNull($country);
        $chain = GovernanceChainBuilder::build(null, $country);
        $this->assertEquals('GCC', $chain['region']['code']);
        $this->assertEquals('AE', $chain['country']['code']);
    }

    public function test_sa_has_authorities()
    {
        $country = Country::where('code', 'SA')->first();
        $chain = GovernanceChainBuilder::build(null, $country);
        $this->assertNotEmpty($chain['authorities']);
        $codes = array_column($chain['authorities'], 'code');
        $this->assertContains('CITC', $codes);
        $this->assertContains('NDMO', $codes);
        $this->assertContains('TGA', $codes);
    }

    public function test_ae_has_authorities()
    {
        $country = Country::where('code', 'AE')->first();
        $chain = GovernanceChainBuilder::build(null, $country);
        $this->assertNotEmpty($chain['authorities']);
        $codes = array_column($chain['authorities'], 'code');
        $this->assertContains('TDRA', $codes);
    }

    public function test_effective_policies_returned()
    {
        $country = Country::where('code', 'SA')->first();
        $chain = GovernanceChainBuilder::build(null, $country);
        $this->assertArrayHasKey('effectivePolicies', $chain);
        $this->assertArrayHasKey('dataResidency', $chain['effectivePolicies']);
        $this->assertArrayHasKey('compliance', $chain['effectivePolicies']);
        $this->assertArrayHasKey('classification', $chain['effectivePolicies']);
    }

    public function test_policy_stack_trace_returned()
    {
        $country = Country::where('code', 'SA')->first();
        $chain = GovernanceChainBuilder::build(null, $country);
        $this->assertArrayHasKey('policyStack', $chain);
        $this->assertIsArray($chain['policyStack']);
    }

    public function test_build_with_null_returns_defaults()
    {
        $chain = GovernanceChainBuilder::build(null, null);
        $this->assertNull($chain['region']);
        $this->assertNull($chain['country']);
        $this->assertEmpty($chain['authorities']);
        $this->assertArrayHasKey('dataResidency', $chain['effectivePolicies']);
    }

    public function test_build_with_tenant()
    {
        $tenant = Tenant::where('handle', 'dakkah-riyadh-logistics')->first();
        $this->assertNotNull($tenant);
        $chain = GovernanceChainBuilder::build($tenant);
        $this->assertEquals('GCC', $chain['region']['code']);
        $this->assertEquals('SA', $chain['country']['code']);
    }

    public function test_default_policies_structure()
    {
        $defaults = GovernanceChainBuilder::defaultPolicies();
        $this->assertArrayHasKey('dataResidency', $defaults);
        $this->assertArrayHasKey('compliance', $defaults);
        $this->assertArrayHasKey('classification', $defaults);
        $this->assertArrayHasKey('operational', $defaults);
        $this->assertEquals('INTERNAL', $defaults['classification']['defaultLevel']);
    }
}
