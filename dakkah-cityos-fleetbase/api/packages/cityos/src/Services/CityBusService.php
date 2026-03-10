<?php

namespace Fleetbase\CityOS\Services;

use Fleetbase\CityOS\Models\OutboxEvent;
use Fleetbase\CityOS\Models\IntegrationLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CityBusService
{
    protected TemporalService $temporal;
    protected PayloadCMSService $cms;
    protected ERPNextService $erpnext;

    public function __construct()
    {
        $this->temporal = app(TemporalService::class);
        $this->cms = app(PayloadCMSService::class);
        $this->erpnext = app(ERPNextService::class);
    }

    public function publish(string $eventType, array $payload, array $nodeContext = [], string $tenantId = null): OutboxEvent
    {
        $eventId = (string) Str::uuid();
        $correlationId = $payload['correlation_id'] ?? (string) Str::uuid();

        $envelope = [
            'event_id' => $eventId,
            'event_type' => $eventType,
            'version' => '1.0',
            'timestamp' => now()->toIso8601String(),
            'source' => [
                'system' => 'fleetbase',
                'service' => 'cityos-api',
            ],
            'node_context' => $nodeContext,
            'correlation' => [
                'correlation_id' => $correlationId,
                'causation_id' => $payload['causation_id'] ?? null,
            ],
            'payload' => $payload,
            'metadata' => [
                'retry_count' => 0,
                'first_published' => now()->toIso8601String(),
                'idempotency_key' => $payload['idempotency_key'] ?? null,
            ],
        ];

        return OutboxEvent::create([
            'event_id' => $eventId,
            'event_type' => $eventType,
            'tenant_id' => $tenantId,
            'payload' => $envelope,
            'correlation_id' => $correlationId,
            'node_context' => $nodeContext,
            'status' => 'pending',
        ]);
    }

    public function publishWithTransaction(string $eventType, array $payload, callable $businessLogic, array $nodeContext = [], string $tenantId = null): array
    {
        return DB::transaction(function () use ($eventType, $payload, $businessLogic, $nodeContext, $tenantId) {
            $businessResult = $businessLogic();
            $event = $this->publish($eventType, $payload, $nodeContext, $tenantId);
            return ['result' => $businessResult, 'event' => $event];
        });
    }

    public function dispatchPending(int $batchSize = 50): array
    {
        $events = OutboxEvent::where('status', 'pending')
            ->orWhere(function ($q) {
                $q->where('status', 'failed')
                    ->where('next_retry_at', '<=', now())
                    ->whereColumn('retry_count', '<', 'max_retries');
            })
            ->orderBy('created_at')
            ->limit($batchSize)
            ->get();

        $results = ['published' => 0, 'failed' => 0, 'total' => $events->count()];

        foreach ($events as $event) {
            try {
                $this->routeEvent($event);
                $event->markPublished();
                $results['published']++;
            } catch (\Exception $e) {
                $event->markFailed($e->getMessage());
                $results['failed']++;
            }
        }

        return $results;
    }

    protected function routeEvent(OutboxEvent $event): void
    {
        $type = $event->event_type;

        if (in_array($type, ['DELIVERY_CREATED', 'DELIVERY_DISPATCHED', 'DELIVERY_FAILED', 'PROVIDER_REGISTERED'])) {
            $workflowMap = [
                'DELIVERY_CREATED' => 'DeliveryDispatchOrchestration',
                'DELIVERY_DISPATCHED' => 'DeliveryTrackingWorkflow',
                'DELIVERY_FAILED' => 'DeliveryExceptionEscalation',
                'PROVIDER_REGISTERED' => 'ProviderOnboardingApproval',
            ];

            $workflowType = $workflowMap[$type];
            $workflowId = "{$type}-{$event->event_id}";
            $this->temporal->startWorkflow($workflowType, $workflowId, $event->payload);
        }

        if (in_array($type, ['DELIVERY_COMPLETED', 'COD_COLLECTED', 'SLA_PENALTY'])) {
            $erpMap = [
                'DELIVERY_COMPLETED' => 'postDeliverySettlement',
                'COD_COLLECTED' => 'postCODCollection',
                'SLA_PENALTY' => 'postPenalty',
            ];

            $method = $erpMap[$type];
            $this->erpnext->$method($event->payload['payload'] ?? $event->payload);
        }

        IntegrationLog::logRequest('citybus', 'dispatch_event', [
            'request_data' => ['event_type' => $type, 'event_id' => $event->event_id],
            'status' => 'success',
        ]);
    }

    public function getOutboxStats(): array
    {
        return [
            'pending' => OutboxEvent::where('status', 'pending')->count(),
            'published' => OutboxEvent::where('status', 'published')->count(),
            'failed' => OutboxEvent::where('status', 'failed')->count(),
            'dead_letter' => OutboxEvent::where('status', 'dead_letter')->count(),
            'total' => OutboxEvent::count(),
        ];
    }

    public function getRecentEvents(int $limit = 20): array
    {
        return OutboxEvent::orderBy('created_at', 'desc')
            ->limit($limit)
            ->get()
            ->toArray();
    }
}
