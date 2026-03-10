<?php

namespace Fleetbase\CityOS\Http\Controllers;

use Fleetbase\CityOS\Services\TemporalService;
use Fleetbase\CityOS\Services\WorkflowRegistryService;
use Fleetbase\CityOS\Temporal\Workflows\AbstractWorkflow;
use Fleetbase\CityOS\Models\IntegrationLog;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Str;

class WorkflowDashboardController extends Controller
{
    protected TemporalService $temporal;
    protected WorkflowRegistryService $registry;

    public function __construct()
    {
        $this->temporal = new TemporalService();
        $this->registry = new WorkflowRegistryService();
    }

    public function dashboard(Request $request)
    {
        $stats = [
            'running' => 0,
            'completed' => 0,
            'failed' => 0,
            'canceled' => 0,
            'terminated' => 0,
            'timed_out' => 0,
            'total' => 0,
        ];

        $result = $this->temporal->listWorkflows(100);

        if ($result['success'] ?? false) {
            $executions = $result['data']['executions'] ?? [];
            $stats['total'] = count($executions);

            foreach ($executions as $exec) {
                $status = strtolower($exec['status'] ?? 'unspecified');
                if (str_contains($status, 'running')) {
                    $stats['running']++;
                } elseif (str_contains($status, 'completed')) {
                    $stats['completed']++;
                } elseif (str_contains($status, 'failed')) {
                    $stats['failed']++;
                } elseif (str_contains($status, 'cancel')) {
                    $stats['canceled']++;
                } elseif (str_contains($status, 'terminat')) {
                    $stats['terminated']++;
                } elseif (str_contains($status, 'timed_out') || str_contains($status, 'timeout')) {
                    $stats['timed_out']++;
                }
            }
        }

        $definitions = AbstractWorkflow::getAllDefinitions();
        $registeredCount = count($this->registry->getDefinitions());

        return response()->json([
            'stats' => $stats,
            'definitions_count' => count($definitions),
            'registered_count' => $registeredCount,
            'temporal_connected' => $this->temporal->isGrpcAvailable(),
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    public function executions(Request $request)
    {
        $pageSize = (int) $request->input('page_size', 20);
        $query = $request->input('query', '');
        $workflowType = $request->input('workflow_type');
        $status = $request->input('status');

        $filters = [];
        if ($workflowType) {
            $filters[] = "WorkflowType = '{$workflowType}'";
        }
        if ($status) {
            $filters[] = "ExecutionStatus = '{$status}'";
        }
        if ($query) {
            $filters[] = $query;
        }

        $filterQuery = implode(' AND ', $filters);
        $result = $this->temporal->listWorkflows($pageSize, $filterQuery);

        if (!($result['success'] ?? false)) {
            return response()->json([
                'success' => false,
                'error' => $result['error'] ?? 'Failed to list workflow executions',
                'executions' => [],
            ], 502);
        }

        return response()->json([
            'success' => true,
            'executions' => $result['data']['executions'] ?? [],
            'total' => count($result['data']['executions'] ?? []),
        ]);
    }

    public function executionDetail(Request $request, string $id)
    {
        $runId = $request->input('run_id');
        $result = $this->temporal->queryWorkflow($id, $runId);

        if (!($result['success'] ?? false)) {
            return response()->json([
                'success' => false,
                'error' => $result['error'] ?? 'Failed to get workflow execution detail',
            ], $result['error'] === 'gRPC extension not loaded' ? 503 : 404);
        }

        return response()->json([
            'success' => true,
            'execution' => $result,
        ]);
    }

    public function cancel(Request $request, string $id)
    {
        $reason = $request->input('reason', 'Cancelled via dashboard');
        $runId = $request->input('run_id');

        $result = $this->temporal->signalWorkflow($id, '__cancel', ['reason' => $reason], $runId);

        if (!($result['success'] ?? false)) {
            return response()->json([
                'success' => false,
                'error' => $result['error'] ?? 'Failed to cancel workflow',
            ], 502);
        }

        return response()->json([
            'success' => true,
            'workflow_id' => $id,
            'action' => 'cancelled',
            'reason' => $reason,
        ]);
    }

    public function terminate(Request $request, string $id)
    {
        $reason = $request->input('reason', 'Terminated via dashboard');
        $runId = $request->input('run_id');

        $result = $this->temporal->terminateWorkflow($id, $reason, $runId);

        if (!($result['success'] ?? false)) {
            return response()->json([
                'success' => false,
                'error' => $result['error'] ?? 'Failed to terminate workflow',
            ], 502);
        }

        return response()->json([
            'success' => true,
            'workflow_id' => $id,
            'action' => 'terminated',
            'reason' => $reason,
        ]);
    }

    public function start(Request $request)
    {
        $validated = $request->validate([
            'workflow_type' => 'required|string|max:255',
            'input' => 'nullable|array',
            'task_queue' => 'nullable|string|max:255',
            'workflow_id' => 'nullable|string|max:255',
        ]);

        $workflowType = $validated['workflow_type'];
        $input = $validated['input'] ?? [];
        $taskQueue = $validated['task_queue'] ?? null;
        $workflowId = $validated['workflow_id'] ?? null;

        $definitions = AbstractWorkflow::getAllDefinitions();
        $matchedDef = null;
        foreach ($definitions as $def) {
            if ($def['workflow_type'] === $workflowType) {
                $matchedDef = $def;
                break;
            }
        }

        if (!$taskQueue && $matchedDef) {
            $taskQueue = $matchedDef['task_queue'];
        }
        $taskQueue = $taskQueue ?: 'cityos-default';

        if (!$workflowId) {
            $workflowId = $workflowType . '-' . Str::uuid()->toString();
        }

        $result = $this->temporal->startWorkflow($workflowType, $workflowId, $input, $taskQueue);

        $statusCode = ($result['success'] ?? false) ? 201 : 502;

        return response()->json(array_merge($result, [
            'definition' => $matchedDef,
        ]), $statusCode);
    }

    public function definitions(Request $request)
    {
        $builtIn = AbstractWorkflow::getAllDefinitions();

        $registered = $this->registry->getDefinitions([
            'system' => $request->input('system'),
            'domainPack' => $request->input('domain_pack'),
        ]);

        return response()->json([
            'built_in' => $builtIn,
            'registered' => $registered,
            'total' => count($builtIn) + count($registered),
        ]);
    }

    public function activityLog(Request $request)
    {
        $limit = (int) $request->input('limit', 50);
        $service = $request->input('service', 'temporal');

        $logs = IntegrationLog::where('service', $service)
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get()
            ->toArray();

        return response()->json([
            'logs' => $logs,
            'total' => count($logs),
            'service' => $service,
        ]);
    }
}
