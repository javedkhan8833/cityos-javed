<?php

namespace Tests\Unit\CityOS;

use Tests\TestCase;
use Fleetbase\CityOS\Models\FeatureFlag;
use Fleetbase\CityOS\Services\FeatureGateService;

class FeatureGateServiceTest extends TestCase
{
    private FeatureGateService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new FeatureGateService();
        $this->service->clearCache();
    }

    public function test_unknown_feature_returns_true()
    {
        $this->assertTrue($this->service->isEnabled('nonexistent-feature'));
    }

    public function test_disabled_feature_returns_false()
    {
        $ff = FeatureFlag::create(['key' => 'test-disabled-fgs', 'name' => 'Disabled', 'enabled' => false, 'status' => 'active']);
        $this->service->clearCache();
        $this->assertFalse($this->service->isEnabled('test-disabled-fgs'));
        $ff->forceDelete();
    }

    public function test_enabled_feature_no_conditions_returns_true()
    {
        $ff = FeatureFlag::create(['key' => 'test-enabled-fgs', 'name' => 'Enabled', 'enabled' => true, 'status' => 'active']);
        $this->service->clearCache();
        $this->assertTrue($this->service->isEnabled('test-enabled-fgs'));
        $ff->forceDelete();
    }

    public function test_get_all_flags()
    {
        $ff = FeatureFlag::create(['key' => 'all-flags-test-fgs', 'name' => 'All Test', 'enabled' => true, 'status' => 'active']);
        $flags = $this->service->getAllFlags();
        $this->assertArrayHasKey('all-flags-test-fgs', $flags);
        $this->assertTrue($flags['all-flags-test-fgs']);
        $ff->forceDelete();
    }

    public function test_evaluate_for_context()
    {
        $ff = FeatureFlag::create(['key' => 'ctx-eval-fgs', 'name' => 'Context Eval', 'enabled' => true, 'status' => 'active', 'conditions' => ['tenant_tiers' => ['MASTER']]]);
        $this->service->clearCache();
        $result = $this->service->evaluateForContext('MASTER');
        $this->assertTrue($result['ctx-eval-fgs']);
        $this->service->clearCache();
        $result2 = $this->service->evaluateForContext('CITY');
        $this->assertFalse($result2['ctx-eval-fgs']);
        $ff->forceDelete();
    }

    public function test_cache_works()
    {
        $ff = FeatureFlag::create(['key' => 'cache-test-fgs', 'name' => 'Cache', 'enabled' => true, 'status' => 'active']);
        $this->service->clearCache();
        $this->service->isEnabled('cache-test-fgs');
        $ff->update(['enabled' => false]);
        $result = $this->service->isEnabled('cache-test-fgs');
        $this->assertTrue($result);
        $ff->forceDelete();
    }
}
