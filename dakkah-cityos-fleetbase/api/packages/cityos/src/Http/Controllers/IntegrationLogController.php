<?php

namespace Fleetbase\CityOS\Http\Controllers;

use Fleetbase\CityOS\Models\IntegrationLog;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

class IntegrationLogController extends Controller
{
    public function index(Request $request)
    {
        $query = IntegrationLog::orderBy('created_at', 'desc');

        if ($request->has('integration')) {
            $query->where('integration', $request->input('integration'));
        }

        if ($request->has('operation')) {
            $query->where('operation', $request->input('operation'));
        }

        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->has('direction')) {
            $query->where('direction', $request->input('direction'));
        }

        if ($request->has('date_from')) {
            $query->where('created_at', '>=', $request->input('date_from'));
        }

        if ($request->has('date_to')) {
            $query->where('created_at', '<=', $request->input('date_to'));
        }

        $perPage = $request->input('per_page', 25);
        $results = $query->paginate($perPage);

        return response()->json($results);
    }

    public function show(string $id)
    {
        $log = IntegrationLog::findOrFail($id);

        return response()->json(['integration_log' => $log]);
    }

    public function stats()
    {
        $statusCounts = IntegrationLog::selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        $totalCount = $statusCounts->sum();
        $successCount = $statusCounts->get('success', 0);
        $errorCount = $statusCounts->get('error', 0) + $statusCounts->get('failed', 0);
        $successRate = $totalCount > 0 ? round(($successCount / $totalCount) * 100, 2) : 0;

        $avgDuration = IntegrationLog::whereNotNull('duration_ms')->avg('duration_ms');

        $perIntegration = IntegrationLog::selectRaw('integration, status, count(*) as count')
            ->groupBy('integration', 'status')
            ->get()
            ->groupBy('integration')
            ->map(function ($items) {
                $grouped = $items->pluck('count', 'status');
                return [
                    'total' => $grouped->sum(),
                    'success' => $grouped->get('success', 0),
                    'error' => $grouped->get('error', 0) + $grouped->get('failed', 0),
                ];
            });

        return response()->json([
            'stats' => [
                'total' => $totalCount,
                'success_count' => $successCount,
                'error_count' => $errorCount,
                'success_rate' => $successRate,
                'avg_duration_ms' => $avgDuration ? round($avgDuration, 2) : null,
                'by_status' => $statusCounts,
                'by_integration' => $perIntegration,
            ],
        ]);
    }

    public function purge(Request $request)
    {
        $days = $request->input('days', 90);
        $cutoff = now()->subDays($days);

        $deleted = IntegrationLog::where('created_at', '<', $cutoff)->delete();

        return response()->json([
            'success' => true,
            'deleted_count' => $deleted,
            'older_than_days' => $days,
            'cutoff_date' => $cutoff->toIso8601String(),
        ]);
    }
}
