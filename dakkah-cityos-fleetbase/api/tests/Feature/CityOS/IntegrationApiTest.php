<?php

namespace Tests\Feature\CityOS;

use Tests\TestCase;

class IntegrationApiTest extends TestCase
{
    public function test_integration_status_requires_authentication()
    {
        $response = $this->getJson('/cityos/int/v1/integrations/status');
        $this->assertTrue(in_array($response->status(), [400, 401, 403]), "Expected 400/401/403 but got {$response->status()}");
    }

    public function test_integration_logs_requires_authentication()
    {
        $response = $this->getJson('/cityos/int/v1/integrations/logs');
        $this->assertTrue(in_array($response->status(), [400, 401, 403]), "Expected 400/401/403 but got {$response->status()}");
    }

    public function test_temporal_connection_requires_authentication()
    {
        $response = $this->getJson('/cityos/int/v1/integrations/temporal/connection');
        $this->assertTrue(in_array($response->status(), [400, 401, 403]), "Expected 400/401/403 but got {$response->status()}");
    }

    public function test_temporal_workflows_requires_authentication()
    {
        $response = $this->getJson('/cityos/int/v1/integrations/temporal/workflows');
        $this->assertTrue(in_array($response->status(), [400, 401, 403]), "Expected 400/401/403 but got {$response->status()}");
    }

    public function test_temporal_start_workflow_requires_authentication()
    {
        $response = $this->postJson('/cityos/int/v1/integrations/temporal/workflows/start', [
            'workflow_type' => 'TestWorkflow',
            'workflow_id' => 'test-123',
        ]);
        $this->assertTrue(in_array($response->status(), [400, 401, 403]), "Expected 400/401/403 but got {$response->status()}");
    }

    public function test_cms_health_requires_authentication()
    {
        $response = $this->getJson('/cityos/int/v1/integrations/cms/health');
        $this->assertTrue(in_array($response->status(), [400, 401, 403]), "Expected 400/401/403 but got {$response->status()}");
    }

    public function test_erpnext_status_requires_authentication()
    {
        $response = $this->getJson('/cityos/int/v1/integrations/erpnext/status');
        $this->assertTrue(in_array($response->status(), [400, 401, 403]), "Expected 400/401/403 but got {$response->status()}");
    }

    public function test_outbox_stats_requires_authentication()
    {
        $response = $this->getJson('/cityos/int/v1/integrations/outbox/stats');
        $this->assertTrue(in_array($response->status(), [400, 401, 403]), "Expected 400/401/403 but got {$response->status()}");
    }

    public function test_outbox_dispatch_requires_authentication()
    {
        $response = $this->postJson('/cityos/int/v1/integrations/outbox/dispatch');
        $this->assertTrue(in_array($response->status(), [400, 401, 403]), "Expected 400/401/403 but got {$response->status()}");
    }

    public function test_outbox_publish_requires_authentication()
    {
        $response = $this->postJson('/cityos/int/v1/integrations/outbox/publish', [
            'event_type' => 'TEST_EVENT',
            'payload' => ['key' => 'value'],
        ]);
        $this->assertTrue(in_array($response->status(), [400, 401, 403]), "Expected 400/401/403 but got {$response->status()}");
    }

    public function test_temporal_sync_trigger_requires_authentication()
    {
        $response = $this->postJson('/cityos/int/v1/integrations/temporal/sync/trigger');
        $this->assertTrue(in_array($response->status(), [400, 401, 403]), "Expected 400/401/403 but got {$response->status()}");
    }

    public function test_temporal_sync_status_requires_authentication()
    {
        $response = $this->getJson('/cityos/int/v1/integrations/temporal/sync/status');
        $this->assertTrue(in_array($response->status(), [400, 401, 403]), "Expected 400/401/403 but got {$response->status()}");
    }
}
