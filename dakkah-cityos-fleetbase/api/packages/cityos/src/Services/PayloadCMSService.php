<?php

namespace Fleetbase\CityOS\Services;

use Fleetbase\CityOS\Models\IntegrationLog;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class PayloadCMSService
{
    protected string $baseUrl;
    protected string $apiKey;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('cityos.cms.base_url', env('CITYOS_CMS_BASE_URL', '')), '/');
        $this->apiKey = config('cityos.cms.api_key', env('CITYOS_CMS_API_KEY', ''));
    }

    protected function headers(array $extra = []): array
    {
        $headers = [
            'Accept' => 'application/json',
            'X-CityOS-Correlation-Id' => (string) Str::uuid(),
        ];

        if (!empty($this->apiKey)) {
            $headers['Authorization'] = 'api-keys API-Key ' . $this->apiKey;
        }

        return array_merge($headers, $extra);
    }

    protected function logAndReturn(string $operation, $response, string $correlationId, float $startTime, array $requestData = []): array
    {
        $result = [
            'success' => $response->successful(),
            'data' => $response->json(),
            'status_code' => $response->status(),
            'correlation_id' => $correlationId,
        ];

        IntegrationLog::logRequest('payload_cms', $operation, [
            'correlation_id' => $correlationId,
            'request_data' => $requestData,
            'response_data' => $result['data'],
            'response_code' => $response->status(),
            'duration_ms' => (microtime(true) - $startTime) * 1000,
            'status' => $response->successful() ? 'success' : 'error',
        ]);

        return $result;
    }

    public function isConfigured(): bool
    {
        return !empty($this->baseUrl) && $this->baseUrl !== '/' && filter_var($this->baseUrl, FILTER_VALIDATE_URL) !== false;
    }

    public function getHealth(): array
    {
        if (!$this->isConfigured()) {
            return ['success' => false, 'error' => 'Payload CMS base URL is not configured. Set CITYOS_CMS_BASE_URL.'];
        }

        try {
            $response = Http::timeout(10)->get("{$this->baseUrl}/api/health");
            return ['success' => $response->successful(), 'data' => $response->json()];
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function getCollection(string $collection, array $params = []): array
    {
        if (!$this->isConfigured()) {
            return ['success' => false, 'error' => 'Payload CMS base URL is not configured.'];
        }

        $correlationId = (string) Str::uuid();
        $startTime = microtime(true);

        try {
            $response = Http::withHeaders($this->headers(['X-CityOS-Correlation-Id' => $correlationId]))
                ->timeout(30)->get("{$this->baseUrl}/api/{$collection}", $params);

            $result = $this->logAndReturn("get_{$collection}", $response, $correlationId, $startTime, $params);

            if (!$result['success'] && !isset($result['error'])) {
                $body = $result['data'] ?? [];
                $errors = $body['errors'] ?? [];
                $errorMsg = !empty($errors) ? ($errors[0]['message'] ?? json_encode($errors)) : "HTTP {$result['status_code']}";
                $result['error'] = $errorMsg;
            }

            return $result;
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function getAllFromCollection(string $collection, array $params = []): array
    {
        if (!$this->isConfigured()) {
            return ['success' => false, 'error' => 'Payload CMS base URL is not configured.'];
        }

        $allDocs = [];
        $page = 1;
        $limit = $params['limit'] ?? 100;

        do {
            $params['page'] = $page;
            $params['limit'] = $limit;

            $result = $this->getCollection($collection, $params);

            if (!($result['success'] ?? false)) {
                if (empty($allDocs)) {
                    return $result;
                }
                break;
            }

            $data = $result['data'] ?? [];
            $docs = $data['docs'] ?? $data;
            if (!is_array($docs)) {
                break;
            }

            $allDocs = array_merge($allDocs, $docs);

            $hasNextPage = $data['hasNextPage'] ?? false;
            $totalPages = $data['totalPages'] ?? 1;
            $page++;
        } while ($hasNextPage && $page <= $totalPages);

        return [
            'success' => true,
            'data' => ['docs' => $allDocs, 'totalDocs' => count($allDocs)],
            'status_code' => 200,
        ];
    }

    public function getNodes(array $params = []): array
    {
        return $this->getCollection('nodes', $params);
    }

    public function getTenants(array $params = []): array
    {
        return $this->getCollection('tenants', $params);
    }

    public function getRegions(array $params = []): array
    {
        return $this->getCollection('regions', $params);
    }

    public function getCountries(array $params = []): array
    {
        return $this->getCollection('countries', $params);
    }

    public function getGovernanceAuthorities(array $params = []): array
    {
        return $this->getCollection('governance-authorities', $params);
    }

    public function getPolicies(array $params = []): array
    {
        return $this->getCollection('policies', $params);
    }

    public function getFeatureFlags(array $params = []): array
    {
        return $this->getCollection('feature-flags', $params);
    }

    public function getPOIs(array $params = []): array
    {
        return $this->getCollection('pois', $params);
    }

    public function getCollections(array $params = []): array
    {
        return $this->getCollection('collections', $params);
    }

    public function getGovernance(array $params = []): array
    {
        return $this->getCollection('governance', $params);
    }

    public function getPersonas(array $params = []): array
    {
        return $this->getCollection('personas', $params);
    }

    public function getWorkflowStatus(): array
    {
        try {
            $response = Http::withHeaders($this->headers())
                ->timeout(15)->get("{$this->baseUrl}/api/workflow-status");
            return ['success' => $response->successful(), 'data' => $response->json()];
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function getIntegrationStatus(): array
    {
        try {
            $response = Http::timeout(10)->get("{$this->baseUrl}/api/integration/workflow-status");
            return ['success' => $response->successful(), 'data' => $response->json()];
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function listBuckets(): array
    {
        try {
            $response = Http::withHeaders($this->headers())
                ->timeout(15)->get("{$this->baseUrl}/api/storage");
            return ['success' => $response->successful(), 'data' => $response->json()];
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function listObjects(string $bucket = 'cityos-media', string $prefix = '', int $maxKeys = 100): array
    {
        try {
            $response = Http::withHeaders($this->headers())
                ->timeout(15)->get("{$this->baseUrl}/api/storage/{$bucket}", [
                    'prefix' => $prefix,
                    'maxKeys' => $maxKeys,
                ]);
            return ['success' => $response->successful(), 'data' => $response->json()];
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function uploadObject(string $bucket, string $key, string $filePath, string $contentType = 'application/octet-stream'): array
    {
        $correlationId = (string) Str::uuid();
        $startTime = microtime(true);

        try {
            $response = Http::withHeaders(array_merge($this->headers(), [
                'Content-Type' => $contentType,
                'X-CityOS-Correlation-Id' => $correlationId,
            ]))->timeout(60)->withBody(file_get_contents($filePath), $contentType)
                ->put("{$this->baseUrl}/api/storage/{$bucket}/{$key}");

            IntegrationLog::logRequest('payload_cms', 'upload_object', [
                'correlation_id' => $correlationId,
                'request_data' => ['bucket' => $bucket, 'key' => $key, 'content_type' => $contentType],
                'response_code' => $response->status(),
                'duration_ms' => (microtime(true) - $startTime) * 1000,
                'status' => $response->successful() ? 'success' : 'error',
            ]);

            return [
                'success' => $response->successful(),
                'url' => "{$this->baseUrl}/api/storage/{$bucket}/{$key}",
                'status_code' => $response->status(),
            ];
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function downloadObject(string $bucket, string $key): array
    {
        try {
            $response = Http::withHeaders($this->headers())
                ->timeout(30)->get("{$this->baseUrl}/api/storage/{$bucket}/{$key}");
            return [
                'success' => $response->successful(),
                'body' => $response->body(),
                'content_type' => $response->header('Content-Type'),
            ];
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function getStorageInfo(): array
    {
        try {
            $response = Http::timeout(10)->get("{$this->baseUrl}/api/storage/info");
            return ['success' => $response->successful(), 'data' => $response->json()];
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function pushToCollection(string $collection, array $data): array
    {
        if (!$this->isConfigured()) {
            return ['success' => false, 'error' => 'Payload CMS base URL is not configured.'];
        }

        $correlationId = (string) Str::uuid();
        $startTime = microtime(true);

        try {
            $id = $data['id'] ?? null;

            if ($id) {
                $response = Http::withHeaders($this->headers(['X-CityOS-Correlation-Id' => $correlationId]))
                    ->timeout(30)->patch("{$this->baseUrl}/api/{$collection}/{$id}", $data);
            } else {
                $response = Http::withHeaders($this->headers(['X-CityOS-Correlation-Id' => $correlationId]))
                    ->timeout(30)->post("{$this->baseUrl}/api/{$collection}", $data);
            }

            return $this->logAndReturn("push_{$collection}", $response, $correlationId, $startTime, $data);
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function syncNodes(string $direction = 'both'): array
    {
        return $this->performEntitySync('nodes', $direction, [
            'local_fetch' => fn () => $this->getLocalEntities('nodes'),
            'remote_fetch' => fn () => $this->getAllFromCollection('nodes', ['limit' => 100, 'depth' => 2]),
            'push_mapper' => fn ($item) => $this->mapNodeForPush($item),
        ]);
    }

    public function syncTenants(string $direction = 'both'): array
    {
        return $this->performEntitySync('tenants', $direction, [
            'local_fetch' => fn () => $this->getLocalEntities('tenants'),
            'remote_fetch' => fn () => $this->getAllFromCollection('tenants', ['limit' => 100, 'depth' => 2]),
            'push_mapper' => fn ($item) => $this->mapTenantForPush($item),
        ]);
    }

    public function syncPOIs(string $direction = 'both'): array
    {
        return $this->performEntitySync('pois', $direction, [
            'local_fetch' => fn () => $this->getLocalEntities('pois'),
            'remote_fetch' => fn () => $this->getAllFromCollection('pois', ['limit' => 100, 'depth' => 2]),
            'push_mapper' => fn ($item) => $this->mapPoiForPush($item),
        ]);
    }

    public function syncStorage(string $direction = 'both'): array
    {
        return $this->performEntitySync('storage', $direction, [
            'local_fetch' => fn () => $this->getLocalEntities('storage'),
            'remote_fetch' => fn () => $this->listObjects('cityos-media', '', 500),
            'push_mapper' => fn ($item) => $item,
        ]);
    }

    public function syncCategories(string $direction = 'both'): array
    {
        return $this->performEntitySync('categories', $direction, [
            'local_fetch' => fn () => $this->getLocalEntities('categories'),
            'remote_fetch' => fn () => $this->getAllFromCollection('categories', ['limit' => 100, 'depth' => 2]),
            'push_mapper' => fn ($item) => $this->mapCategoryForPush($item),
        ]);
    }

    public function syncProducts(string $direction = 'both'): array
    {
        return $this->performEntitySync('products', $direction, [
            'local_fetch' => fn () => $this->getLocalEntities('products'),
            'remote_fetch' => fn () => $this->getAllFromCollection('products', ['limit' => 100, 'depth' => 2]),
            'push_mapper' => fn ($item) => $this->mapProductForPush($item),
        ]);
    }

    public function fullSync(array $options = []): array
    {
        $direction = $options['direction'] ?? 'both';
        $entityTypes = $options['entity_types'] ?? ['nodes', 'tenants', 'categories', 'pois', 'products', 'storage'];
        $results = [];
        $startTime = microtime(true);

        foreach ($entityTypes as $entityType) {
            try {
                $results[$entityType] = match ($entityType) {
                    'nodes' => $this->syncNodes($direction),
                    'tenants' => $this->syncTenants($direction),
                    'pois' => $this->syncPOIs($direction),
                    'storage' => $this->syncStorage($direction),
                    'categories' => $this->syncCategories($direction),
                    'products' => $this->syncProducts($direction),
                    default => ['success' => false, 'error' => "Unknown entity type: {$entityType}"],
                };
            } catch (\Exception $e) {
                $results[$entityType] = ['success' => false, 'error' => $e->getMessage()];
            }
        }

        $this->logSyncRun('full_sync', $results, $startTime);

        return [
            'success' => true,
            'direction' => $direction,
            'entity_types' => $entityTypes,
            'results' => $results,
            'duration_ms' => (microtime(true) - $startTime) * 1000,
            'completed_at' => now()->toIso8601String(),
        ];
    }

    public function getLastSyncStatus(): array
    {
        $entityTypes = ['nodes', 'tenants', 'categories', 'pois', 'products', 'storage'];
        $statuses = [];

        foreach ($entityTypes as $type) {
            $lastLog = IntegrationLog::where('integration', 'payload_cms')
                ->where('operation', 'like', "sync_{$type}%")
                ->orderBy('created_at', 'desc')
                ->first();

            $statuses[$type] = [
                'last_sync' => $lastLog ? $lastLog->created_at->toIso8601String() : null,
                'status' => $lastLog ? $lastLog->status : 'never_synced',
                'duration_ms' => $lastLog ? $lastLog->duration_ms : null,
                'correlation_id' => $lastLog ? $lastLog->correlation_id : null,
            ];
        }

        return [
            'success' => true,
            'entity_statuses' => $statuses,
            'timestamp' => now()->toIso8601String(),
        ];
    }

    public function getSyncHistory(string $entityType, int $limit = 20): array
    {
        $query = IntegrationLog::where('integration', 'payload_cms')
            ->orderBy('created_at', 'desc');

        if ($entityType !== 'all') {
            $query->where('operation', 'like', "sync_{$entityType}%");
        } else {
            $query->where('operation', 'like', 'sync_%');
        }

        $logs = $query->limit($limit)->get();

        return [
            'success' => true,
            'entity_type' => $entityType,
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
            })->toArray(),
            'total' => $logs->count(),
        ];
    }

    protected function performEntitySync(string $entityType, string $direction, array $handlers): array
    {
        $startTime = microtime(true);
        $correlationId = (string) Str::uuid();
        $stats = ['pulled' => 0, 'pushed' => 0, 'conflicts' => 0, 'errors' => []];

        try {
            if (in_array($direction, ['pull', 'both'])) {
                $remoteResult = ($handlers['remote_fetch'])();
                if ($remoteResult['success'] ?? false) {
                    $remoteDocs = $remoteResult['data']['docs'] ?? $remoteResult['data'] ?? [];
                    if (is_array($remoteDocs)) {
                        $mapper = app(CmsMappingService::class);
                        $pullStats = $this->pullFromRemote($mapper, $entityType, $remoteDocs);
                        $stats['pulled'] = ($pullStats['created'] ?? 0) + ($pullStats['updated'] ?? 0);
                    }
                } else {
                    $stats['errors'][] = "Pull failed: " . ($remoteResult['error'] ?? 'unknown');
                }
            }

            if (in_array($direction, ['push', 'both'])) {
                $localData = ($handlers['local_fetch'])();
                if (!empty($localData) && is_array($localData)) {
                    $pushMapper = $handlers['push_mapper'];
                    foreach ($localData as $item) {
                        $mapped = $pushMapper($item);
                        if ($mapped) {
                            $pushResult = $this->pushToCollection($entityType, $mapped);
                            if ($pushResult['success'] ?? false) {
                                $stats['pushed']++;
                            } else {
                                $stats['errors'][] = $pushResult['error'] ?? 'push_failed';
                            }
                        }
                    }
                }
            }

            $status = empty($stats['errors']) ? 'success' : 'partial';
        } catch (\Exception $e) {
            $stats['errors'][] = $e->getMessage();
            $status = 'error';
        }

        $durationMs = (microtime(true) - $startTime) * 1000;

        IntegrationLog::logRequest('payload_cms', "sync_{$entityType}", [
            'correlation_id' => $correlationId,
            'direction' => $direction,
            'request_data' => ['direction' => $direction, 'entity_type' => $entityType],
            'response_data' => $stats,
            'duration_ms' => $durationMs,
            'status' => $status,
        ]);

        return [
            'success' => $status !== 'error',
            'entity_type' => $entityType,
            'direction' => $direction,
            'stats' => $stats,
            'status' => $status,
            'duration_ms' => $durationMs,
            'correlation_id' => $correlationId,
        ];
    }

    protected function pullFromRemote(CmsMappingService $mapper, string $entityType, array $data): array
    {
        return match ($entityType) {
            'nodes' => $mapper->syncNodes($data),
            'tenants' => $mapper->syncTenants($data),
            'categories' => $mapper->syncCategories($data),
            'pois' => $mapper->syncScopes($data),
            'products' => $mapper->syncStores($data),
            'storage' => ['created' => 0, 'updated' => 0, 'unchanged' => count($data)],
            default => ['created' => 0, 'updated' => 0, 'unchanged' => 0],
        };
    }

    protected function getLocalEntities(string $entityType): array
    {
        return match ($entityType) {
            'nodes' => \Fleetbase\CityOS\Models\Node::all()->toArray(),
            'tenants' => \Fleetbase\CityOS\Models\Tenant::all()->toArray(),
            'categories' => \Fleetbase\CityOS\Models\Category::all()->toArray(),
            'pois' => class_exists(\Fleetbase\FleetOps\Models\Place::class) ? \Fleetbase\FleetOps\Models\Place::limit(500)->get()->toArray() : [],
            'products' => class_exists(\Fleetbase\Storefront\Models\Product::class) ? \Fleetbase\Storefront\Models\Product::limit(500)->get()->toArray() : [],
            'storage' => [],
            default => [],
        };
    }

    protected function mapNodeForPush(array $item): ?array
    {
        return [
            'id' => $item['cms_node_id'] ?? null,
            'name' => $item['name'] ?? '',
            'nameAr' => $item['name_ar'] ?? null,
            'slug' => $item['slug'] ?? '',
            'type' => $item['type'] ?? 'CITY',
            'code' => $item['code'] ?? null,
            'status' => $item['status'] ?? 'active',
            'coordinates' => [
                'lat' => $item['coordinates_lat'] ?? null,
                'lng' => $item['coordinates_lng'] ?? null,
            ],
        ];
    }

    protected function mapTenantForPush(array $item): ?array
    {
        return [
            'id' => $item['cms_tenant_id'] ?? null,
            'name' => $item['name'] ?? '',
            'nameAr' => $item['name_ar'] ?? null,
            'slug' => $item['handle'] ?? '',
            'tier' => $item['tenant_tier'] ?? 'CITY',
            'status' => $item['status'] ?? 'active',
            'domain' => $item['domain'] ?? null,
            'subdomain' => $item['subdomain'] ?? null,
            'residencyZone' => $item['residency_zone'] ?? null,
        ];
    }

    protected function mapCategoryForPush(array $item): ?array
    {
        return [
            'id' => $item['cms_category_id'] ?? null,
            'name' => $item['name'] ?? '',
            'nameAr' => $item['name_ar'] ?? null,
            'slug' => $item['slug'] ?? '',
            'description' => $item['description'] ?? null,
            'icon' => $item['icon'] ?? null,
            'sortOrder' => $item['sort_order'] ?? 0,
            'status' => $item['status'] ?? 'active',
        ];
    }

    protected function mapPoiForPush(array $item): ?array
    {
        return [
            'name' => $item['name'] ?? $item['address'] ?? '',
            'address' => $item['address'] ?? '',
            'lat' => $item['location']['coordinates'][1] ?? $item['latitude'] ?? null,
            'lng' => $item['location']['coordinates'][0] ?? $item['longitude'] ?? null,
            'type' => $item['type'] ?? 'poi',
            'status' => $item['status'] ?? 'active',
        ];
    }

    protected function mapProductForPush(array $item): ?array
    {
        return [
            'name' => $item['name'] ?? '',
            'description' => $item['description'] ?? null,
            'price' => $item['price'] ?? 0,
            'sku' => $item['sku'] ?? null,
            'status' => $item['status'] ?? 'active',
        ];
    }

    protected function logSyncRun(string $operation, array $results, float $startTime): void
    {
        IntegrationLog::logRequest('payload_cms', $operation, [
            'correlation_id' => (string) Str::uuid(),
            'direction' => 'both',
            'request_data' => ['operation' => $operation],
            'response_data' => $results,
            'duration_ms' => (microtime(true) - $startTime) * 1000,
            'status' => 'success',
        ]);
    }
}
