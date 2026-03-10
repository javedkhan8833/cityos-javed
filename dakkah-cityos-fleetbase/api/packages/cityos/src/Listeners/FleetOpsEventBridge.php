<?php

namespace Fleetbase\CityOS\Listeners;

use Fleetbase\CityOS\Support\NodeContext;
use Fleetbase\CityOS\Services\CityBusService;
use Illuminate\Support\Str;

class FleetOpsEventBridge
{
    protected CityBusService $cityBus;

    public function __construct(CityBusService $cityBus)
    {
        $this->cityBus = $cityBus;
    }

    public function handle($event): void
    {
        if (!config('cityos.event_bridge.enabled', false)) {
            return;
        }

        $nodeContext = request()?->attributes?->get('node_context');
        $contextArray = ($nodeContext instanceof NodeContext) ? $nodeContext->toArray() : [];
        $tenantId = $nodeContext?->tenant ?? null;

        $eventType = $this->resolveEventType($event);
        if (!$eventType) {
            return;
        }

        $payload = [
            'event_class' => get_class($event),
            'module' => 'fleetops',
            'data' => method_exists($event, 'toArray') ? $event->toArray() : [],
            'correlation_id' => (string) Str::uuid(),
        ];

        try {
            $this->cityBus->publish($eventType, $payload, $contextArray, $tenantId);
        } catch (\Exception $e) {
            report($e);
        }
    }

    protected function resolveEventType($event): ?string
    {
        $class = class_basename($event);

        $eventMap = [
            'OrderDispatched' => 'DELIVERY_DISPATCHED',
            'OrderCompleted' => 'DELIVERY_COMPLETED',
            'OrderFailed' => 'DELIVERY_FAILED',
            'OrderCreated' => 'DELIVERY_CREATED',
            'DriverAssigned' => 'DRIVER_ASSIGNED',
        ];

        return $eventMap[$class] ?? 'FLEETOPS_' . strtoupper(Str::snake($class));
    }
}
