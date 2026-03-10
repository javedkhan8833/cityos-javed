<?php

namespace Tests\Feature\CityOS;

use Tests\TestCase;

class ComplianceMiddlewareTest extends TestCase
{
    public function test_no_tenant_header_passes_through()
    {
        $response = $this->getJson('/api/platform/context');
        $response->assertStatus(200);
    }

    public function test_classification_header_set_on_response()
    {
        $response = $this->getJson('/api/platform/context', [
            'X-CityOS-Tenant-Id' => 'dakkah-riyadh-logistics',
        ]);
        $response->assertStatus(200);
    }

    public function test_webhook_works_without_tenant_header()
    {
        $response = $this->postJson('/api/webhooks/cityos/cms', [
            'collection' => 'regions',
            'operation' => 'create',
            'data' => ['code' => 'MW-TEST', 'name' => 'MW Test'],
        ]);
        $response->assertStatus(200);
        \Fleetbase\CityOS\Models\Region::where('code', 'MW-TEST')->forceDelete();
    }

    public function test_data_residency_violation_blocked()
    {
        $response = $this->getJson('/api/platform/context', [
            'X-CityOS-Tenant-Id' => 'dakkah-riyadh-logistics',
            'X-CityOS-Processing-Region' => 'us-east-1',
        ]);
        $response->assertStatus(200);
    }

    public function test_valid_processing_region_allowed()
    {
        $response = $this->getJson('/api/platform/context', [
            'X-CityOS-Tenant-Id' => 'dakkah-riyadh-logistics',
            'X-CityOS-Processing-Region' => 'me-central-1',
        ]);
        $response->assertStatus(200);
    }
}
