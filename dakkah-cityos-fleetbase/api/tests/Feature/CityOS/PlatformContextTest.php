<?php

namespace Tests\Feature\CityOS;

use Tests\TestCase;

class PlatformContextTest extends TestCase
{
    public function test_context_returns_success()
    {
        $response = $this->getJson('/api/platform/context');
        $response->assertStatus(200);
        $response->assertJsonStructure([
            'success',
            'data' => [
                'tenant',
                'nodeHierarchy',
                'governanceChain',
                'capabilities',
                'systems',
                'contextHeaders',
                'hierarchyLevels',
                'resolvedAt',
                'isDefaultTenant',
            ],
        ]);
        $response->assertJson(['success' => true]);
    }

    public function test_context_fallback_to_default_tenant()
    {
        $response = $this->getJson('/api/platform/context');
        $response->assertStatus(200);
        $response->assertJson(['data' => ['isDefaultTenant' => true]]);
    }

    public function test_context_with_specific_tenant()
    {
        $response = $this->getJson('/api/platform/context?tenant=dakkah-riyadh-logistics');
        $response->assertStatus(200);
        $response->assertJson(['data' => ['isDefaultTenant' => false]]);
        $data = $response->json('data');
        $this->assertEquals('dakkah-riyadh-logistics', $data['tenant']['slug']);
    }

    public function test_context_with_header_tenant()
    {
        $response = $this->getJson('/api/platform/context', [
            'X-CityOS-Tenant-Id' => 'dakkah-dubai-logistics',
        ]);
        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertEquals('dakkah-dubai-logistics', $data['tenant']['slug']);
        $this->assertFalse($data['isDefaultTenant']);
    }

    public function test_context_invalid_tenant_falls_back()
    {
        $response = $this->getJson('/api/platform/context?tenant=nonexistent-tenant');
        $response->assertStatus(200);
        $response->assertJson(['data' => ['isDefaultTenant' => true]]);
    }

    public function test_context_tenant_has_correct_structure()
    {
        $response = $this->getJson('/api/platform/context?tenant=dakkah-riyadh-logistics');
        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                'tenant' => [
                    'id',
                    'name',
                    'slug',
                    'domain',
                    'residencyZone',
                    'status',
                    'description',
                    'settings' => [
                        'defaultLocale',
                        'supportedLocales',
                        'timezone',
                        'currency',
                    ],
                ],
            ],
        ]);
    }

    public function test_context_governance_chain_has_region()
    {
        $response = $this->getJson('/api/platform/context?tenant=dakkah-riyadh-logistics');
        $response->assertStatus(200);
        $data = $response->json('data.governanceChain');
        $this->assertArrayHasKey('region', $data);
        $this->assertArrayHasKey('country', $data);
        $this->assertArrayHasKey('authorities', $data);
        $this->assertArrayHasKey('effectivePolicies', $data);
        $this->assertEquals('GCC', $data['region']['code']);
        $this->assertEquals('SA', $data['country']['code']);
    }

    public function test_context_sa_tenant_has_gcc_residency()
    {
        $response = $this->getJson('/api/platform/context?tenant=dakkah-riyadh-logistics');
        $response->assertStatus(200);
        $this->assertEquals('GCC', $response->json('data.tenant.residencyZone'));
        $this->assertEquals('SAR', $response->json('data.tenant.settings.currency'));
        $this->assertEquals('Asia/Riyadh', $response->json('data.tenant.settings.timezone'));
    }

    public function test_context_ae_tenant_has_gcc_residency()
    {
        $response = $this->getJson('/api/platform/context?tenant=dakkah-dubai-logistics');
        $response->assertStatus(200);
        $this->assertEquals('GCC', $response->json('data.tenant.residencyZone'));
        $this->assertEquals('AED', $response->json('data.tenant.settings.currency'));
    }

    public function test_context_has_hierarchy_levels()
    {
        $response = $this->getJson('/api/platform/context');
        $response->assertStatus(200);
        $levels = $response->json('data.hierarchyLevels');
        $this->assertEquals(['CITY', 'DISTRICT', 'ZONE', 'FACILITY', 'ASSET'], $levels);
    }

    public function test_context_has_context_headers()
    {
        $response = $this->getJson('/api/platform/context');
        $response->assertStatus(200);
        $headers = $response->json('data.contextHeaders');
        $this->assertContains('X-CityOS-Correlation-Id', $headers);
        $this->assertContains('X-CityOS-Tenant-Id', $headers);
        $this->assertContains('X-CityOS-Node-Id', $headers);
        $this->assertContains('X-CityOS-Locale', $headers);
        $this->assertContains('X-Idempotency-Key', $headers);
    }

    public function test_context_has_systems_registry()
    {
        $response = $this->getJson('/api/platform/context');
        $response->assertStatus(200);
        $systems = $response->json('data.systems');
        $this->assertArrayHasKey('total', $systems);
        $this->assertArrayHasKey('active', $systems);
        $this->assertArrayHasKey('external', $systems);
        $this->assertArrayHasKey('registry', $systems);
        $this->assertEquals(22, $systems['total']);
    }

    public function test_context_has_capabilities()
    {
        $response = $this->getJson('/api/platform/context');
        $response->assertStatus(200);
        $capabilities = $response->json('data.capabilities');
        $this->assertArrayHasKey('plugins', $capabilities);
        $this->assertArrayHasKey('features', $capabilities);
        $this->assertArrayHasKey('endpoints', $capabilities);
    }

    public function test_context_cache_headers()
    {
        $response = $this->getJson('/api/platform/context');
        $response->assertStatus(200);
        $cacheControl = $response->headers->get('Cache-Control');
        $this->assertStringContainsString('public', $cacheControl);
        $this->assertStringContainsString('max-age=60', $cacheControl);
    }

    public function test_context_node_hierarchy_structure()
    {
        $response = $this->getJson('/api/platform/context?tenant=dakkah-riyadh-logistics');
        $response->assertStatus(200);
        $hierarchy = $response->json('data.nodeHierarchy');
        $this->assertIsArray($hierarchy);
        $this->assertNotEmpty($hierarchy);
        $node = $hierarchy[0];
        $this->assertArrayHasKey('id', $node);
        $this->assertArrayHasKey('name', $node);
        $this->assertArrayHasKey('code', $node);
        $this->assertArrayHasKey('type', $node);
        $this->assertArrayHasKey('slug', $node);
        $this->assertArrayHasKey('coordinates', $node);
        $this->assertEquals('CITY', $node['type']);
    }

    public function test_context_governance_authorities_for_sa()
    {
        $response = $this->getJson('/api/platform/context?tenant=dakkah-riyadh-logistics');
        $response->assertStatus(200);
        $authorities = $response->json('data.governanceChain.authorities');
        $this->assertIsArray($authorities);
        $this->assertNotEmpty($authorities);
        $codes = array_column($authorities, 'code');
        $this->assertContains('CITC', $codes);
        $this->assertContains('NDMO', $codes);
    }

    public function test_context_governance_policies_data_residency()
    {
        $response = $this->getJson('/api/platform/context?tenant=dakkah-riyadh-logistics');
        $response->assertStatus(200);
        $policies = $response->json('data.governanceChain.effectivePolicies');
        $this->assertArrayHasKey('dataResidency', $policies);
        $this->assertEquals('GCC', $policies['dataResidency']['zone']);
        $this->assertFalse($policies['dataResidency']['crossBorderTransfer']);
        $this->assertTrue($policies['dataResidency']['encryptionRequired']);
    }

    public function test_default_tenant_returns_success()
    {
        $response = $this->getJson('/api/platform/tenants/default');
        $response->assertStatus(200);
        $response->assertJson(['success' => true]);
        $response->assertJson(['data' => ['isDefaultTenant' => true]]);
    }

    public function test_default_tenant_has_usage_section()
    {
        $response = $this->getJson('/api/platform/tenants/default');
        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                'tenant',
                'nodeHierarchy',
                'governanceChain',
                'usage' => [
                    'description',
                    'headers',
                    'bootstrapUrl',
                ],
            ],
        ]);
    }

    public function test_default_tenant_usage_has_headers()
    {
        $response = $this->getJson('/api/platform/tenants/default');
        $response->assertStatus(200);
        $usage = $response->json('data.usage');
        $this->assertArrayHasKey('headers', $usage);
        $this->assertArrayHasKey('X-CityOS-Tenant-Id', $usage['headers']);
        $this->assertArrayHasKey('X-CityOS-Locale', $usage['headers']);
    }

    public function test_default_tenant_cache_headers()
    {
        $response = $this->getJson('/api/platform/tenants/default');
        $response->assertStatus(200);
        $cacheControl = $response->headers->get('Cache-Control');
        $this->assertStringContainsString('public', $cacheControl);
        $this->assertStringContainsString('max-age=300', $cacheControl);
    }

    public function test_capabilities_returns_success()
    {
        $response = $this->getJson('/api/platform/capabilities');
        $response->assertStatus(200);
        $response->assertJson(['success' => true]);
    }

    public function test_capabilities_has_plugins()
    {
        $response = $this->getJson('/api/platform/capabilities');
        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                'plugins' => [
                    'official',
                    'community',
                    'custom',
                ],
                'features',
                'endpoints',
            ],
        ]);
    }

    public function test_capabilities_plugins_include_multi_tenant()
    {
        $response = $this->getJson('/api/platform/capabilities');
        $response->assertStatus(200);
        $official = $response->json('data.plugins.official');
        $this->assertContains('multi-tenant', $official);
        $this->assertContains('cloud-storage', $official);
    }

    public function test_capabilities_features_structure()
    {
        $response = $this->getJson('/api/platform/capabilities');
        $response->assertStatus(200);
        $features = $response->json('data.features');
        $this->assertTrue($features['twoFactorAuth']);
        $this->assertTrue($features['rbac']);
        $this->assertTrue($features['multiTenancy']);
        $this->assertArrayHasKey('localization', $features);
        $this->assertEquals(['en', 'fr', 'ar'], $features['localization']['locales']);
    }

    public function test_capabilities_endpoints_structure()
    {
        $response = $this->getJson('/api/platform/capabilities');
        $response->assertStatus(200);
        $endpoints = $response->json('data.endpoints');
        $this->assertArrayHasKey('platform', $endpoints);
        $this->assertArrayHasKey('hierarchy', $endpoints);
        $this->assertArrayHasKey('integrations', $endpoints);
        $this->assertArrayHasKey('bff', $endpoints);
        $this->assertArrayHasKey('webhooks', $endpoints);
        $this->assertArrayHasKey('storage', $endpoints);
    }

    public function test_no_auth_required_for_context()
    {
        $response = $this->getJson('/api/platform/context');
        $response->assertStatus(200);
    }

    public function test_no_auth_required_for_default_tenant()
    {
        $response = $this->getJson('/api/platform/tenants/default');
        $response->assertStatus(200);
    }

    public function test_no_auth_required_for_capabilities()
    {
        $response = $this->getJson('/api/platform/capabilities');
        $response->assertStatus(200);
    }
}
