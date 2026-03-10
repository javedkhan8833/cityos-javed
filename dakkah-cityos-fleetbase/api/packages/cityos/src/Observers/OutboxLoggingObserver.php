<?php

namespace Fleetbase\CityOS\Observers;

use Illuminate\Database\Eloquent\Model;
use Fleetbase\CityOS\Support\NodeContext;
use Fleetbase\CityOS\Models\OutboxEvent;
use Illuminate\Support\Str;

class OutboxLoggingObserver
{
    public function created(Model $model): void
    {
        $this->logEvent($model, 'CREATED');
    }

    public function updated(Model $model): void
    {
        if ($model->wasChanged()) {
            $this->logEvent($model, 'UPDATED');
        }
    }

    public function deleted(Model $model): void
    {
        $this->logEvent($model, 'DELETED');
    }

    protected function logEvent(Model $model, string $action): void
    {
        if (!config('cityos.event_bridge.enabled', false)) {
            return;
        }

        $nodeContext = request()?->attributes?->get('node_context');
        $contextArray = ($nodeContext instanceof NodeContext) ? $nodeContext->toArray() : [];

        $modelType = class_basename($model);
        $eventType = strtoupper($modelType) . '_' . $action;

        $payload = [
            'model_type' => get_class($model),
            'model_id' => $model->uuid ?? $model->getKey(),
            'action' => $action,
            'changed_fields' => $action === 'UPDATED' ? array_keys($model->getChanges()) : [],
            'timestamp' => now()->toIso8601String(),
        ];

        $resolvedTenant = ($nodeContext instanceof NodeContext) ? $nodeContext->resolveTenant() : null;
        $tenantUuid = $resolvedTenant?->uuid ?? null;

        try {
            OutboxEvent::create([
                'event_id' => (string) Str::uuid(),
                'event_type' => $eventType,
                'tenant_id' => $tenantUuid,
                'payload' => [
                    'event_type' => $eventType,
                    'source' => ['system' => 'fleetbase', 'module' => $this->resolveModule($model)],
                    'node_context' => $contextArray,
                    'payload' => $payload,
                ],
                'correlation_id' => $nodeContext?->correlationId ?? (string) Str::uuid(),
                'node_context' => $contextArray,
                'status' => 'pending',
            ]);
        } catch (\Exception $e) {
            report($e);
        }
    }

    protected function resolveModule(Model $model): string
    {
        $class = get_class($model);
        if (str_contains($class, 'FleetOps')) return 'fleetops';
        if (str_contains($class, 'Pallet')) return 'pallet';
        if (str_contains($class, 'Storefront')) return 'storefront';
        return 'core';
    }
}
