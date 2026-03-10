<?php

namespace Fleetbase\CityOS\Http\Controllers;

use Fleetbase\CityOS\Models\IntegrationLog;
use Fleetbase\CityOS\Services\CmsSyncConflictResolver;
use Fleetbase\CityOS\Services\PayloadCMSService;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class CmsSyncDashboardController extends Controller
{
    public function status()
    {
        $cms = app(PayloadCMSService::class);

        return response()->json([
            'success' => true,
            'configured' => $cms->isConfigured(),
            'sync_status' => $cms->getLastSyncStatus(),
            'health' => $cms->isConfigured() ? $cms->getHealth() : ['success' => false, 'error' => 'Not configured'],
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    public function history(Request $request)
    {
        $entityType = $request->input('entity_type', 'all');
        $limit = (int) $request->input('limit', 50);
        $status = $request->input('status');
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');

        $query = IntegrationLog::where('integration', 'payload_cms')
            ->where('operation', 'like', 'sync_%')
            ->orderBy('created_at', 'desc');

        if ($entityType !== 'all') {
            $query->where('operation', 'like', "sync_{$entityType}%");
        }

        if ($status) {
            $query->where('status', $status);
        }

        if ($dateFrom) {
            $query->where('created_at', '>=', $dateFrom);
        }

        if ($dateTo) {
            $query->where('created_at', '<=', $dateTo);
        }

        $logs = $query->limit($limit)->get();

        return response()->json([
            'success' => true,
            'history' => $logs->map(function ($log) {
                return [
                    'id' => $log->id,
                    'operation' => $log->operation,
                    'direction' => $log->direction,
                    'status' => $log->status,
                    'correlation_id' => $log->correlation_id,
                    'duration_ms' => $log->duration_ms,
                    'request_data' => $log->request_data,
                    'response_data' => $log->response_data,
                    'created_at' => $log->created_at->toIso8601String(),
                ];
            }),
            'total' => $logs->count(),
            'filters' => [
                'entity_type' => $entityType,
                'status' => $status,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
            ],
        ]);
    }

    public function trigger(Request $request)
    {
        $entityType = $request->input('entity_type');
        $direction = $request->input('direction', 'both');

        if (!in_array($direction, ['pull', 'push', 'both'])) {
            return response()->json([
                'success' => false,
                'error' => 'Invalid direction. Must be one of: pull, push, both',
            ], 422);
        }

        $cms = app(PayloadCMSService::class);

        if (!$cms->isConfigured()) {
            return response()->json([
                'success' => false,
                'error' => 'Payload CMS is not configured. Set CITYOS_CMS_BASE_URL and CITYOS_CMS_API_KEY.',
            ], 503);
        }

        try {
            if ($entityType) {
                $result = match ($entityType) {
                    'nodes' => $cms->syncNodes($direction),
                    'tenants' => $cms->syncTenants($direction),
                    'pois' => $cms->syncPOIs($direction),
                    'storage' => $cms->syncStorage($direction),
                    'categories' => $cms->syncCategories($direction),
                    'products' => $cms->syncProducts($direction),
                    default => ['success' => false, 'error' => "Unknown entity type: {$entityType}"],
                };
            } else {
                $result = $cms->fullSync([
                    'direction' => $direction,
                ]);
            }

            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function conflicts(Request $request)
    {
        $resolver = app(CmsSyncConflictResolver::class);
        $entityType = $request->input('entity_type');

        $conflicts = $resolver->getConflicts($entityType);

        return response()->json([
            'success' => true,
            'conflicts' => $conflicts,
            'total' => count($conflicts),
            'entity_type' => $entityType,
        ]);
    }

    public function resolveConflict(Request $request, string $id)
    {
        $strategy = $request->input('strategy', 'remote_wins');

        if (!in_array($strategy, ['local_wins', 'remote_wins', 'merge', 'manual'])) {
            return response()->json([
                'success' => false,
                'error' => 'Invalid strategy. Must be one of: local_wins, remote_wins, merge, manual',
            ], 422);
        }

        $resolver = app(CmsSyncConflictResolver::class);
        $conflict = $resolver->getConflictById($id);

        if (!$conflict) {
            return response()->json([
                'success' => false,
                'error' => 'Conflict not found',
            ], 404);
        }

        $result = $resolver->resolveConflict($conflict, $strategy);

        return response()->json($result);
    }

    public function resolveAllConflicts(Request $request)
    {
        $strategy = $request->input('strategy', 'remote_wins');

        if (!in_array($strategy, ['local_wins', 'remote_wins', 'merge', 'manual'])) {
            return response()->json([
                'success' => false,
                'error' => 'Invalid strategy. Must be one of: local_wins, remote_wins, merge, manual',
            ], 422);
        }

        $resolver = app(CmsSyncConflictResolver::class);
        $result = $resolver->resolveAll($strategy);

        return response()->json($result);
    }

    public function config()
    {
        return response()->json([
            'success' => true,
            'config' => [
                'base_url' => config('cityos.cms.base_url', ''),
                'sync_interval' => config('cityos.cms.sync_interval', 'everyFiveMinutes'),
                'enabled_entity_types' => config('cityos.cms.enabled_entity_types', [
                    'nodes', 'tenants', 'categories', 'pois', 'products', 'storage',
                ]),
                'conflict_resolution_strategy' => config('cityos.cms.conflict_strategy', 'remote_wins'),
                'webhook_enabled' => !empty(config('cityos.webhook.secret')),
                'is_configured' => app(PayloadCMSService::class)->isConfigured(),
            ],
        ]);
    }

    public function updateConfig(Request $request)
    {
        $validIntervals = [
            'everyMinute', 'everyFiveMinutes', 'everyTenMinutes',
            'everyFifteenMinutes', 'everyThirtyMinutes', 'hourly', 'daily',
        ];

        $interval = $request->input('sync_interval');
        if ($interval && !in_array($interval, $validIntervals)) {
            return response()->json([
                'success' => false,
                'error' => 'Invalid sync_interval. Valid values: ' . implode(', ', $validIntervals),
            ], 422);
        }

        $updates = [];

        if ($interval) {
            config(['cityos.cms.sync_interval' => $interval]);
            $updates['sync_interval'] = $interval;
        }

        $entityTypes = $request->input('enabled_entity_types');
        if ($entityTypes && is_array($entityTypes)) {
            config(['cityos.cms.enabled_entity_types' => $entityTypes]);
            $updates['enabled_entity_types'] = $entityTypes;
        }

        $conflictStrategy = $request->input('conflict_resolution_strategy');
        if ($conflictStrategy && in_array($conflictStrategy, ['local_wins', 'remote_wins', 'merge', 'manual'])) {
            config(['cityos.cms.conflict_strategy' => $conflictStrategy]);
            $updates['conflict_resolution_strategy'] = $conflictStrategy;
        }

        return response()->json([
            'success' => true,
            'updated' => $updates,
            'message' => 'Configuration updated for current runtime. Persist changes in environment variables for permanent effect.',
        ]);
    }
}
