<?php

namespace Fleetbase\CityOS\Services;

use Symfony\Component\Process\Process;

class TemporalCliBridge
{
    protected string $phpBinary;
    protected string $artisanPath;
    protected string $phpIniScanDir;
    protected int $timeout;

    public function __construct(int $timeout = 30)
    {
        $this->phpBinary = PHP_BINARY;
        $this->artisanPath = base_path('artisan');
        $this->timeout = $timeout;

        $nixPhpLib = '/nix/store/8xs6a2mh8vhb0r5ds4wh5nm6a59x66z6-php-with-extensions-8.2.23/lib';
        $grpcConf = base_path('php-ext-conf');
        $this->phpIniScanDir = "{$nixPhpLib}:{$grpcConf}";
    }

    public function execute(string $operation, array $options = []): array
    {
        $command = [
            $this->phpBinary,
            $this->artisanPath,
            'cityos:temporal',
            $operation,
            '--json',
        ];

        foreach ($options as $key => $value) {
            if ($value === null || $value === false) continue;
            if ($value === true) {
                $command[] = "--{$key}";
            } else {
                $command[] = "--{$key}={$value}";
            }
        }

        $env = array_merge($_ENV, $_SERVER, [
            'PHP_INI_SCAN_DIR' => $this->phpIniScanDir,
        ]);

        $env = array_filter($env, fn ($v) => is_string($v));

        $process = new Process($command, null, $env);
        $process->setTimeout($this->timeout);

        try {
            $process->run();
            $output = $process->getOutput();
            $errorOutput = $process->getErrorOutput();

            $jsonStart = strpos($output, '{');
            $jsonStartArray = strpos($output, '[');

            if ($jsonStart === false && $jsonStartArray === false) {
                return [
                    'success' => false,
                    'error' => 'No JSON output from CLI bridge',
                    'raw_output' => substr($output, 0, 500),
                    'stderr' => substr($errorOutput, 0, 500),
                    'exit_code' => $process->getExitCode(),
                    'mode' => 'cli_bridge',
                ];
            }

            $start = $jsonStart !== false && ($jsonStartArray === false || $jsonStart < $jsonStartArray) ? $jsonStart : $jsonStartArray;
            $jsonStr = substr($output, $start);
            $result = json_decode($jsonStr, true);

            if ($result === null) {
                return [
                    'success' => false,
                    'error' => 'Failed to parse CLI JSON output',
                    'raw_output' => substr($output, 0, 500),
                    'mode' => 'cli_bridge',
                ];
            }

            $result['mode'] = 'cli_bridge';
            return $result;
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => 'CLI bridge execution failed: ' . $e->getMessage(),
                'mode' => 'cli_bridge',
            ];
        }
    }

    public function health(): array
    {
        return $this->execute('health');
    }

    public function describeNamespace(): array
    {
        return $this->execute('namespace');
    }

    public function listWorkflows(int $pageSize = 20, string $query = ''): array
    {
        $options = ['page-size' => $pageSize];
        if (!empty($query)) {
            $options['query'] = $query;
        }
        return $this->execute('list', $options);
    }

    public function startWorkflow(string $workflowType, string $workflowId, array $input = [], string $taskQueue = 'cityos-workflow-queue'): array
    {
        $options = [
            'workflow-type' => $workflowType,
            'workflow-id' => $workflowId,
            'task-queue' => $taskQueue,
        ];
        if (!empty($input)) {
            $options['input'] = json_encode($input);
        }
        return $this->execute('start', $options);
    }

    public function describeWorkflow(string $workflowId, ?string $runId = null): array
    {
        $options = ['workflow-id' => $workflowId];
        if ($runId) {
            $options['run-id'] = $runId;
        }
        return $this->execute('describe', $options);
    }

    public function signalWorkflow(string $workflowId, string $signalName, array $payload = [], ?string $runId = null): array
    {
        $options = [
            'workflow-id' => $workflowId,
            'signal-name' => $signalName,
        ];
        if (!empty($payload)) {
            $options['input'] = json_encode($payload);
        }
        if ($runId) {
            $options['run-id'] = $runId;
        }
        return $this->execute('signal', $options);
    }

    public function terminateWorkflow(string $workflowId, string $reason = '', ?string $runId = null): array
    {
        $options = [
            'workflow-id' => $workflowId,
            'reason' => $reason,
        ];
        if ($runId) {
            $options['run-id'] = $runId;
        }
        return $this->execute('terminate', $options);
    }

    public function syncRegistry(): array
    {
        return $this->execute('sync');
    }

    public static function isGrpcAvailable(): bool
    {
        return extension_loaded('grpc');
    }
}
