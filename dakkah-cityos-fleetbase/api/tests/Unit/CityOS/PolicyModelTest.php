<?php

namespace Tests\Unit\CityOS;

use Tests\TestCase;
use Fleetbase\CityOS\Models\Policy;
use Fleetbase\CityOS\Models\Country;

class PolicyModelTest extends TestCase
{
    public function test_can_create_policy()
    {
        $country = Country::where('code', 'SA')->first();
        $policy = Policy::create(['name' => 'Test Policy', 'slug' => 'test-policy-unit', 'type' => Policy::TYPE_COMPLIANCE, 'scope' => Policy::SCOPE_NATIONAL, 'country_uuid' => $country->uuid, 'policy_data' => ['frameworks' => ['PDPL']], 'enforced' => true, 'status' => 'active']);
        $this->assertNotNull($policy->uuid);
        $this->assertTrue($policy->isEnforced());
        $policy->forceDelete();
    }

    public function test_policy_not_enforced_when_inactive()
    {
        $policy = Policy::create(['name' => 'Inactive Policy', 'slug' => 'inactive-policy-unit', 'type' => Policy::TYPE_SECURITY, 'enforced' => true, 'status' => 'inactive']);
        $this->assertFalse($policy->isEnforced());
        $policy->forceDelete();
    }

    public function test_policy_not_enforced_when_flag_false()
    {
        $policy = Policy::create(['name' => 'Unenforced Policy', 'slug' => 'unenforced-policy-unit', 'type' => Policy::TYPE_OPERATIONAL, 'enforced' => false]);
        $this->assertFalse($policy->isEnforced());
        $policy->forceDelete();
    }

    public function test_policy_type_constants()
    {
        $this->assertEquals('data-residency', Policy::TYPE_DATA_RESIDENCY);
        $this->assertEquals('compliance', Policy::TYPE_COMPLIANCE);
        $this->assertEquals('security', Policy::TYPE_SECURITY);
        $this->assertEquals('operational', Policy::TYPE_OPERATIONAL);
        $this->assertEquals('classification', Policy::TYPE_CLASSIFICATION);
    }

    public function test_policy_scope_constants()
    {
        $this->assertEquals('global', Policy::SCOPE_GLOBAL);
        $this->assertEquals('regional', Policy::SCOPE_REGIONAL);
        $this->assertEquals('national', Policy::SCOPE_NATIONAL);
        $this->assertEquals('municipal', Policy::SCOPE_MUNICIPAL);
        $this->assertEquals('tenant', Policy::SCOPE_TENANT);
    }

    public function test_policy_country_relationship()
    {
        $country = Country::where('code', 'SA')->first();
        $policy = Policy::create(['name' => 'Rel Policy', 'slug' => 'rel-policy-unit', 'type' => 'compliance', 'country_uuid' => $country->uuid]);
        $this->assertEquals('SA', $policy->country->code);
        $policy->forceDelete();
    }
}
