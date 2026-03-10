<?php

namespace Fleetbase\CityOS\Temporal\Grpc;

use Grpc\ChannelCredentials;
use Grpc\CallCredentials;

class TemporalGrpcClient
{
    protected string $endpoint;
    protected string $namespace;
    protected string $apiKey;
    protected $channel;

    public function __construct(string $endpoint, string $namespace, string $apiKey)
    {
        $this->endpoint = $endpoint;
        $this->namespace = $namespace;
        $this->apiKey = $apiKey;
    }

    protected function createChannel()
    {
        $callCreds = CallCredentials::createFromPlugin(function ($context) {
            return [
                'authorization' => ['Bearer ' . $this->apiKey],
                'temporal-namespace' => [$this->namespace],
            ];
        });

        $sslCreds = ChannelCredentials::createSsl();
        $compositeCreds = ChannelCredentials::createComposite($sslCreds, $callCreds);

        $host = preg_replace('/:7233$/', '', $this->endpoint);

        return new \Grpc\Channel($this->endpoint, [
            'credentials' => $compositeCreds,
            'grpc.default_authority' => $host,
        ]);
    }

    protected function makeUnaryCall(string $method, string $requestBytes, int $timeoutMs = 15000): array
    {
        $channel = $this->createChannel();

        try {
            $deadline = \Grpc\Timeval::infFuture();
            if ($timeoutMs > 0) {
                $now = \Grpc\Timeval::now();
                $delta = new \Grpc\Timeval($timeoutMs * 1000);
                $deadline = $now->add($delta);
            }

            $call = new \Grpc\Call($channel, $method, $deadline);

            $metadata = [
                'te' => ['trailers'],
            ];

            $call->startBatch([
                \Grpc\OP_SEND_INITIAL_METADATA => $metadata,
                \Grpc\OP_SEND_MESSAGE => ['message' => $requestBytes],
                \Grpc\OP_SEND_CLOSE_FROM_CLIENT => true,
            ]);

            $event = $call->startBatch([
                \Grpc\OP_RECV_INITIAL_METADATA => true,
                \Grpc\OP_RECV_MESSAGE => true,
                \Grpc\OP_RECV_STATUS_ON_CLIENT => true,
            ]);

            $status = $event->status ?? null;
            $responseBytes = $event->message ?? '';

            return [
                'status_code' => $status ? $status->code : -1,
                'status_details' => $status ? ($status->details ?? '') : 'No status',
                'response' => $responseBytes,
                'metadata' => $event->metadata ?? [],
            ];
        } finally {
            $channel->close();
        }
    }

    protected function encodeString(int $fieldNum, string $value): string
    {
        if (empty($value)) return '';
        $tag = ($fieldNum << 3) | 2;
        return $this->encodeVarint($tag) . $this->encodeVarint(strlen($value)) . $value;
    }

    protected function encodeVarint(int $value): string
    {
        $result = '';
        while ($value > 0x7F) {
            $result .= chr(($value & 0x7F) | 0x80);
            $value >>= 7;
        }
        $result .= chr($value & 0x7F);
        return $result;
    }

    protected function encodeInt32(int $fieldNum, int $value): string
    {
        if ($value === 0) return '';
        $tag = ($fieldNum << 3) | 0;
        return $this->encodeVarint($tag) . $this->encodeVarint($value);
    }

    protected function encodeBytes(int $fieldNum, string $data): string
    {
        if (empty($data)) return '';
        $tag = ($fieldNum << 3) | 2;
        return $this->encodeVarint($tag) . $this->encodeVarint(strlen($data)) . $data;
    }

    protected function decodeProtobuf(string $data): array
    {
        $result = [];
        $offset = 0;
        $len = strlen($data);

        while ($offset < $len) {
            list($tag, $offset) = $this->readVarint($data, $offset);
            $fieldNum = $tag >> 3;
            $wireType = $tag & 0x07;

            switch ($wireType) {
                case 0: // Varint
                    list($value, $offset) = $this->readVarint($data, $offset);
                    $result[$fieldNum] = $value;
                    break;
                case 1: // 64-bit
                    $result[$fieldNum] = substr($data, $offset, 8);
                    $offset += 8;
                    break;
                case 2: // Length-delimited
                    list($strLen, $offset) = $this->readVarint($data, $offset);
                    $result[$fieldNum] = substr($data, $offset, $strLen);
                    $offset += $strLen;
                    break;
                case 5: // 32-bit
                    $result[$fieldNum] = substr($data, $offset, 4);
                    $offset += 4;
                    break;
                default:
                    break 2;
            }
        }

        return $result;
    }

    protected function readVarint(string $data, int $offset): array
    {
        $result = 0;
        $shift = 0;
        $len = strlen($data);

        while ($offset < $len) {
            $byte = ord($data[$offset]);
            $offset++;
            $result |= ($byte & 0x7F) << $shift;
            if (($byte & 0x80) === 0) break;
            $shift += 7;
            if ($shift >= 64) break;
        }

        return [$result, $offset];
    }

    public function getSystemInfo(): array
    {
        $startTime = microtime(true);

        try {
            $result = $this->makeUnaryCall(
                '/temporal.api.workflowservice.v1.WorkflowService/GetSystemInfo',
                ''
            );

            $duration = (microtime(true) - $startTime) * 1000;

            $success = ($result['status_code'] === 0);

            $info = [
                'reachable' => $success,
                'grpc_status_code' => $result['status_code'],
                'grpc_status' => $this->statusName($result['status_code']),
                'duration_ms' => round($duration, 2),
            ];

            if ($success && !empty($result['response'])) {
                $decoded = $this->decodeProtobuf($result['response']);
                $info['server_version'] = $decoded[2] ?? null;
                if (isset($decoded[1])) {
                    $caps = $this->decodeProtobuf($decoded[1]);
                    $info['server_capabilities'] = [
                        'signal_and_query_header' => (bool)($caps[1] ?? false),
                        'internal_error_differentiation' => (bool)($caps[2] ?? false),
                        'eager_workflow_start' => (bool)($caps[6] ?? false),
                        'sdk_metadata' => (bool)($caps[4] ?? false),
                    ];
                }
            }

            if (!$success) {
                $info['error'] = $result['status_details'] ?: 'gRPC call failed';
            }

            return $info;
        } catch (\Exception $e) {
            return [
                'reachable' => false,
                'error' => $e->getMessage(),
                'duration_ms' => round((microtime(true) - $startTime) * 1000, 2),
            ];
        }
    }

    public function describeNamespace(string $namespaceName = null): array
    {
        $ns = $namespaceName ?? $this->namespace;
        $startTime = microtime(true);

        try {
            $requestBytes = $this->encodeString(1, $ns);

            $result = $this->makeUnaryCall(
                '/temporal.api.workflowservice.v1.WorkflowService/DescribeNamespace',
                $requestBytes
            );

            $duration = (microtime(true) - $startTime) * 1000;

            if ($result['status_code'] !== 0) {
                return [
                    'success' => false,
                    'grpc_status' => $this->statusName($result['status_code']),
                    'error' => $result['status_details'] ?: 'Failed',
                    'duration_ms' => round($duration, 2),
                ];
            }

            $response = $this->decodeProtobuf($result['response']);
            $data = [];

            if (isset($response[1])) {
                $nsInfo = $this->decodeProtobuf($response[1]);
                $data['name'] = $nsInfo[1] ?? null;
                $data['description'] = $nsInfo[4] ?? null;
                $data['state'] = $nsInfo[2] ?? null;
                $data['owner_email'] = $nsInfo[5] ?? null;
            }

            if (isset($response[2])) {
                $config = $this->decodeProtobuf($response[2]);
                if (isset($config[1])) {
                    $ttl = $this->decodeProtobuf($config[1]);
                    $retentionSeconds = $ttl[1] ?? 0;
                    $data['retention_days'] = $retentionSeconds > 0 ? round($retentionSeconds / 86400, 1) : null;
                }
            }

            $data['is_global'] = (bool)($response[4] ?? false);

            return [
                'success' => true,
                'data' => $data,
                'duration_ms' => round($duration, 2),
            ];
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function listWorkflowExecutions(int $pageSize = 20, string $query = ''): array
    {
        $startTime = microtime(true);

        try {
            $requestBytes = $this->encodeString(1, $this->namespace)
                . $this->encodeInt32(2, $pageSize);

            if (!empty($query)) {
                $requestBytes .= $this->encodeString(5, $query);
            }

            $result = $this->makeUnaryCall(
                '/temporal.api.workflowservice.v1.WorkflowService/ListWorkflowExecutions',
                $requestBytes,
                30000
            );

            $duration = (microtime(true) - $startTime) * 1000;

            if ($result['status_code'] !== 0) {
                return [
                    'success' => false,
                    'grpc_status' => $this->statusName($result['status_code']),
                    'error' => $result['status_details'] ?: 'Failed',
                ];
            }

            $executions = [];
            $items = $this->decodeRepeatedField($result['response'], 1);

            foreach ($items as $itemData) {
                $exec = $this->decodeProtobuf($itemData);
                $wfInfo = [];

                if (isset($exec[1])) {
                    $execution = $this->decodeProtobuf($exec[1]);
                    $wfInfo['workflow_id'] = $execution[1] ?? null;
                    $wfInfo['run_id'] = $execution[2] ?? null;
                }
                if (isset($exec[2])) {
                    $wfType = $this->decodeProtobuf($exec[2]);
                    $wfInfo['type'] = $wfType[1] ?? null;
                }
                $statusMap = [0 => 'UNSPECIFIED', 1 => 'RUNNING', 2 => 'COMPLETED', 3 => 'FAILED', 4 => 'CANCELED', 5 => 'TERMINATED', 6 => 'CONTINUED_AS_NEW', 7 => 'TIMED_OUT'];
                $wfInfo['status'] = $statusMap[$exec[5] ?? 0] ?? 'UNKNOWN';
                $wfInfo['history_length'] = $exec[6] ?? 0;
                $wfInfo['task_queue'] = $exec[13] ?? null;

                $executions[] = $wfInfo;
            }

            return [
                'success' => true,
                'data' => [
                    'executions' => $executions,
                    'total' => count($executions),
                ],
                'duration_ms' => round($duration, 2),
            ];
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    protected function decodeRepeatedField(string $data, int $targetField): array
    {
        $items = [];
        $offset = 0;
        $len = strlen($data);

        while ($offset < $len) {
            list($tag, $newOffset) = $this->readVarint($data, $offset);
            $fieldNum = $tag >> 3;
            $wireType = $tag & 0x07;
            $offset = $newOffset;

            if ($wireType === 2) {
                list($strLen, $offset) = $this->readVarint($data, $offset);
                $fieldData = substr($data, $offset, $strLen);
                $offset += $strLen;

                if ($fieldNum === $targetField) {
                    $items[] = $fieldData;
                }
            } elseif ($wireType === 0) {
                list($value, $offset) = $this->readVarint($data, $offset);
            } elseif ($wireType === 1) {
                $offset += 8;
            } elseif ($wireType === 5) {
                $offset += 4;
            } else {
                break;
            }
        }

        return $items;
    }

    public function startWorkflowExecution(
        string $workflowId,
        string $workflowType,
        string $taskQueue = 'cityos-default',
        array $input = [],
        string $requestId = null
    ): array {
        $startTime = microtime(true);

        try {
            $requestId = $requestId ?? bin2hex(random_bytes(16));

            $workflowTypeBytes = $this->encodeString(1, $workflowType);
            $taskQueueBytes = $this->encodeString(1, $taskQueue);

            $requestBytes = $this->encodeString(1, $this->namespace)
                . $this->encodeString(2, $workflowId)
                . $this->encodeBytes(3, $workflowTypeBytes)
                . $this->encodeBytes(4, $taskQueueBytes)
                . $this->encodeString(9, 'cityos-php-grpc-client')
                . $this->encodeString(10, $requestId);

            if (!empty($input)) {
                $payloadData = json_encode($input);
                $encodingMeta = $this->encodeString(1, 'encoding') . $this->encodeString(2, 'json/plain');
                $metaMap = $this->encodeBytes(1, $encodingMeta);
                $payloadBytes = $metaMap . $this->encodeString(2, $payloadData);
                $payloadsBytes = $this->encodeBytes(1, $payloadBytes);
                $requestBytes .= $this->encodeBytes(5, $payloadsBytes);
            }

            $result = $this->makeUnaryCall(
                '/temporal.api.workflowservice.v1.WorkflowService/StartWorkflowExecution',
                $requestBytes,
                30000
            );

            $duration = (microtime(true) - $startTime) * 1000;

            if ($result['status_code'] !== 0) {
                return [
                    'success' => false,
                    'workflow_id' => $workflowId,
                    'grpc_status' => $this->statusName($result['status_code']),
                    'error' => $result['status_details'] ?: 'Failed to start workflow',
                    'duration_ms' => round($duration, 2),
                ];
            }

            $response = $this->decodeProtobuf($result['response']);
            $runId = $response[1] ?? null;

            return [
                'success' => true,
                'workflow_id' => $workflowId,
                'run_id' => $runId,
                'workflow_type' => $workflowType,
                'task_queue' => $taskQueue,
                'request_id' => $requestId,
                'mode' => 'grpc_direct',
                'duration_ms' => round($duration, 2),
            ];
        } catch (\Exception $e) {
            return ['success' => false, 'workflow_id' => $workflowId, 'error' => $e->getMessage()];
        }
    }

    public function describeWorkflowExecution(string $workflowId, string $runId = null): array
    {
        $startTime = microtime(true);

        try {
            $executionBytes = $this->encodeString(1, $workflowId);
            if ($runId) {
                $executionBytes .= $this->encodeString(2, $runId);
            }

            $requestBytes = $this->encodeString(1, $this->namespace)
                . $this->encodeBytes(2, $executionBytes);

            $result = $this->makeUnaryCall(
                '/temporal.api.workflowservice.v1.WorkflowService/DescribeWorkflowExecution',
                $requestBytes
            );

            $duration = (microtime(true) - $startTime) * 1000;

            if ($result['status_code'] !== 0) {
                return [
                    'success' => false,
                    'workflow_id' => $workflowId,
                    'grpc_status' => $this->statusName($result['status_code']),
                    'error' => $result['status_details'] ?: 'Failed',
                ];
            }

            $response = $this->decodeProtobuf($result['response']);
            $data = [];

            $statusMap = [0 => 'UNSPECIFIED', 1 => 'RUNNING', 2 => 'COMPLETED', 3 => 'FAILED', 4 => 'CANCELED', 5 => 'TERMINATED', 6 => 'CONTINUED_AS_NEW', 7 => 'TIMED_OUT'];

            if (isset($response[2])) {
                $wfInfo = $this->decodeProtobuf($response[2]);
                if (isset($wfInfo[1])) {
                    $exec = $this->decodeProtobuf($wfInfo[1]);
                    $data['workflow_id'] = $exec[1] ?? null;
                    $data['run_id'] = $exec[2] ?? null;
                }
                if (isset($wfInfo[2])) {
                    $wfType = $this->decodeProtobuf($wfInfo[2]);
                    $data['type'] = $wfType[1] ?? null;
                }
                $statusCode = $wfInfo[5] ?? 0;
                $data['status'] = $statusMap[$statusCode] ?? "UNKNOWN({$statusCode})";
                $data['history_length'] = $wfInfo[6] ?? 0;
                if (isset($wfInfo[13])) {
                    if (is_string($wfInfo[13]) && strlen($wfInfo[13]) > 0) {
                        $taskQueue = $this->decodeProtobuf($wfInfo[13]);
                        $data['task_queue'] = $taskQueue[1] ?? null;
                    } else {
                        $data['task_queue'] = $wfInfo[13];
                    }
                }
            }

            return [
                'success' => true,
                'workflow_id' => $workflowId,
                'data' => $data,
                'duration_ms' => round($duration, 2),
            ];
        } catch (\Exception $e) {
            return ['success' => false, 'workflow_id' => $workflowId, 'error' => $e->getMessage()];
        }
    }

    public function signalWorkflowExecution(
        string $workflowId,
        string $signalName,
        array $payload = [],
        string $runId = null,
        string $requestId = null
    ): array {
        $startTime = microtime(true);

        try {
            $requestId = $requestId ?? bin2hex(random_bytes(16));

            $executionBytes = $this->encodeString(1, $workflowId);
            if ($runId) {
                $executionBytes .= $this->encodeString(2, $runId);
            }

            $requestBytes = $this->encodeString(1, $this->namespace)
                . $this->encodeBytes(2, $executionBytes)
                . $this->encodeString(3, $signalName)
                . $this->encodeString(6, 'cityos-php-grpc-client')
                . $this->encodeString(7, $requestId);

            if (!empty($payload)) {
                $payloadData = json_encode($payload);
                $encodingMeta = $this->encodeString(1, 'encoding') . $this->encodeString(2, 'json/plain');
                $metaMap = $this->encodeBytes(1, $encodingMeta);
                $payloadBytes = $metaMap . $this->encodeString(2, $payloadData);
                $payloadsBytes = $this->encodeBytes(1, $payloadBytes);
                $requestBytes .= $this->encodeBytes(4, $payloadsBytes);
            }

            $result = $this->makeUnaryCall(
                '/temporal.api.workflowservice.v1.WorkflowService/SignalWorkflowExecution',
                $requestBytes
            );

            $duration = (microtime(true) - $startTime) * 1000;

            if ($result['status_code'] !== 0) {
                return [
                    'success' => false,
                    'workflow_id' => $workflowId,
                    'signal_name' => $signalName,
                    'grpc_status' => $this->statusName($result['status_code']),
                    'error' => $result['status_details'] ?: 'Failed',
                ];
            }

            return [
                'success' => true,
                'workflow_id' => $workflowId,
                'signal_name' => $signalName,
                'request_id' => $requestId,
                'mode' => 'grpc_direct',
                'duration_ms' => round($duration, 2),
            ];
        } catch (\Exception $e) {
            return ['success' => false, 'workflow_id' => $workflowId, 'error' => $e->getMessage()];
        }
    }

    public function terminateWorkflowExecution(string $workflowId, string $reason = '', string $runId = null): array
    {
        $startTime = microtime(true);

        try {
            $executionBytes = $this->encodeString(1, $workflowId);
            if ($runId) {
                $executionBytes .= $this->encodeString(2, $runId);
            }

            $requestBytes = $this->encodeString(1, $this->namespace)
                . $this->encodeBytes(2, $executionBytes)
                . $this->encodeString(3, $reason)
                . $this->encodeString(5, 'cityos-php-grpc-client');

            $result = $this->makeUnaryCall(
                '/temporal.api.workflowservice.v1.WorkflowService/TerminateWorkflowExecution',
                $requestBytes
            );

            $duration = (microtime(true) - $startTime) * 1000;

            if ($result['status_code'] !== 0) {
                return [
                    'success' => false,
                    'workflow_id' => $workflowId,
                    'grpc_status' => $this->statusName($result['status_code']),
                    'error' => $result['status_details'] ?: 'Failed to terminate',
                    'duration_ms' => round($duration, 2),
                ];
            }

            return [
                'success' => true,
                'workflow_id' => $workflowId,
                'reason' => $reason,
                'mode' => 'grpc_direct',
                'duration_ms' => round($duration, 2),
            ];
        } catch (\Exception $e) {
            return ['success' => false, 'workflow_id' => $workflowId, 'error' => $e->getMessage()];
        }
    }

    public function close(): void
    {
    }

    protected function statusName(int $code): string
    {
        $statuses = [
            0 => 'OK', 1 => 'CANCELLED', 2 => 'UNKNOWN', 3 => 'INVALID_ARGUMENT',
            4 => 'DEADLINE_EXCEEDED', 5 => 'NOT_FOUND', 6 => 'ALREADY_EXISTS',
            7 => 'PERMISSION_DENIED', 8 => 'RESOURCE_EXHAUSTED', 9 => 'FAILED_PRECONDITION',
            10 => 'ABORTED', 11 => 'OUT_OF_RANGE', 12 => 'UNIMPLEMENTED',
            13 => 'INTERNAL', 14 => 'UNAVAILABLE', 15 => 'DATA_LOSS',
            16 => 'UNAUTHENTICATED',
        ];
        return $statuses[$code] ?? "UNKNOWN($code)";
    }

    public function __destruct()
    {
        $this->close();
    }
}
