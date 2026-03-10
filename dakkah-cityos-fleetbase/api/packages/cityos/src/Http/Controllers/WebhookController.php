<?php

namespace Fleetbase\CityOS\Http\Controllers;

use Fleetbase\CityOS\Models\OutboxEvent;
use Fleetbase\CityOS\Services\CmsMappingService;
use Fleetbase\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class WebhookController extends Controller
{
    protected array $supportedCollections = [
        'tenants',
        'stores',
        'scopes',
        'categories',
        'subcategories',
        'portals',
        'governance-authorities',
        'policies',
        'personas',
        'persona-assignments',
        'countries',
        'compliance-records',
        'nodes',
        'pois',
        'products',
        'regions',
        'feature-flags',
        'channels',
        'surfaces',
    ];

    protected array $collectionEventMap = [
        'collection.create' => 'create',
        'collection.update' => 'update',
        'collection.delete' => 'delete',
    ];

    public function cmsWebhook(Request $request)
    {
        $signature = $request->header('X-CityOS-Signature');
        $payload = $request->all();
        $collection = $payload['collection'] ?? '';
        $operation = $payload['operation'] ?? '';
        $data = $payload['data'] ?? [];
        $correlationId = $request->header('X-CityOS-Correlation-Id', (string) Str::uuid());

        if (!in_array($collection, $this->supportedCollections)) {
            return response()->json([
                'success' => false,
                'error' => "Unsupported collection: {$collection}",
                'supported' => $this->supportedCollections,
            ], 400);
        }

        $webhookSecret = config('cityos.webhook.secret', env('FLEETBASE_WEBHOOK_SECRET'));
        if ($webhookSecret && $signature !== $webhookSecret) {
            Log::warning("CMS webhook signature mismatch for collection: {$collection}", [
                'correlation_id' => $correlationId,
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Invalid webhook signature',
            ], 401);
        }

        $eventType = "cms.{$collection}.{$operation}";

        $eventId = Str::uuid()->toString();
        OutboxEvent::create([
            'event_id' => $eventId,
            'event_type' => $eventType,
            'payload' => $payload,
            'status' => 'pending',
            'correlation_id' => $correlationId,
        ]);

        try {
            $mapper = new CmsMappingService();
            $syncResult = $this->processCmsEvent($mapper, $collection, $operation, $data);

            OutboxEvent::where('event_id', $eventId)
                ->update(['status' => 'published']);

            Log::info("CMS webhook processed: {$eventType}", [
                'collection' => $collection,
                'operation' => $operation,
                'correlation_id' => $correlationId,
                'result' => $syncResult,
            ]);

            return response()->json([
                'success' => true,
                'event' => $eventType,
                'syncResult' => $syncResult,
            ]);
        } catch (\Exception $e) {
            OutboxEvent::where('event_id', $eventId)
                ->update(['status' => 'failed']);

            Log::error("CMS webhook processing failed: {$e->getMessage()}", [
                'event_type' => $eventType,
                'correlation_id' => $correlationId,
                'exception' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    private function processCmsEvent(CmsMappingService $mapper, string $collection, string $operation, array $data): array
    {
        if ($operation === 'delete') {
            return ['action' => 'delete_acknowledged', 'collection' => $collection];
        }

        return match ($collection) {
            'countries' => $mapper->syncCountries([$data]),
            'governance-authorities' => $mapper->syncGovernanceAuthorities([$data]),
            'scopes' => $mapper->syncScopes([$data]),
            'categories' => $mapper->syncCategories([$data]),
            'subcategories' => $mapper->syncSubcategories([$data]),
            'tenants' => $mapper->syncTenants([$data]),
            'stores' => $mapper->syncStores([$data]),
            'portals' => $mapper->syncPortals([$data]),
            'policies' => $mapper->syncPolicies([$data]),
            'nodes' => $mapper->syncNodes([$data]),
            'personas', 'persona-assignments', 'compliance-records' => $this->processAuxiliaryCollection($collection, $data),
            default => ['action' => 'ignored', 'collection' => $collection],
        };
    }

    private function processAuxiliaryCollection(string $collection, array $data): array
    {
        Log::info("CMS webhook received for auxiliary collection: {$collection}", [
            'data_id' => $data['id'] ?? 'unknown',
        ]);

        return [
            'action' => 'received',
            'collection' => $collection,
            'record_id' => $data['id'] ?? null,
        ];
    }

    public function cmsEventWebhook(Request $request)
    {
        $signature = $request->header('X-CityOS-Signature');
        $payload = $request->all();
        $event = $payload['event'] ?? '';
        $collection = $payload['collection'] ?? '';
        $data = $payload['data'] ?? [];
        $correlationId = $request->header('X-CityOS-Correlation-Id', (string) Str::uuid());

        $webhookSecret = config('cityos.webhook.secret', env('FLEETBASE_WEBHOOK_SECRET'));
        if ($webhookSecret && $signature !== $webhookSecret) {
            Log::warning("CMS event webhook signature mismatch", [
                'correlation_id' => $correlationId,
                'event' => $event,
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Invalid webhook signature',
            ], 401);
        }

        $operation = $this->collectionEventMap[$event] ?? null;
        if (!$operation) {
            return response()->json([
                'success' => false,
                'error' => "Unsupported event: {$event}",
                'supported_events' => array_keys($this->collectionEventMap),
            ], 400);
        }

        $entityType = $this->mapCollectionToEntityType($collection);
        if (!$entityType) {
            return response()->json([
                'success' => false,
                'error' => "Unsupported collection: {$collection}",
            ], 400);
        }

        $eventType = "cms.{$entityType}.{$operation}";
        $eventId = Str::uuid()->toString();

        OutboxEvent::create([
            'event_id' => $eventId,
            'event_type' => $eventType,
            'payload' => $payload,
            'status' => 'pending',
            'correlation_id' => $correlationId,
        ]);

        try {
            $mapper = new CmsMappingService();
            $syncResult = $this->processCmsEvent($mapper, $entityType, $operation, $data);

            OutboxEvent::where('event_id', $eventId)
                ->update(['status' => 'published']);

            Log::info("CMS event webhook processed: {$eventType}", [
                'event' => $event,
                'collection' => $collection,
                'entity_type' => $entityType,
                'operation' => $operation,
                'correlation_id' => $correlationId,
                'result' => $syncResult,
            ]);

            return response()->json([
                'success' => true,
                'event' => $eventType,
                'entity_type' => $entityType,
                'operation' => $operation,
                'syncResult' => $syncResult,
            ]);
        } catch (\Exception $e) {
            OutboxEvent::where('event_id', $eventId)
                ->update(['status' => 'failed']);

            Log::error("CMS event webhook processing failed: {$e->getMessage()}", [
                'event_type' => $eventType,
                'correlation_id' => $correlationId,
                'exception' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    protected function mapCollectionToEntityType(string $collection): ?string
    {
        $map = [
            'tenants' => 'tenants',
            'stores' => 'stores',
            'scopes' => 'scopes',
            'categories' => 'categories',
            'subcategories' => 'subcategories',
            'portals' => 'portals',
            'governance-authorities' => 'governance-authorities',
            'policies' => 'policies',
            'countries' => 'countries',
            'nodes' => 'nodes',
            'pois' => 'pois',
            'products' => 'products',
            'regions' => 'regions',
            'feature-flags' => 'feature-flags',
            'channels' => 'channels',
            'surfaces' => 'surfaces',
            'personas' => 'personas',
            'persona-assignments' => 'persona-assignments',
            'compliance-records' => 'compliance-records',
        ];

        return $map[$collection] ?? null;
    }
}
