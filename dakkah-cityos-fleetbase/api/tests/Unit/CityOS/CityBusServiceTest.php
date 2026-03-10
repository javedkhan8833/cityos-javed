<?php

namespace Tests\Unit\CityOS;

use Tests\TestCase;
use Fleetbase\CityOS\Services\CityBusService;
use Fleetbase\CityOS\Models\OutboxEvent;
use Illuminate\Support\Facades\Http;

class CityBusServiceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Http::fake(['*' => Http::response(['success' => true], 200)]);
    }

    public function test_publish_creates_outbox_event()
    {
        $service = app(CityBusService::class);
        $event = $service->publish('TEST_EVENT', ['order_id' => 'ORD-001']);

        $this->assertInstanceOf(OutboxEvent::class, $event);
        $this->assertEquals('TEST_EVENT', $event->event_type);
        $this->assertEquals('pending', $event->status);
        $this->assertNotEmpty($event->event_id);
        $this->assertNotEmpty($event->correlation_id);

        $event->delete();
    }

    public function test_publish_stores_payload_as_envelope()
    {
        $service = app(CityBusService::class);
        $event = $service->publish('DELIVERY_CREATED', ['delivery_id' => 'DEL-001']);

        $this->assertIsArray($event->payload);
        $this->assertArrayHasKey('event_type', $event->payload);
        $this->assertArrayHasKey('payload', $event->payload);
        $this->assertArrayHasKey('timestamp', $event->payload);
        $this->assertArrayHasKey('source', $event->payload);
        $this->assertEquals('DELIVERY_CREATED', $event->payload['event_type']);

        $event->delete();
    }

    public function test_publish_stores_node_context()
    {
        $service = app(CityBusService::class);
        $nodeContext = ['country' => 'SA', 'cityOrTheme' => 'riyadh'];
        $event = $service->publish('TEST_EVENT', ['data' => 'test'], $nodeContext);

        $this->assertEquals($nodeContext, $event->node_context);

        $event->delete();
    }

    public function test_publish_with_tenant_id()
    {
        $service = app(CityBusService::class);
        $event = $service->publish('TEST_EVENT', ['data' => 'test'], [], 'tenant-abc');

        $this->assertEquals('tenant-abc', $event->tenant_id);

        $event->delete();
    }

    public function test_dispatch_pending_processes_events()
    {
        $service = app(CityBusService::class);

        $event = $service->publish('TEST_DISPATCH', ['test' => true]);

        $results = $service->dispatchPending(10);

        $this->assertIsArray($results);
        $this->assertArrayHasKey('published', $results);
        $this->assertArrayHasKey('failed', $results);
        $this->assertArrayHasKey('total', $results);

        $event->refresh();
        $event->delete();
    }

    public function test_dispatch_pending_returns_totals()
    {
        $service = app(CityBusService::class);

        $results = $service->dispatchPending(10);

        $this->assertIsArray($results);
        $this->assertArrayHasKey('total', $results);
        $this->assertIsInt($results['total']);
        $this->assertIsInt($results['published']);
        $this->assertIsInt($results['failed']);
    }

    public function test_get_outbox_stats_returns_correct_structure()
    {
        $service = app(CityBusService::class);
        $stats = $service->getOutboxStats();

        $this->assertArrayHasKey('pending', $stats);
        $this->assertArrayHasKey('published', $stats);
        $this->assertArrayHasKey('failed', $stats);
        $this->assertArrayHasKey('dead_letter', $stats);
        $this->assertArrayHasKey('total', $stats);
    }

    public function test_get_outbox_stats_returns_integers()
    {
        $service = app(CityBusService::class);
        $stats = $service->getOutboxStats();

        $this->assertIsInt($stats['pending']);
        $this->assertIsInt($stats['published']);
        $this->assertIsInt($stats['failed']);
        $this->assertIsInt($stats['dead_letter']);
        $this->assertIsInt($stats['total']);
    }

    public function test_publish_increments_total_count()
    {
        $service = app(CityBusService::class);
        $statsBefore = $service->getOutboxStats();

        $event = $service->publish('TEST_COUNT', ['data' => 'count-test']);
        $statsAfter = $service->getOutboxStats();

        $this->assertEquals($statsBefore['total'] + 1, $statsAfter['total']);
        $this->assertEquals($statsBefore['pending'] + 1, $statsAfter['pending']);

        $event->delete();
    }
}
