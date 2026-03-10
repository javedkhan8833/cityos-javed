<?php

namespace Fleetbase\CityOS\Temporal\Activities;

use Illuminate\Support\Facades\Log;

abstract class AbstractActivity
{
    abstract public function getActivityType(): string;

    protected function logExecution(string $method, array $input = [], string $status = 'started'): void
    {
        Log::info("[Temporal:Activity:{$this->getActivityType()}] {$method} - {$status}", [
            'activity_type' => $this->getActivityType(),
            'method' => $method,
            'input_keys' => array_keys($input),
        ]);
    }

    protected function buildResult(string $method, string $status, array $data = []): array
    {
        return [
            'activity' => $this->getActivityType(),
            'method' => $method,
            'status' => $status,
            'timestamp' => now()->toIso8601String(),
            'data' => $data,
        ];
    }

    protected function success(string $method, array $data = []): array
    {
        $this->logExecution($method, $data, 'completed');
        return $this->buildResult($method, 'completed', $data);
    }

    protected function failure(string $method, string $error, array $data = []): array
    {
        $this->logExecution($method, $data, 'failed');
        return $this->buildResult($method, 'failed', array_merge($data, ['error' => $error]));
    }
}
