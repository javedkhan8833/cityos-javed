<?php

namespace Tests\Unit\CityOS;

use Tests\TestCase;
use Fleetbase\CityOS\Services\TemporalService;
use Illuminate\Support\Facades\Http;

class TemporalServiceTest extends TestCase
{
    public function test_get_connection_info_returns_expected_structure()
    {
        $service = app(TemporalService::class);
        $info = $service->getConnectionInfo();

        $this->assertArrayHasKey('grpc_address', $info);
        $this->assertArrayHasKey('namespace', $info);
        $this->assertArrayHasKey('protocol', $info);
        $this->assertArrayHasKey('configured', $info);
        $this->assertArrayHasKey('tls', $info);
        $this->assertArrayHasKey('region', $info);
        $this->assertArrayHasKey('http_api_base', $info);
        $this->assertArrayHasKey('cloud_ops_api', $info);
    }

    public function test_get_connection_info_protocol_contains_grpc()
    {
        $service = app(TemporalService::class);
        $info = $service->getConnectionInfo();

        $this->assertStringContainsString('gRPC', $info['protocol']);
    }

    public function test_get_connection_info_tls_is_true()
    {
        $service = app(TemporalService::class);
        $info = $service->getConnectionInfo();

        $this->assertTrue($info['tls']);
    }

    public function test_start_workflow_returns_correlation_id()
    {
        Http::fake(['*' => Http::response(['success' => true], 200)]);

        $service = app(TemporalService::class);
        $result = $service->startWorkflow('TestWorkflow', 'test-wf-123', ['key' => 'value']);

        $this->assertArrayHasKey('correlation_id', $result);
        $this->assertNotEmpty($result['correlation_id']);
    }

    public function test_start_workflow_returns_mode_queued_via_cms_sync()
    {
        Http::fake(['*' => Http::response(['success' => true], 200)]);

        $service = app(TemporalService::class);
        $result = $service->startWorkflow('TestWorkflow', 'test-wf-456');

        $this->assertArrayHasKey('mode', $result);
        $this->assertEquals('queued_via_cms_sync', $result['mode']);
    }

    public function test_start_workflow_returns_workflow_id()
    {
        Http::fake(['*' => Http::response(['success' => true], 200)]);

        $service = app(TemporalService::class);
        $result = $service->startWorkflow('TestWorkflow', 'my-wf-id');

        $this->assertEquals('my-wf-id', $result['workflow_id']);
        $this->assertEquals('TestWorkflow', $result['workflow_type']);
    }

    public function test_start_workflow_returns_success_true()
    {
        Http::fake(['*' => Http::response(['success' => true], 200)]);

        $service = app(TemporalService::class);
        $result = $service->startWorkflow('TestWorkflow', 'test-wf-789');

        $this->assertTrue($result['success']);
    }

    public function test_start_workflow_uses_default_task_queue()
    {
        Http::fake(['*' => Http::response(['success' => true], 200)]);

        $service = app(TemporalService::class);
        $result = $service->startWorkflow('TestWorkflow', 'test-wf-queue');

        $this->assertEquals('cityos-default', $result['task_queue']);
    }

    public function test_start_workflow_uses_custom_task_queue()
    {
        Http::fake(['*' => Http::response(['success' => true], 200)]);

        $service = app(TemporalService::class);
        $result = $service->startWorkflow('TestWorkflow', 'test-wf-custom', [], 'custom-queue');

        $this->assertEquals('custom-queue', $result['task_queue']);
    }

    public function test_check_health_returns_array()
    {
        Http::fake(['*' => Http::response(['namespaces' => []], 200)]);

        $service = app(TemporalService::class);
        $health = $service->checkHealth();

        $this->assertIsArray($health);
        $this->assertArrayHasKey('reachable', $health);
    }
}
