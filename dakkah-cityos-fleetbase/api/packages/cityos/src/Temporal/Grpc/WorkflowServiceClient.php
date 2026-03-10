<?php

namespace Fleetbase\CityOS\Temporal\Grpc;

use Grpc\BaseStub;
use Grpc\ChannelCredentials;

class WorkflowServiceClient extends BaseStub
{
    public function __construct(string $hostname, array $opts = [], $channel = null)
    {
        parent::__construct($hostname, $opts, $channel);
    }

    public function StartWorkflowExecution(
        \Temporal\Api\Workflowservice\V1\StartWorkflowExecutionRequest $argument,
        $metadata = [],
        $options = []
    ) {
        return $this->_simpleRequest(
            '/temporal.api.workflowservice.v1.WorkflowService/StartWorkflowExecution',
            $argument,
            ['\Temporal\Api\Workflowservice\V1\StartWorkflowExecutionResponse', 'decode'],
            $metadata,
            $options
        );
    }

    public function DescribeWorkflowExecution(
        \Temporal\Api\Workflowservice\V1\DescribeWorkflowExecutionRequest $argument,
        $metadata = [],
        $options = []
    ) {
        return $this->_simpleRequest(
            '/temporal.api.workflowservice.v1.WorkflowService/DescribeWorkflowExecution',
            $argument,
            ['\Temporal\Api\Workflowservice\V1\DescribeWorkflowExecutionResponse', 'decode'],
            $metadata,
            $options
        );
    }

    public function ListWorkflowExecutions(
        \Temporal\Api\Workflowservice\V1\ListWorkflowExecutionsRequest $argument,
        $metadata = [],
        $options = []
    ) {
        return $this->_simpleRequest(
            '/temporal.api.workflowservice.v1.WorkflowService/ListWorkflowExecutions',
            $argument,
            ['\Temporal\Api\Workflowservice\V1\ListWorkflowExecutionsResponse', 'decode'],
            $metadata,
            $options
        );
    }

    public function SignalWorkflowExecution(
        \Temporal\Api\Workflowservice\V1\SignalWorkflowExecutionRequest $argument,
        $metadata = [],
        $options = []
    ) {
        return $this->_simpleRequest(
            '/temporal.api.workflowservice.v1.WorkflowService/SignalWorkflowExecution',
            $argument,
            ['\Temporal\Api\Workflowservice\V1\SignalWorkflowExecutionResponse', 'decode'],
            $metadata,
            $options
        );
    }

    public function TerminateWorkflowExecution(
        \Temporal\Api\Workflowservice\V1\TerminateWorkflowExecutionRequest $argument,
        $metadata = [],
        $options = []
    ) {
        return $this->_simpleRequest(
            '/temporal.api.workflowservice.v1.WorkflowService/TerminateWorkflowExecution',
            $argument,
            ['\Temporal\Api\Workflowservice\V1\TerminateWorkflowExecutionResponse', 'decode'],
            $metadata,
            $options
        );
    }

    public function GetWorkflowExecutionHistory(
        \Temporal\Api\Workflowservice\V1\GetWorkflowExecutionHistoryRequest $argument,
        $metadata = [],
        $options = []
    ) {
        return $this->_simpleRequest(
            '/temporal.api.workflowservice.v1.WorkflowService/GetWorkflowExecutionHistory',
            $argument,
            ['\Temporal\Api\Workflowservice\V1\GetWorkflowExecutionHistoryResponse', 'decode'],
            $metadata,
            $options
        );
    }

    public function CountWorkflowExecutions(
        \Temporal\Api\Workflowservice\V1\CountWorkflowExecutionsRequest $argument,
        $metadata = [],
        $options = []
    ) {
        return $this->_simpleRequest(
            '/temporal.api.workflowservice.v1.WorkflowService/CountWorkflowExecutions',
            $argument,
            ['\Temporal\Api\Workflowservice\V1\CountWorkflowExecutionsResponse', 'decode'],
            $metadata,
            $options
        );
    }

    public function DescribeNamespace(
        \Temporal\Api\Workflowservice\V1\DescribeNamespaceRequest $argument,
        $metadata = [],
        $options = []
    ) {
        return $this->_simpleRequest(
            '/temporal.api.workflowservice.v1.WorkflowService/DescribeNamespace',
            $argument,
            ['\Temporal\Api\Workflowservice\V1\DescribeNamespaceResponse', 'decode'],
            $metadata,
            $options
        );
    }

    public function ListNamespaces(
        \Temporal\Api\Workflowservice\V1\ListNamespacesRequest $argument,
        $metadata = [],
        $options = []
    ) {
        return $this->_simpleRequest(
            '/temporal.api.workflowservice.v1.WorkflowService/ListNamespaces',
            $argument,
            ['\Temporal\Api\Workflowservice\V1\ListNamespacesResponse', 'decode'],
            $metadata,
            $options
        );
    }

    public function GetSystemInfo(
        \Temporal\Api\Workflowservice\V1\GetSystemInfoRequest $argument,
        $metadata = [],
        $options = []
    ) {
        return $this->_simpleRequest(
            '/temporal.api.workflowservice.v1.WorkflowService/GetSystemInfo',
            $argument,
            ['\Temporal\Api\Workflowservice\V1\GetSystemInfoResponse', 'decode'],
            $metadata,
            $options
        );
    }

    public function QueryWorkflow(
        \Temporal\Api\Workflowservice\V1\QueryWorkflowRequest $argument,
        $metadata = [],
        $options = []
    ) {
        return $this->_simpleRequest(
            '/temporal.api.workflowservice.v1.WorkflowService/QueryWorkflow',
            $argument,
            ['\Temporal\Api\Workflowservice\V1\QueryWorkflowResponse', 'decode'],
            $metadata,
            $options
        );
    }

    public function DescribeTaskQueue(
        \Temporal\Api\Workflowservice\V1\DescribeTaskQueueRequest $argument,
        $metadata = [],
        $options = []
    ) {
        return $this->_simpleRequest(
            '/temporal.api.workflowservice.v1.WorkflowService/DescribeTaskQueue',
            $argument,
            ['\Temporal\Api\Workflowservice\V1\DescribeTaskQueueResponse', 'decode'],
            $metadata,
            $options
        );
    }
}
