<?php

namespace Fleetbase\CityOS\Temporal\Grpc;

use Grpc\ChannelCredentials;
use Grpc\CallCredentials;

class TemporalGrpcClientFactory
{
    protected string $namespaceEndpoint;
    protected string $cloudOpsEndpoint;
    protected string $namespace;
    protected string $apiKey;
    protected ?WorkflowServiceClient $workflowClient = null;
    protected ?CloudServiceClient $cloudClient = null;

    public function __construct(string $namespaceEndpoint, string $namespace, string $apiKey, string $cloudOpsEndpoint = 'saas-api.tmprl.cloud:443')
    {
        $this->namespaceEndpoint = $namespaceEndpoint;
        $this->namespace = $namespace;
        $this->apiKey = $apiKey;
        $this->cloudOpsEndpoint = $cloudOpsEndpoint;
    }

    protected function createCallCredentials(): CallCredentials
    {
        return CallCredentials::createFromPlugin(function ($context) {
            return [
                'authorization' => ['Bearer ' . $this->apiKey],
                'temporal-namespace' => [$this->namespace],
            ];
        });
    }

    protected function createChannelCredentials(): ChannelCredentials
    {
        $sslCreds = ChannelCredentials::createSsl();
        $callCreds = $this->createCallCredentials();
        return ChannelCredentials::createComposite($sslCreds, $callCreds);
    }

    protected function createCloudCallCredentials(): CallCredentials
    {
        return CallCredentials::createFromPlugin(function ($context) {
            return [
                'authorization' => ['Bearer ' . $this->apiKey],
                'temporal-cloud-api-version' => ['2024-10-01'],
            ];
        });
    }

    protected function createCloudChannelCredentials(): ChannelCredentials
    {
        $sslCreds = ChannelCredentials::createSsl();
        $callCreds = $this->createCloudCallCredentials();
        return ChannelCredentials::createComposite($sslCreds, $callCreds);
    }

    public function getWorkflowClient(): WorkflowServiceClient
    {
        if ($this->workflowClient === null) {
            $this->workflowClient = new WorkflowServiceClient($this->namespaceEndpoint, [
                'credentials' => $this->createChannelCredentials(),
                'grpc.default_authority' => preg_replace('/:7233$/', '', $this->namespaceEndpoint),
            ]);
        }
        return $this->workflowClient;
    }

    public function getCloudClient(): CloudServiceClient
    {
        if ($this->cloudClient === null) {
            $this->cloudClient = new CloudServiceClient($this->cloudOpsEndpoint, [
                'credentials' => $this->createCloudChannelCredentials(),
            ]);
        }
        return $this->cloudClient;
    }

    public function closeAll(): void
    {
        if ($this->workflowClient) {
            $this->workflowClient->close();
            $this->workflowClient = null;
        }
        if ($this->cloudClient) {
            $this->cloudClient->close();
            $this->cloudClient = null;
        }
    }
}
