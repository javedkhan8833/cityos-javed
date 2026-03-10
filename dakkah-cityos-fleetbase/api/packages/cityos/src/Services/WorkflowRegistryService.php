<?php

namespace Fleetbase\CityOS\Services;

use Fleetbase\CityOS\Models\WorkflowRegistry;
use Illuminate\Support\Carbon;

class WorkflowRegistryService
{
    protected QueueSystemMapService $queueMap;
    protected TemporalService $temporal;

    public function __construct()
    {
        $this->queueMap = new QueueSystemMapService();
        $this->temporal = new TemporalService();
    }

    public function syncFromTemporal(): array
    {
        $result = $this->temporal->listWorkflows(100);

        if (!$result['success']) {
            return ['success' => false, 'error' => $result['error'] ?? 'Failed to list workflows'];
        }

        $executions = $result['data']['executions'] ?? [];
        $typeMap = [];

        foreach ($executions as $exec) {
            $type = $exec['type'] ?? 'unknown';
            $queue = $exec['task_queue'] ?? null;
            $status = $exec['status'] ?? 'UNSPECIFIED';

            if (!isset($typeMap[$type])) {
                $typeMap[$type] = [
                    'task_queues' => [],
                    'status_counts' => [],
                    'execution_count' => 0,
                ];
            }

            if ($queue && !in_array($queue, $typeMap[$type]['task_queues'])) {
                $typeMap[$type]['task_queues'][] = $queue;
            }

            $typeMap[$type]['status_counts'][$status] = ($typeMap[$type]['status_counts'][$status] ?? 0) + 1;
            $typeMap[$type]['execution_count']++;
        }

        $synced = [];
        $now = Carbon::now();

        foreach ($typeMap as $workflowType => $data) {
            $tags = $this->queueMap->inferTags($workflowType, $data['task_queues']);
            $primarySystem = $this->queueMap->inferPrimarySystem($data['task_queues']);
            $domain = $this->queueMap->inferDomain($data['task_queues']);

            $existing = WorkflowRegistry::where('workflow_type', $workflowType)->first();

            if ($existing) {
                $mergedQueues = array_values(array_unique(array_merge(
                    $existing->task_queues ?? [],
                    $data['task_queues']
                )));
                $mergedTags = $this->queueMap->inferTags($workflowType, $mergedQueues);

                $mergedStatusCounts = $existing->status_counts ?? [];
                foreach ($data['status_counts'] as $status => $count) {
                    $mergedStatusCounts[$status] = ($mergedStatusCounts[$status] ?? 0) + $count;
                }

                $existing->update([
                    'task_queues' => $mergedQueues,
                    'tags' => $mergedTags,
                    'status_counts' => $mergedStatusCounts,
                    'execution_count' => $existing->execution_count + $data['execution_count'],
                    'last_seen_at' => $now,
                    'is_active' => true,
                    'domain_pack' => $domain,
                    'source_system' => $primarySystem,
                ]);

                $synced[] = $existing;
            } else {
                $displayName = $this->formatDisplayName($workflowType);

                $entry = WorkflowRegistry::create([
                    'workflow_type' => $workflowType,
                    'display_name' => $displayName,
                    'description' => "Discovered from Temporal Cloud. Domain: {$domain}. {$data['execution_count']} execution(s)",
                    'domain_pack' => $domain,
                    'source' => 'discovered',
                    'source_system' => $primarySystem,
                    'is_active' => true,
                    'execution_count' => $data['execution_count'],
                    'task_queues' => $data['task_queues'],
                    'tags' => $tags,
                    'status_counts' => $data['status_counts'],
                    'first_seen_at' => $now,
                    'last_seen_at' => $now,
                ]);

                $synced[] = $entry;
            }
        }

        return [
            'success' => true,
            'synced_count' => count($synced),
            'workflow_types' => array_keys($typeMap),
            'total_executions' => count($executions),
        ];
    }

    public function query(array $filters = []): array
    {
        $query = WorkflowRegistry::query();

        if (!empty($filters['system'])) {
            $system = $filters['system'];
            $query->where(function ($q) use ($system) {
                $q->where('source_system', $system)
                  ->orWhereJsonContains('tags', 'system:' . $system);
            });
        }

        if (!empty($filters['domainPack'])) {
            $query->where('domain_pack', $filters['domainPack']);
        }

        if (!empty($filters['source'])) {
            $query->where('source', $filters['source']);
        }

        if (!empty($filters['queue'])) {
            $query->whereJsonContains('task_queues', $filters['queue']);
        }

        if (isset($filters['isActive'])) {
            $query->where('is_active', filter_var($filters['isActive'], FILTER_VALIDATE_BOOLEAN));
        }

        if (!empty($filters['tags'])) {
            $tagList = is_array($filters['tags']) ? $filters['tags'] : explode(',', $filters['tags']);
            foreach ($tagList as $tag) {
                $query->whereJsonContains('tags', trim($tag));
            }
        }

        if (!empty($filters['search'])) {
            $search = '%' . $filters['search'] . '%';
            $query->where(function ($q) use ($search) {
                $q->where('workflow_type', 'ilike', $search)
                  ->orWhere('display_name', 'ilike', $search)
                  ->orWhere('description', 'ilike', $search);
            });
        }

        return $query->orderBy('execution_count', 'desc')->get()->toArray();
    }

    public function register(array $data): WorkflowRegistry
    {
        $taskQueues = $data['taskQueues'] ?? $data['task_queues'] ?? [];
        $tags = $data['tags'] ?? $this->queueMap->inferTags($data['workflowType'] ?? '', $taskQueues);
        $sourceSystem = $data['sourceSystem'] ?? $data['source_system'] ?? $this->queueMap->inferPrimarySystem($taskQueues);
        $domainPack = $data['domainPack'] ?? $data['domain_pack'] ?? $this->queueMap->inferDomain($taskQueues);

        $existing = WorkflowRegistry::where('workflow_type', $data['workflowType'] ?? $data['workflow_type'])->first();

        if ($existing) {
            $mergedQueues = array_values(array_unique(array_merge(
                $existing->task_queues ?? [],
                $taskQueues
            )));

            $existing->update([
                'display_name' => $data['displayName'] ?? $data['display_name'] ?? $existing->display_name,
                'description' => $data['description'] ?? $existing->description,
                'domain_pack' => $domainPack,
                'source_system' => $sourceSystem,
                'task_queues' => $mergedQueues,
                'tags' => array_values(array_unique(array_merge($existing->tags ?? [], $tags))),
                'input_schema' => $data['inputSchema'] ?? $data['input_schema'] ?? $existing->input_schema,
                'output_schema' => $data['outputSchema'] ?? $data['output_schema'] ?? $existing->output_schema,
                'retry_policy' => $data['retryPolicy'] ?? $data['retry_policy'] ?? $existing->retry_policy,
                'last_seen_at' => Carbon::now(),
            ]);

            return $existing->fresh();
        }

        return WorkflowRegistry::create([
            'workflow_type' => $data['workflowType'] ?? $data['workflow_type'],
            'display_name' => $data['displayName'] ?? $data['display_name'] ?? $this->formatDisplayName($data['workflowType'] ?? $data['workflow_type'] ?? ''),
            'description' => $data['description'] ?? null,
            'domain_pack' => $domainPack,
            'source' => 'registered',
            'source_system' => $sourceSystem,
            'is_active' => true,
            'execution_count' => 0,
            'task_queues' => $taskQueues,
            'tags' => $tags,
            'status_counts' => [],
            'input_schema' => $data['inputSchema'] ?? $data['input_schema'] ?? null,
            'output_schema' => $data['outputSchema'] ?? $data['output_schema'] ?? null,
            'retry_policy' => $data['retryPolicy'] ?? $data['retry_policy'] ?? null,
            'first_seen_at' => Carbon::now(),
            'last_seen_at' => Carbon::now(),
        ]);
    }

    public function getDefinitions(array $filters = []): array
    {
        return $this->query(array_merge($filters, ['source' => 'registered']));
    }

    protected function formatDisplayName(string $workflowType): string
    {
        $name = str_replace(['-', '_', '.'], ' ', $workflowType);
        return ucwords($name);
    }
}
