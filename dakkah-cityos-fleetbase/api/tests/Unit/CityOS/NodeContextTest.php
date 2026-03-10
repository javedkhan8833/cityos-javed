<?php

namespace Tests\Unit\CityOS;

use Tests\TestCase;
use Fleetbase\CityOS\Support\NodeContext;
use Illuminate\Http\Request;

class NodeContextTest extends TestCase
{
    public function test_creates_with_defaults()
    {
        $ctx = new NodeContext();
        $this->assertNotEmpty($ctx->nodeId);
        $this->assertNotEmpty($ctx->correlationId);
        $this->assertEquals('1.0.0', $ctx->contractVersion);
        $this->assertEquals('', $ctx->country);
        $this->assertEquals('api', $ctx->channel);
        $this->assertEquals('ops-dashboard', $ctx->surface);
        $this->assertEquals('admin', $ctx->persona);
    }

    public function test_creates_with_custom_data()
    {
        $ctx = new NodeContext([
            'nodeId' => 'test-node',
            'correlationId' => 'test-corr',
            'contractVersion' => '2.0.0',
            'country' => 'SA',
            'cityOrTheme' => 'riyadh',
            'sector' => 'logistics',
            'tenant' => 'dakkah-riyadh-logistics',
        ]);
        $this->assertEquals('test-node', $ctx->nodeId);
        $this->assertEquals('test-corr', $ctx->correlationId);
        $this->assertEquals('2.0.0', $ctx->contractVersion);
        $this->assertEquals('SA', $ctx->country);
    }

    public function test_to_array_has_all_fields()
    {
        $ctx = new NodeContext();
        $arr = $ctx->toArray();
        $this->assertArrayHasKey('nodeId', $arr);
        $this->assertArrayHasKey('correlationId', $arr);
        $this->assertArrayHasKey('contractVersion', $arr);
        $this->assertArrayHasKey('country', $arr);
        $this->assertArrayHasKey('cityOrTheme', $arr);
        $this->assertArrayHasKey('sector', $arr);
        $this->assertArrayHasKey('category', $arr);
        $this->assertArrayHasKey('tenant', $arr);
        $this->assertArrayHasKey('channel', $arr);
        $this->assertArrayHasKey('locale', $arr);
        $this->assertArrayHasKey('processingRegion', $arr);
        $this->assertArrayHasKey('residencyClass', $arr);
    }

    public function test_from_request_reads_headers()
    {
        $request = Request::create('/test', 'GET');
        $request->headers->set('X-CityOS-Country', 'SA');
        $request->headers->set('X-CityOS-City', 'riyadh');
        $request->headers->set('X-CityOS-Tenant', 'test-tenant');
        $request->headers->set('X-CityOS-Node-Id', 'custom-node');
        $request->headers->set('X-CityOS-Correlation-Id', 'custom-corr');
        $request->headers->set('X-CityOS-Contract-Version', '3.0.0');

        $ctx = NodeContext::fromRequest($request);
        $this->assertEquals('SA', $ctx->country);
        $this->assertEquals('riyadh', $ctx->cityOrTheme);
        $this->assertEquals('custom-node', $ctx->nodeId);
        $this->assertEquals('custom-corr', $ctx->correlationId);
        $this->assertEquals('3.0.0', $ctx->contractVersion);
    }

    public function test_is_valid_checks_required_fields()
    {
        $ctx = new NodeContext(['country' => '', 'tenant' => '']);
        $this->assertFalse($ctx->isValid());

        $ctx2 = new NodeContext(['country' => 'SA', 'tenant' => 'test']);
        $this->assertTrue($ctx2->isValid());
    }

    public function test_resolve_tenant_from_database()
    {
        $ctx = new NodeContext(['tenant' => 'dakkah-riyadh-logistics']);
        $tenant = $ctx->resolveTenant();
        $this->assertNotNull($tenant);
        $this->assertEquals('dakkah-riyadh-logistics', $tenant->handle);
    }

    public function test_resolve_tenant_nonexistent()
    {
        $ctx = new NodeContext(['tenant' => 'nonexistent-tenant']);
        $this->assertNull($ctx->resolveTenant());
    }

    public function test_resolve_tenant_empty()
    {
        $ctx = new NodeContext(['tenant' => '']);
        $this->assertNull($ctx->resolveTenant());
    }

    public function test_set_resolved_tenant_populates_fields()
    {
        $tenant = \Fleetbase\CityOS\Models\Tenant::where('handle', 'dakkah-riyadh-logistics')->first();
        $ctx = new NodeContext();
        $ctx->setResolvedTenant($tenant);
        $this->assertEquals('SA', $ctx->country);
        $this->assertEquals('riyadh', $ctx->cityOrTheme);
    }
}
