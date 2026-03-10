<?php

namespace Tests\Unit\CityOS;

use Tests\TestCase;
use Fleetbase\CityOS\Services\SystemsRegistryService;

class SystemsRegistryTest extends TestCase
{
    private SystemsRegistryService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new SystemsRegistryService();
    }

    public function test_registry_returns_22_systems()
    {
        $registry = $this->service->getRegistry();
        $this->assertCount(22, $registry);
    }

    public function test_registry_contains_all_required_systems()
    {
        $registry = $this->service->getRegistry();
        $ids = array_column($registry, 'id');

        $required = [
            'cms-payload', 'cms-bff', 'commerce-medusa', 'identity-auth',
            'payments-stripe', 'analytics-internal', 'communication-email',
            'communication-sms', 'infra-database', 'infra-cache',
            'infra-storage', 'observability-health', 'observability-metrics',
            'search-elasticsearch', 'geo-mapping', 'ai-recommendations',
            'logistics-delivery', 'iot-platform', 'social-platform',
            'workflow-temporal', 'erp-erpnext', 'logistics-fleetbase',
        ];

        foreach ($required as $id) {
            $this->assertContains($id, $ids, "Missing system: $id");
        }
    }

    public function test_each_system_has_required_fields()
    {
        $registry = $this->service->getRegistry();

        foreach ($registry as $system) {
            $this->assertArrayHasKey('id', $system);
            $this->assertArrayHasKey('name', $system);
            $this->assertArrayHasKey('type', $system);
            $this->assertArrayHasKey('category', $system);
            $this->assertArrayHasKey('status', $system);
            $this->assertArrayHasKey('capabilities', $system);
            $this->assertArrayHasKey('hasBaseUrl', $system);
        }
    }

    public function test_system_types_are_valid()
    {
        $registry = $this->service->getRegistry();
        $validTypes = ['internal', 'external', 'stub'];

        foreach ($registry as $system) {
            $this->assertContains($system['type'], $validTypes, "Invalid type for {$system['id']}: {$system['type']}");
        }
    }

    public function test_system_statuses_are_valid()
    {
        $registry = $this->service->getRegistry();
        $validStatuses = ['active', 'planned', 'deprecated'];

        foreach ($registry as $system) {
            $this->assertContains($system['status'], $validStatuses, "Invalid status for {$system['id']}: {$system['status']}");
        }
    }

    public function test_system_categories_are_valid()
    {
        $registry = $this->service->getRegistry();
        $validCategories = ['cms', 'commerce', 'identity', 'payments', 'logistics', 'analytics', 'communication', 'infrastructure', 'workflow', 'erp'];

        foreach ($registry as $system) {
            $this->assertContains($system['category'], $validCategories, "Invalid category for {$system['id']}: {$system['category']}");
        }
    }

    public function test_registry_matches_spec_ids_and_categories()
    {
        $registry = $this->service->getRegistry();
        $byId = collect($registry)->keyBy('id');

        $specSystems = [
            'cms-payload' => ['type' => 'cms', 'auth' => 'api-key'],
            'cms-bff' => ['type' => 'cms'],
            'commerce-medusa' => ['type' => 'commerce'],
            'identity-auth' => ['type' => 'identity'],
            'payments-stripe' => ['type' => 'payments'],
            'analytics-internal' => ['type' => 'analytics'],
            'communication-email' => ['type' => 'communication'],
            'communication-sms' => ['type' => 'communication'],
            'infra-database' => ['type' => 'infrastructure'],
            'infra-cache' => ['type' => 'infrastructure'],
            'infra-storage' => ['type' => 'infrastructure'],
            'observability-health' => ['type' => 'infrastructure'],
            'observability-metrics' => ['type' => 'analytics'],
            'search-elasticsearch' => ['type' => 'infrastructure'],
            'geo-mapping' => ['type' => 'logistics'],
            'ai-recommendations' => ['type' => 'analytics'],
            'logistics-delivery' => ['type' => 'logistics'],
            'iot-platform' => ['type' => 'infrastructure'],
            'social-platform' => ['type' => 'communication'],
            'workflow-temporal' => ['type' => 'workflow'],
            'erp-erpnext' => ['type' => 'erp'],
            'logistics-fleetbase' => ['type' => 'logistics'],
        ];

        foreach ($specSystems as $id => $expected) {
            $this->assertTrue($byId->has($id), "Missing spec system: $id");
            $this->assertEquals($expected['type'], $byId[$id]['category'], "Wrong category for $id");
        }
    }

    public function test_infra_database_is_active()
    {
        $registry = $this->service->getRegistry();
        $db = collect($registry)->firstWhere('id', 'infra-database');
        $this->assertEquals('active', $db['status']);
        $this->assertEquals('internal', $db['type']);
    }

    public function test_identity_auth_is_active()
    {
        $registry = $this->service->getRegistry();
        $auth = collect($registry)->firstWhere('id', 'identity-auth');
        $this->assertEquals('active', $auth['status']);
        $this->assertContains('authentication', $auth['capabilities']);
        $this->assertContains('rbac', $auth['capabilities']);
    }

    public function test_summary_returns_correct_counts()
    {
        $summary = $this->service->getSummary();
        $this->assertArrayHasKey('total', $summary);
        $this->assertArrayHasKey('active', $summary);
        $this->assertArrayHasKey('external', $summary);
        $this->assertArrayHasKey('registry', $summary);
        $this->assertEquals(22, $summary['total']);
        $this->assertGreaterThan(0, $summary['active']);
    }
}
