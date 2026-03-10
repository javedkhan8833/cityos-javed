<?php

namespace Tests\Unit\CityOS;

use Tests\TestCase;
use Fleetbase\CityOS\Models\FeatureFlag;

class FeatureFlagModelTest extends TestCase
{
    public function test_can_create_feature_flag()
    {
        $ff = FeatureFlag::create(['key' => 'test-flag-unit', 'name' => 'Test Flag', 'enabled' => true, 'status' => 'active']);
        $this->assertNotNull($ff->uuid);
        $this->assertTrue($ff->enabled);
        $ff->forceDelete();
    }

    public function test_evaluate_returns_false_when_disabled()
    {
        $ff = FeatureFlag::create(['key' => 'disabled-flag-unit', 'name' => 'Disabled', 'enabled' => false, 'status' => 'active']);
        $this->assertFalse($ff->evaluate('CITY'));
        $ff->forceDelete();
    }

    public function test_evaluate_returns_true_when_no_conditions()
    {
        $ff = FeatureFlag::create(['key' => 'no-cond-unit', 'name' => 'No Conditions', 'enabled' => true, 'status' => 'active', 'conditions' => []]);
        $this->assertTrue($ff->evaluate('CITY'));
        $ff->forceDelete();
    }

    public function test_evaluate_tenant_tier_condition()
    {
        $ff = FeatureFlag::create(['key' => 'tier-cond-unit', 'name' => 'Tier Condition', 'enabled' => true, 'status' => 'active', 'conditions' => ['tenant_tiers' => ['MASTER', 'GLOBAL']]]);
        $this->assertTrue($ff->evaluate('MASTER'));
        $this->assertTrue($ff->evaluate('GLOBAL'));
        $this->assertFalse($ff->evaluate('CITY'));
        $ff->forceDelete();
    }

    public function test_evaluate_node_type_condition()
    {
        $ff = FeatureFlag::create(['key' => 'node-cond-unit', 'name' => 'Node Condition', 'enabled' => true, 'status' => 'active', 'conditions' => ['node_types' => ['COUNTRY', 'CITY']]]);
        $this->assertTrue($ff->evaluate(null, 'COUNTRY'));
        $this->assertFalse($ff->evaluate(null, 'ZONE'));
        $ff->forceDelete();
    }

    public function test_evaluate_roles_condition()
    {
        $ff = FeatureFlag::create(['key' => 'role-cond-unit', 'name' => 'Role Condition', 'enabled' => true, 'status' => 'active', 'conditions' => ['roles' => ['admin', 'manager']]]);
        $this->assertTrue($ff->evaluate(null, null, ['admin']));
        $this->assertFalse($ff->evaluate(null, null, ['viewer']));
        $ff->forceDelete();
    }

    public function test_evaluate_inactive_flag()
    {
        $ff = FeatureFlag::create(['key' => 'inactive-ff-unit', 'name' => 'Inactive', 'enabled' => true, 'status' => 'inactive']);
        $this->assertFalse($ff->evaluate());
        $ff->forceDelete();
    }
}
