<?php

namespace Fleetbase\CityOS\Temporal\Grpc;

use Grpc\BaseStub;

class CloudServiceClient extends BaseStub
{
    public function __construct(string $hostname, array $opts = [], $channel = null)
    {
        parent::__construct($hostname, $opts, $channel);
    }

    public function GetNamespace(
        \Temporal\Api\Cloud\Cloudservice\V1\GetNamespaceRequest $argument,
        $metadata = [],
        $options = []
    ) {
        return $this->_simpleRequest(
            '/temporal.api.cloud.cloudservice.v1.CloudService/GetNamespace',
            $argument,
            ['\Temporal\Api\Cloud\Cloudservice\V1\GetNamespaceResponse', 'decode'],
            $metadata,
            $options
        );
    }

    public function GetNamespaces(
        \Temporal\Api\Cloud\Cloudservice\V1\GetNamespacesRequest $argument,
        $metadata = [],
        $options = []
    ) {
        return $this->_simpleRequest(
            '/temporal.api.cloud.cloudservice.v1.CloudService/GetNamespaces',
            $argument,
            ['\Temporal\Api\Cloud\Cloudservice\V1\GetNamespacesResponse', 'decode'],
            $metadata,
            $options
        );
    }

    public function GetRegion(
        \Temporal\Api\Cloud\Cloudservice\V1\GetRegionRequest $argument,
        $metadata = [],
        $options = []
    ) {
        return $this->_simpleRequest(
            '/temporal.api.cloud.cloudservice.v1.CloudService/GetRegion',
            $argument,
            ['\Temporal\Api\Cloud\Cloudservice\V1\GetRegionResponse', 'decode'],
            $metadata,
            $options
        );
    }

    public function GetRegions(
        \Temporal\Api\Cloud\Cloudservice\V1\GetRegionsRequest $argument,
        $metadata = [],
        $options = []
    ) {
        return $this->_simpleRequest(
            '/temporal.api.cloud.cloudservice.v1.CloudService/GetRegions',
            $argument,
            ['\Temporal\Api\Cloud\Cloudservice\V1\GetRegionsResponse', 'decode'],
            $metadata,
            $options
        );
    }
}
