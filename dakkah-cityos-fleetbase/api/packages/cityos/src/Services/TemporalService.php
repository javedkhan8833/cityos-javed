<?php

namespace Fleetbase\CityOS\Services;

use Fleetbase\CityOS\Models\IntegrationLog;
use Fleetbase\CityOS\Temporal\Grpc\TemporalGrpcClient;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class TemporalService
{
    protected string $grpcAddress;
    protected string $namespace;
    protected string $apiKey;
    protected string $cloudOpsEndpoint = 'saas-api.tmprl.cloud:443';
    protected string $cmsBaseUrl;
    protected string $cmsApiKey;
    protected ?TemporalGrpcClient $grpcClient = null;
    protected bool $grpcAvailable;

    public function __construct()
    {
        $this->grpcAddress = config('cityos.temporal.address', env('TEMPORAL_ADDRESS', ''));
        $this->namespace = config('cityos.temporal.namespace', env('TEMPORAL_NAMESPACE', ''));
        $this->apiKey = config('cityos.temporal.api_key', env('TEMPORAL_API_KEY', ''));
        $this->cmsBaseUrl = config('cityos.cms.base_url', env('CITYOS_CMS_BASE_URL', ''));
        $this->cmsApiKey = config('cityos.cms.api_key', env('CITYOS_CMS_API_KEY', ''));
        $this->grpcAvailable = extension_loaded('grpc');
    }

    protected function getGrpcClient(): TemporalGrpcClient
    {
        if ($this->grpcClient === null) {
            $this->grpcClient = new TemporalGrpcClient(
                $this->grpcAddress,
                $this->namespace,
                $this->apiKey
            );
        }
        return $this->grpcClient;
    }

    public function isGrpcAvailable(): bool
    {
        return $this->grpcAvailable;
    }

    public function getConnectionInfo(): array
    {
        $configured = !empty($this->grpcAddress) && !empty($this->namespace) && !empty($this->apiKey);
        $info = [
            'grpc_address' => $this->grpcAddress,
            'cloud_ops_endpoint' => $this->cloudOpsEndpoint,
            'namespace' => $this->namespace,
            'configured' => $configured,
            'tls' => true,
            'region' => 'ap-northeast-1',
            'protocol' => 'gRPC (native PHP extension)',
            'grpc_extension' => $this->grpcAvailable ? 'v' . phpversion('grpc') : 'not loaded',
        ];

        if ($configured && $this->grpcAvailable) {
            $info['health'] = $this->checkHealth();
        } elseif ($configured && !$this->grpcAvailable) {
            $info['health'] = [
                'reachable' => false,
                'error' => 'PHP gRPC extension not loaded. Ensure PHP_INI_SCAN_DIR includes php-ext-conf.',
            ];
        }

        return $info;
    }

    public function checkHealth(): array
    {
        if (!$this->grpcAvailable) {
            return ['reachable' => false, 'error' => 'gRPC extension not loaded'];
        }

        try {
            $client = $this->getGrpcClient();
            $result = $client->getSystemInfo();

            IntegrationLog::logRequest('temporal', 'health_check', [
                'duration_ms' => $result['duration_ms'] ?? 0,
                'response_data' => $result,
                'status' => ($result['reachable'] ?? false) ? 'success' : 'error',
            ]);

            return $result;
        } catch (\Exception $e) {
            return ['reachable' => false, 'error' => $e->getMessage()];
        }
    }

    public function describeNamespace(): array
    {
        if (!$this->grpcAvailable) {
            return ['success' => false, 'error' => 'gRPC extension not loaded'];
        }

        try {
            $client = $this->getGrpcClient();
            $result = $client->describeNamespace($this->namespace);

            IntegrationLog::logRequest('temporal', 'describe_namespace', [
                'response_data' => $result,
                'status' => ($result['success'] ?? false) ? 'success' : 'error',
            ]);

            return $result;
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function getNamespaceInfo(): array
    {
        return $this->describeNamespace();
    }

    public function startWorkflow(string $workflowType, string $workflowId, array $input = [], string $taskQueue = 'cityos-default'): array
    {
        $correlationId = (string) Str::uuid();

        if (!$this->grpcAvailable) {
            return $this->startWorkflowFallback($workflowType, $workflowId, $input, $taskQueue, $correlationId);
        }

        try {
            $client = $this->getGrpcClient();
            $result = $client->startWorkflowExecution($workflowId, $workflowType, $taskQueue, $input, $correlationId);

            IntegrationLog::logRequest('temporal', 'start_workflow', [
                'correlation_id' => $correlationId,
                'request_data' => ['workflow_type' => $workflowType, 'workflow_id' => $workflowId, 'task_queue' => $taskQueue],
                'response_data' => $result,
                'status' => ($result['success'] ?? false) ? 'success' : 'error',
                'duration_ms' => $result['duration_ms'] ?? 0,
            ]);

            $result['correlation_id'] = $correlationId;
            return $result;
        } catch (\Exception $e) {
            return [
                'success' => false,
                'workflow_id' => $workflowId,
                'error' => $e->getMessage(),
                'correlation_id' => $correlationId,
            ];
        }
    }

    protected function startWorkflowFallback(string $workflowType, string $workflowId, array $input, string $taskQueue, string $correlationId): array
    {
        IntegrationLog::logRequest('temporal', 'start_workflow', [
            'correlation_id' => $correlationId,
            'request_data' => ['workflow_type' => $workflowType, 'workflow_id' => $workflowId],
            'status' => 'queued',
        ]);

        $syncResult = null;
        if (!empty($this->cmsBaseUrl)) {
            $syncResult = $this->triggerCMSSyncForWorkflow($workflowType, $workflowId, $input, $correlationId);
        }

        return [
            'success' => true,
            'workflow_id' => $workflowId,
            'workflow_type' => $workflowType,
            'task_queue' => $taskQueue,
            'correlation_id' => $correlationId,
            'mode' => 'fallback_cms_sync',
            'cms_sync' => $syncResult,
            'note' => 'gRPC not available. Workflow queued via CMS sync.',
        ];
    }

    protected function triggerCMSSyncForWorkflow(string $workflowType, string $workflowId, array $input, string $correlationId): ?array
    {
        try {
            $response = Http::withHeaders([
                'X-API-Key' => $this->cmsApiKey,
                'X-CityOS-Correlation-Id' => $correlationId,
                'Content-Type' => 'application/json',
            ])->timeout(15)->post("{$this->cmsBaseUrl}/api/sync/temporal/run", [
                'workflow_type' => $workflowType,
                'workflow_id' => $workflowId,
                'input' => $input,
                'namespace' => $this->namespace,
            ]);

            return ['success' => $response->successful(), 'status_code' => $response->status()];
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function queryWorkflow(string $workflowId, string $runId = null): array
    {
        if (!$this->grpcAvailable) {
            return ['success' => false, 'error' => 'gRPC extension not loaded'];
        }

        $correlationId = (string) Str::uuid();

        try {
            $client = $this->getGrpcClient();
            $result = $client->describeWorkflowExecution($workflowId, $runId);

            IntegrationLog::logRequest('temporal', 'query_workflow', [
                'correlation_id' => $correlationId,
                'request_data' => ['workflow_id' => $workflowId, 'run_id' => $runId],
                'response_data' => $this->sanitizeForJson($result),
                'status' => ($result['success'] ?? false) ? 'success' : 'error',
            ]);

            return $result;
        } catch (\Exception $e) {
            return ['success' => false, 'workflow_id' => $workflowId, 'error' => $e->getMessage()];
        }
    }

    public function signalWorkflow(string $workflowId, string $signalName, array $payload = [], string $runId = null): array
    {
        if (!$this->grpcAvailable) {
            return ['success' => false, 'error' => 'gRPC extension not loaded'];
        }

        $correlationId = (string) Str::uuid();

        try {
            $client = $this->getGrpcClient();
            $result = $client->signalWorkflowExecution($workflowId, $signalName, $payload, $runId, $correlationId);

            IntegrationLog::logRequest('temporal', 'signal_workflow', [
                'correlation_id' => $correlationId,
                'request_data' => ['workflow_id' => $workflowId, 'signal' => $signalName],
                'response_data' => $result,
                'status' => ($result['success'] ?? false) ? 'success' : 'error',
            ]);

            $result['correlation_id'] = $correlationId;
            return $result;
        } catch (\Exception $e) {
            return ['success' => false, 'workflow_id' => $workflowId, 'error' => $e->getMessage()];
        }
    }

    public function terminateWorkflow(string $workflowId, string $reason = '', string $runId = null): array
    {
        if (!$this->grpcAvailable) {
            return ['success' => false, 'error' => 'gRPC extension not loaded'];
        }

        $correlationId = (string) Str::uuid();

        try {
            $client = $this->getGrpcClient();
            $result = $client->terminateWorkflowExecution($workflowId, $reason, $runId);

            IntegrationLog::logRequest('temporal', 'terminate_workflow', [
                'correlation_id' => $correlationId,
                'request_data' => ['workflow_id' => $workflowId, 'reason' => $reason],
                'response_data' => $result,
                'status' => ($result['success'] ?? false) ? 'success' : 'error',
            ]);

            $result['correlation_id'] = $correlationId;
            return $result;
        } catch (\Exception $e) {
            return ['success' => false, 'workflow_id' => $workflowId, 'error' => $e->getMessage()];
        }
    }

    public function listWorkflows(int $pageSize = 20, string $query = ''): array
    {
        if (!$this->grpcAvailable) {
            return ['success' => false, 'error' => 'gRPC extension not loaded'];
        }

        try {
            $client = $this->getGrpcClient();
            return $client->listWorkflowExecutions($pageSize, $query);
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function triggerCMSSync(int $limit = 100): array
    {
        $correlationId = (string) Str::uuid();

        try {
            $response = Http::withHeaders([
                'X-API-Key' => $this->cmsApiKey,
                'X-CityOS-Correlation-Id' => $correlationId,
            ])->timeout(60)->post("{$this->cmsBaseUrl}/api/sync/temporal/run", [
                'limit' => $limit,
            ]);

            IntegrationLog::logRequest('temporal_cms_sync', 'trigger_sync', [
                'correlation_id' => $correlationId,
                'request_data' => ['limit' => $limit],
                'response_data' => $response->json(),
                'response_code' => $response->status(),
                'status' => $response->successful() ? 'success' : 'error',
            ]);

            return ['success' => $response->successful(), 'data' => $response->json()];
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function getSyncStatus(): array
    {
        try {
            $response = Http::withHeaders([
                'X-API-Key' => $this->cmsApiKey,
            ])->timeout(15)->get("{$this->cmsBaseUrl}/api/sync/temporal/status");

            return ['success' => $response->successful(), 'data' => $response->json()];
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function getWorkflowRegistry(string $domain = null): array
    {
        try {
            $url = "{$this->cmsBaseUrl}/api/workflow-registry";
            if ($domain) {
                $url .= "?domain={$domain}";
            }

            $response = Http::withHeaders([
                'X-API-Key' => $this->cmsApiKey,
            ])->timeout(15)->get($url);

            return ['success' => $response->successful(), 'data' => $response->json()];
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function getWorkflowRegistryStats(): array
    {
        try {
            $response = Http::withHeaders([
                'X-API-Key' => $this->cmsApiKey,
            ])->timeout(15)->get("{$this->cmsBaseUrl}/api/workflow-registry/stats");

            return ['success' => $response->successful(), 'data' => $response->json()];
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    protected function sanitizeForJson(array $data): array
    {
        $result = [];
        foreach ($data as $key => $value) {
            if (is_array($value)) {
                $result[$key] = $this->sanitizeForJson($value);
            } elseif (is_string($value) && !mb_check_encoding($value, 'UTF-8')) {
                $result[$key] = '[binary:' . strlen($value) . ' bytes]';
            } else {
                $result[$key] = $value;
            }
        }
        return $result;
    }

    public function __destruct()
    {
        if ($this->grpcClient) {
            $this->grpcClient->close();
        }
    }
}
