<?php

namespace Tests\Unit\CityOS;

use Tests\TestCase;
use Fleetbase\CityOS\Services\CapabilitiesService;

class CapabilitiesTest extends TestCase
{
    private CapabilitiesService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new CapabilitiesService();
    }

    public function test_capabilities_has_three_sections()
    {
        $caps = $this->service->getCapabilities();
        $this->assertArrayHasKey('plugins', $caps);
        $this->assertArrayHasKey('features', $caps);
        $this->assertArrayHasKey('endpoints', $caps);
    }

    public function test_plugins_has_three_categories()
    {
        $plugins = $this->service->getPlugins();
        $this->assertArrayHasKey('official', $plugins);
        $this->assertArrayHasKey('community', $plugins);
        $this->assertArrayHasKey('custom', $plugins);
    }

    public function test_official_plugins_count()
    {
        $plugins = $this->service->getPlugins();
        $this->assertCount(10, $plugins['official']);
        $this->assertContains('multi-tenant', $plugins['official']);
        $this->assertContains('cloud-storage', $plugins['official']);
    }

    public function test_community_plugins_count()
    {
        $plugins = $this->service->getPlugins();
        $this->assertCount(5, $plugins['community']);
    }

    public function test_custom_plugins_count()
    {
        $plugins = $this->service->getPlugins();
        $this->assertCount(8, $plugins['custom']);
        $this->assertContains('openapi-generator', $plugins['custom']);
    }

    public function test_features_core_flags()
    {
        $features = $this->service->getFeatures();
        $this->assertTrue($features['twoFactorAuth']);
        $this->assertTrue($features['rbac']);
        $this->assertTrue($features['multiTenancy']);
        $this->assertTrue($features['objectStorage']);
    }

    public function test_features_localization()
    {
        $features = $this->service->getFeatures();
        $this->assertIsArray($features['localization']);
        $this->assertEquals(['en', 'fr', 'ar'], $features['localization']['locales']);
        $this->assertEquals('en', $features['localization']['defaultLocale']);
    }

    public function test_endpoints_has_all_categories()
    {
        $endpoints = $this->service->getEndpoints();
        $expected = ['platform', 'health', 'hierarchy', 'integrations', 'bff', 'webhooks', 'storage'];
        foreach ($expected as $category) {
            $this->assertArrayHasKey($category, $endpoints, "Missing endpoint category: $category");
        }
    }

    public function test_platform_endpoints_count()
    {
        $endpoints = $this->service->getEndpoints();
        $this->assertCount(3, $endpoints['platform']);
    }

    public function test_each_endpoint_has_required_fields()
    {
        $endpoints = $this->service->getEndpoints();
        foreach ($endpoints as $category => $list) {
            foreach ($list as $endpoint) {
                $this->assertArrayHasKey('path', $endpoint, "Missing path in $category endpoint");
                $this->assertArrayHasKey('method', $endpoint, "Missing method in $category endpoint");
                $this->assertArrayHasKey('auth', $endpoint, "Missing auth in $category endpoint");
                $this->assertArrayHasKey('purpose', $endpoint, "Missing purpose in $category endpoint");
            }
        }
    }
}
