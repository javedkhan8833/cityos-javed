<?php

namespace Fleetbase\CityOS\Temporal\Workflows;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

abstract class AbstractWorkflow
{
    abstract public function getWorkflowType(): string;

    abstract public function getTaskQueue(): string;

    abstract public function getDescription(): string;

    abstract public function getSteps(): array;

    abstract public function execute(array $input): array;

    public function getDefaultOptions(): array
    {
        return [
            'workflow_execution_timeout' => 3600,
            'workflow_run_timeout' => 3600,
            'workflow_task_timeout' => 10,
            'retry_policy' => [
                'initial_interval' => 1,
                'backoff_coefficient' => 2.0,
                'maximum_interval' => 60,
                'maximum_attempts' => 3,
            ],
        ];
    }

    public function generateWorkflowId(string $prefix = ''): string
    {
        $type = $this->getWorkflowType();
        $pfx = $prefix ?: $type;
        return $pfx . '-' . Str::uuid()->toString();
    }

    public function toDefinition(): array
    {
        return [
            'workflow_type' => $this->getWorkflowType(),
            'task_queue' => $this->getTaskQueue(),
            'description' => $this->getDescription(),
            'steps' => $this->getSteps(),
            'default_options' => $this->getDefaultOptions(),
        ];
    }

    protected function logStep(string $step, string $status, array $context = []): void
    {
        Log::info("[Temporal:{$this->getWorkflowType()}] Step: {$step} - Status: {$status}", $context);
    }

    protected function buildStepResult(string $step, string $status, array $data = []): array
    {
        return [
            'step' => $step,
            'status' => $status,
            'timestamp' => now()->toIso8601String(),
            'data' => $data,
        ];
    }

    public static function getAllDefinitions(): array
    {
        $workflows = [
            new OrderFulfillmentWorkflow(),
            new InventoryReplenishmentWorkflow(),
            new SettlementPayoutWorkflow(),
            new ComplianceAuditWorkflow(),
        ];

        return array_map(fn (AbstractWorkflow $wf) => $wf->toDefinition(), $workflows);
    }
}
