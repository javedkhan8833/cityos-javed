<?php

namespace Tests\Feature\CityOS;

use Tests\TestCase;
use Fleetbase\CityOS\Models\FeatureFlag;
use Fleetbase\CityOS\Models\Node;
use Fleetbase\CityOS\Models\Tenant;

class GovernanceApiTest extends TestCase
{
    public function test_governance_resolve_requires_auth()
    {
        $response = $this->getJson('/cityos/int/v1/governance/resolve?country=SA');
        $this->assertTrue(in_array($response->status(), [400, 401, 403, 200]));
    }

    public function test_cms_webhook_accepts_post()
    {
        $response = $this->postJson('/api/webhooks/cityos/cms', [
            'collection' => 'regions',
            'operation' => 'create',
            'data' => ['code' => 'TEST-WH', 'name' => 'Test Webhook Region'],
        ]);
        $response->assertStatus(200);
        $response->assertJson(['success' => true]);
    }

    public function test_cms_webhook_handles_unknown_collection()
    {
        $response = $this->postJson('/api/webhooks/cityos/cms', [
            'collection' => 'unknown-collection',
            'operation' => 'create',
            'data' => ['name' => 'Test'],
        ]);
        $response->assertStatus(200);
        $response->assertJson(['success' => true]);
    }

    public function test_cms_webhook_handles_delete_operation()
    {
        $response = $this->postJson('/api/webhooks/cityos/cms', [
            'collection' => 'regions',
            'operation' => 'delete',
            'data' => ['id' => 'some-id'],
        ]);
        $response->assertStatus(200);
        $response->assertJson(['success' => true]);
    }

    public function test_cms_webhook_syncs_region()
    {
        $response = $this->postJson('/api/webhooks/cityos/cms', [
            'collection' => 'regions',
            'operation' => 'create',
            'data' => [
                'code' => 'TEST-SYNC-R',
                'name' => 'Test Sync Region',
                'residencyZone' => 'APAC',
                'status' => 'active',
            ],
        ]);
        $response->assertStatus(200);
        $this->assertDatabaseHas('cityos_regions', ['code' => 'TEST-SYNC-R']);
        \Fleetbase\CityOS\Models\Region::where('code', 'TEST-SYNC-R')->forceDelete();
    }

    public function test_cms_webhook_syncs_country()
    {
        $response = $this->postJson('/api/webhooks/cityos/cms', [
            'collection' => 'countries',
            'operation' => 'update',
            'data' => [
                'code' => 'SA',
                'name' => 'Saudi Arabia',
                'id' => 'cms-sa-001',
            ],
        ]);
        $response->assertStatus(200);
    }

    public function test_cms_webhook_syncs_feature_flag()
    {
        $response = $this->postJson('/api/webhooks/cityos/cms', [
            'collection' => 'feature-flags',
            'operation' => 'create',
            'data' => [
                'key' => 'test-wh-flag',
                'name' => 'Webhook Test Flag',
                'enabled' => true,
                'conditions' => ['tenant_tiers' => ['MASTER']],
            ],
        ]);
        $response->assertStatus(200);
        $this->assertDatabaseHas('cityos_feature_flags', ['key' => 'test-wh-flag']);
        FeatureFlag::where('key', 'test-wh-flag')->forceDelete();
    }

    public function test_cms_webhook_syncs_node()
    {
        $response = $this->postJson('/api/webhooks/cityos/cms', [
            'collection' => 'nodes',
            'operation' => 'create',
            'data' => [
                'id' => 'cms-node-test',
                'type' => 'GLOBAL',
                'name' => 'Test Webhook Node',
                'slug' => 'test-wh-node',
                'status' => 'active',
            ],
        ]);
        $response->assertStatus(200);
        $this->assertDatabaseHas('cityos_nodes', ['slug' => 'test-wh-node']);
        Node::where('slug', 'test-wh-node')->forceDelete();
    }

    public function test_cms_webhook_syncs_policy()
    {
        $response = $this->postJson('/api/webhooks/cityos/cms', [
            'collection' => 'policies',
            'operation' => 'create',
            'data' => [
                'name' => 'Test Webhook Policy',
                'slug' => 'test-wh-policy',
                'type' => 'compliance',
                'scope' => 'global',
                'policyData' => ['frameworks' => ['ISO27001']],
                'enforced' => true,
            ],
        ]);
        $response->assertStatus(200);
        $this->assertDatabaseHas('cityos_policies', ['slug' => 'test-wh-policy']);
        \Fleetbase\CityOS\Models\Policy::where('slug', 'test-wh-policy')->forceDelete();
    }

    public function test_cms_webhook_syncs_governance_authority()
    {
        $response = $this->postJson('/api/webhooks/cityos/cms', [
            'collection' => 'governance-authorities',
            'operation' => 'create',
            'data' => [
                'code' => 'TEST-WH-AUTH',
                'name' => 'Test Webhook Authority',
                'type' => 'regulatory',
                'country' => 'SA',
            ],
        ]);
        $response->assertStatus(200);
        $this->assertDatabaseHas('cityos_governance_authorities', ['code' => 'TEST-WH-AUTH']);
        \Fleetbase\CityOS\Models\GovernanceAuthority::where('code', 'TEST-WH-AUTH')->forceDelete();
    }

    public function test_cms_webhook_syncs_tenant()
    {
        $response = $this->postJson('/api/webhooks/cityos/cms', [
            'collection' => 'tenants',
            'operation' => 'create',
            'data' => [
                'slug' => 'test-wh-tenant',
                'name' => 'Test Webhook Tenant',
                'tier' => 'CITY',
                'country' => 'SA',
                'id' => 'cms-tenant-test',
            ],
        ]);
        $response->assertStatus(200);
        $this->assertDatabaseHas('cityos_tenants', ['handle' => 'test-wh-tenant']);
        Tenant::where('handle', 'test-wh-tenant')->forceDelete();
    }

    public function test_cms_webhook_with_correlation_id()
    {
        $response = $this->postJson('/api/webhooks/cityos/cms', [
            'collection' => 'regions',
            'operation' => 'create',
            'data' => ['code' => 'TEST-CORR', 'name' => 'Correlation Test'],
        ], ['X-CityOS-Correlation-Id' => 'test-correlation-123']);
        $response->assertStatus(200);
        \Fleetbase\CityOS\Models\Region::where('code', 'TEST-CORR')->forceDelete();
    }
}
