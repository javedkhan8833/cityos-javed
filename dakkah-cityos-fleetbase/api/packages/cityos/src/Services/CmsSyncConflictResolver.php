<?php

namespace Fleetbase\CityOS\Services;

use Fleetbase\CityOS\Models\IntegrationLog;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class CmsSyncConflictResolver
{
    protected string $cachePrefix = 'cityos_cms_conflicts';

    public function detectConflicts(array $localData, array $remoteData): array
    {
        $conflicts = [];

        $remoteIndex = [];
        foreach ($remoteData as $item) {
            $key = $item['id'] ?? $item['slug'] ?? $item['code'] ?? null;
            if ($key) {
                $remoteIndex[$key] = $item;
            }
        }

        foreach ($localData as $localItem) {
            $key = $localItem['cms_node_id']
                ?? $localItem['cms_tenant_id']
                ?? $localItem['cms_category_id']
                ?? $localItem['cms_store_id']
                ?? $localItem['slug']
                ?? $localItem['code']
                ?? null;

            if (!$key || !isset($remoteIndex[$key])) {
                continue;
            }

            $remoteItem = $remoteIndex[$key];
            $fieldConflicts = $this->compareFields($localItem, $remoteItem);

            if (!empty($fieldConflicts)) {
                $conflicts[] = [
                    'id' => (string) Str::uuid(),
                    'entity_key' => $key,
                    'entity_type' => $this->detectEntityType($localItem),
                    'local_updated_at' => $localItem['updated_at'] ?? null,
                    'remote_updated_at' => $remoteItem['updatedAt'] ?? $remoteItem['updated_at'] ?? null,
                    'field_conflicts' => $fieldConflicts,
                    'local_data' => $localItem,
                    'remote_data' => $remoteItem,
                    'status' => 'unresolved',
                    'detected_at' => now()->toIso8601String(),
                ];
            }
        }

        if (!empty($conflicts)) {
            $this->storeConflicts($conflicts);
        }

        return $conflicts;
    }

    public function resolveConflict(array $conflict, string $strategy): array
    {
        $resolvedData = match ($strategy) {
            'local_wins' => $conflict['local_data'],
            'remote_wins' => $conflict['remote_data'],
            'merge' => $this->mergeData($conflict['local_data'], $conflict['remote_data']),
            'manual' => $conflict['local_data'],
            default => $conflict['local_data'],
        };

        $conflict['status'] = 'resolved';
        $conflict['resolution_strategy'] = $strategy;
        $conflict['resolved_at'] = now()->toIso8601String();
        $conflict['resolved_data'] = $resolvedData;

        $this->updateConflictInStore($conflict);

        IntegrationLog::logRequest('payload_cms', 'conflict_resolved', [
            'correlation_id' => (string) Str::uuid(),
            'direction' => 'internal',
            'request_data' => [
                'conflict_id' => $conflict['id'],
                'strategy' => $strategy,
                'entity_type' => $conflict['entity_type'],
            ],
            'response_data' => ['resolved' => true],
            'status' => 'success',
        ]);

        return [
            'success' => true,
            'conflict' => $conflict,
            'resolved_data' => $resolvedData,
            'strategy' => $strategy,
        ];
    }

    public function getConflicts(?string $entityType = null): array
    {
        $allConflicts = $this->loadConflicts();

        if ($entityType) {
            $allConflicts = array_filter($allConflicts, function ($c) use ($entityType) {
                return ($c['entity_type'] ?? '') === $entityType && ($c['status'] ?? '') === 'unresolved';
            });
        } else {
            $allConflicts = array_filter($allConflicts, function ($c) {
                return ($c['status'] ?? '') === 'unresolved';
            });
        }

        return array_values($allConflicts);
    }

    public function getConflictById(string $id): ?array
    {
        $allConflicts = $this->loadConflicts();

        foreach ($allConflicts as $conflict) {
            if (($conflict['id'] ?? '') === $id) {
                return $conflict;
            }
        }

        return null;
    }

    public function resolveAll(string $strategy): array
    {
        $unresolvedConflicts = $this->getConflicts();
        $resolved = 0;
        $failed = 0;

        foreach ($unresolvedConflicts as $conflict) {
            try {
                $this->resolveConflict($conflict, $strategy);
                $resolved++;
            } catch (\Exception $e) {
                $failed++;
            }
        }

        return [
            'success' => true,
            'resolved' => $resolved,
            'failed' => $failed,
            'strategy' => $strategy,
            'total_processed' => $resolved + $failed,
        ];
    }

    protected function compareFields(array $local, array $remote): array
    {
        $fieldMap = [
            'name' => 'name',
            'name_ar' => 'nameAr',
            'status' => 'status',
            'slug' => 'slug',
            'code' => 'code',
            'description' => 'description',
            'type' => 'type',
        ];

        $conflicts = [];

        foreach ($fieldMap as $localField => $remoteField) {
            $localVal = $local[$localField] ?? null;
            $remoteVal = $remote[$remoteField] ?? $remote[$localField] ?? null;

            if ($localVal !== null && $remoteVal !== null && (string) $localVal !== (string) $remoteVal) {
                $conflicts[] = [
                    'field' => $localField,
                    'local_value' => $localVal,
                    'remote_value' => $remoteVal,
                ];
            }
        }

        return $conflicts;
    }

    protected function mergeData(array $local, array $remote): array
    {
        $merged = $local;

        $localUpdated = strtotime($local['updated_at'] ?? '2000-01-01');
        $remoteUpdated = strtotime($remote['updatedAt'] ?? $remote['updated_at'] ?? '2000-01-01');

        if ($remoteUpdated > $localUpdated) {
            foreach ($remote as $key => $value) {
                if ($value !== null && !isset($merged[$key])) {
                    $merged[$key] = $value;
                }
            }
        }

        return $merged;
    }

    protected function detectEntityType(array $item): string
    {
        if (isset($item['cms_node_id'])) return 'nodes';
        if (isset($item['cms_tenant_id'])) return 'tenants';
        if (isset($item['cms_category_id'])) return 'categories';
        if (isset($item['cms_store_id'])) return 'stores';
        if (isset($item['cms_portal_id'])) return 'portals';
        if (isset($item['cms_scope_id'])) return 'scopes';
        if (isset($item['cms_country_id'])) return 'countries';
        return 'unknown';
    }

    protected function storeConflicts(array $newConflicts): void
    {
        $existing = $this->loadConflicts();
        $merged = array_merge($existing, $newConflicts);
        Cache::put($this->cachePrefix, $merged, now()->addDays(7));
    }

    protected function loadConflicts(): array
    {
        return Cache::get($this->cachePrefix, []);
    }

    protected function updateConflictInStore(array $updatedConflict): void
    {
        $all = $this->loadConflicts();

        foreach ($all as $i => $c) {
            if (($c['id'] ?? '') === ($updatedConflict['id'] ?? '')) {
                $all[$i] = $updatedConflict;
                break;
            }
        }

        Cache::put($this->cachePrefix, $all, now()->addDays(7));
    }
}
