<?php

namespace Fleetbase\CityOS\Console\Commands;

use Fleetbase\CityOS\Services\TemporalService;
use Fleetbase\CityOS\Services\WorkflowRegistryService;
use Illuminate\Console\Command;

class TemporalCommand extends Command
{
    protected $signature = 'cityos:temporal
        {operation : The operation to perform (health|namespace|list|start|describe|signal|sync|terminate)}
        {--workflow-id= : Workflow ID for start/describe/signal/terminate}
        {--workflow-type= : Workflow type for start}
        {--task-queue=cityos-workflow-queue : Task queue for start}
        {--run-id= : Run ID for describe/signal}
        {--signal-name= : Signal name for signal operation}
        {--input= : JSON input for start/signal}
        {--page-size=20 : Page size for list}
        {--query= : Query filter for list}
        {--reason= : Reason for terminate}
        {--json : Output as raw JSON (for CLI bridge)}';

    protected $description = 'Temporal Cloud operations: health, namespace, list, start, describe, signal, sync, terminate';

    public function handle(): int
    {
        $operation = $this->argument('operation');
        $jsonMode = $this->option('json');

        try {
            $result = match ($operation) {
                'health' => $this->opHealth(),
                'namespace' => $this->opNamespace(),
                'list' => $this->opList(),
                'start' => $this->opStart(),
                'describe' => $this->opDescribe(),
                'signal' => $this->opSignal(),
                'sync' => $this->opSync(),
                'terminate' => $this->opTerminate(),
                default => ['success' => false, 'error' => "Unknown operation: {$operation}"],
            };

            if ($jsonMode) {
                $this->line(json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
            } else {
                $this->renderResult($operation, $result);
            }

            return ($result['success'] ?? false) ? 0 : 1;
        } catch (\Exception $e) {
            $error = ['success' => false, 'error' => $e->getMessage()];
            if ($jsonMode) {
                $this->line(json_encode($error, JSON_PRETTY_PRINT));
            } else {
                $this->error("Operation failed: {$e->getMessage()}");
            }
            return 1;
        }
    }

    protected function getTemporal(): TemporalService
    {
        return app(TemporalService::class);
    }

    protected function opHealth(): array
    {
        $temporal = $this->getTemporal();
        $info = $temporal->getConnectionInfo();
        return array_merge(['success' => $info['health']['reachable'] ?? false], $info);
    }

    protected function opNamespace(): array
    {
        return $this->getTemporal()->describeNamespace();
    }

    protected function opList(): array
    {
        $pageSize = (int) $this->option('page-size');
        $query = $this->option('query') ?? '';
        return $this->getTemporal()->listWorkflows($pageSize, $query);
    }

    protected function opStart(): array
    {
        $workflowId = $this->option('workflow-id');
        $workflowType = $this->option('workflow-type');

        if (!$workflowId || !$workflowType) {
            return ['success' => false, 'error' => '--workflow-id and --workflow-type are required for start'];
        }

        $taskQueue = $this->option('task-queue');
        $input = $this->option('input') ? json_decode($this->option('input'), true) : [];

        return $this->getTemporal()->startWorkflow($workflowType, $workflowId, $input ?: [], $taskQueue);
    }

    protected function opDescribe(): array
    {
        $workflowId = $this->option('workflow-id');
        if (!$workflowId) {
            return ['success' => false, 'error' => '--workflow-id is required for describe'];
        }

        return $this->getTemporal()->queryWorkflow($workflowId, $this->option('run-id'));
    }

    protected function opSignal(): array
    {
        $workflowId = $this->option('workflow-id');
        $signalName = $this->option('signal-name');

        if (!$workflowId || !$signalName) {
            return ['success' => false, 'error' => '--workflow-id and --signal-name are required for signal'];
        }

        $payload = $this->option('input') ? json_decode($this->option('input'), true) : [];

        return $this->getTemporal()->signalWorkflow(
            $workflowId,
            $signalName,
            $payload ?: [],
            $this->option('run-id')
        );
    }

    protected function opSync(): array
    {
        $registry = new WorkflowRegistryService();
        return $registry->syncFromTemporal();
    }

    protected function opTerminate(): array
    {
        $workflowId = $this->option('workflow-id');
        if (!$workflowId) {
            return ['success' => false, 'error' => '--workflow-id is required for terminate'];
        }

        $reason = $this->option('reason') ?? 'Terminated via CLI';
        return $this->getTemporal()->terminateWorkflow($workflowId, $reason, $this->option('run-id'));
    }

    protected function renderResult(string $operation, array $result): void
    {
        $success = $result['success'] ?? false;

        if ($success) {
            $this->info("✓ {$operation} succeeded");
        } else {
            $this->error("✗ {$operation} failed: " . ($result['error'] ?? 'Unknown error'));
        }

        $this->newLine();

        match ($operation) {
            'health' => $this->renderHealth($result),
            'namespace' => $this->renderNamespace($result),
            'list' => $this->renderList($result),
            'start' => $this->renderStart($result),
            'describe' => $this->renderDescribe($result),
            'signal' => $this->renderSignal($result),
            'sync' => $this->renderSync($result),
            'terminate' => $this->renderTerminate($result),
            default => $this->line(json_encode($result, JSON_PRETTY_PRINT)),
        };
    }

    protected function renderHealth(array $result): void
    {
        $this->table(['Property', 'Value'], [
            ['gRPC Address', $result['grpc_address'] ?? 'N/A'],
            ['Namespace', $result['namespace'] ?? 'N/A'],
            ['Configured', ($result['configured'] ?? false) ? 'Yes' : 'No'],
            ['gRPC Extension', $result['grpc_extension'] ?? 'N/A'],
            ['Reachable', ($result['health']['reachable'] ?? false) ? 'Yes' : 'No'],
            ['Duration', ($result['health']['duration_ms'] ?? 0) . 'ms'],
        ]);

        if (isset($result['health']['server_capabilities'])) {
            $this->info('Server Capabilities:');
            foreach ($result['health']['server_capabilities'] as $cap => $val) {
                $this->line("  {$cap}: " . ($val ? 'true' : 'false'));
            }
        }
    }

    protected function renderNamespace(array $result): void
    {
        if (isset($result['data'])) {
            $this->table(['Property', 'Value'], collect($result['data'])->map(fn ($v, $k) => [$k, is_bool($v) ? ($v ? 'true' : 'false') : ($v ?? 'N/A')])->values()->all());
        }
    }

    protected function renderList(array $result): void
    {
        $executions = $result['data']['executions'] ?? [];
        if (empty($executions)) {
            $this->warn('No workflow executions found.');
            return;
        }

        $rows = collect($executions)->map(fn ($e) => [
            $e['workflow_id'] ?? 'N/A',
            $e['type'] ?? 'N/A',
            $e['status'] ?? 'N/A',
            $e['task_queue'] ?? 'N/A',
            $e['history_length'] ?? 0,
        ])->all();

        $this->table(['Workflow ID', 'Type', 'Status', 'Task Queue', 'History'], $rows);
        $this->info("Total: " . count($executions) . " executions");
    }

    protected function renderStart(array $result): void
    {
        $this->table(['Property', 'Value'], [
            ['Workflow ID', $result['workflow_id'] ?? 'N/A'],
            ['Run ID', $result['run_id'] ?? 'N/A'],
            ['Type', $result['workflow_type'] ?? 'N/A'],
            ['Task Queue', $result['task_queue'] ?? 'N/A'],
            ['Mode', $result['mode'] ?? 'N/A'],
            ['Correlation ID', $result['correlation_id'] ?? 'N/A'],
        ]);
    }

    protected function renderDescribe(array $result): void
    {
        if (isset($result['data'])) {
            $this->table(['Property', 'Value'], collect($result['data'])->map(fn ($v, $k) => [$k, is_array($v) ? json_encode($v) : ($v ?? 'N/A')])->values()->all());
        }
    }

    protected function renderSignal(array $result): void
    {
        $this->table(['Property', 'Value'], [
            ['Workflow ID', $result['workflow_id'] ?? 'N/A'],
            ['Signal', $result['signal_name'] ?? 'N/A'],
            ['Mode', $result['mode'] ?? 'N/A'],
            ['Duration', ($result['duration_ms'] ?? 0) . 'ms'],
        ]);
    }

    protected function renderSync(array $result): void
    {
        $this->table(['Property', 'Value'], [
            ['Synced Count', $result['synced_count'] ?? 0],
            ['Total Executions', $result['total_executions'] ?? 0],
            ['Workflow Types', implode(', ', $result['workflow_types'] ?? [])],
        ]);
    }

    protected function renderTerminate(array $result): void
    {
        $this->table(['Property', 'Value'], [
            ['Workflow ID', $result['workflow_id'] ?? 'N/A'],
            ['Duration', ($result['duration_ms'] ?? 0) . 'ms'],
        ]);
    }
}
