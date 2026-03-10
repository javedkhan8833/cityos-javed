<?php

namespace Fleetbase\CityOS\Temporal\Workflows;

use Fleetbase\CityOS\Temporal\Activities\SettlementActivities;

class SettlementPayoutWorkflow extends AbstractWorkflow
{
    public function getWorkflowType(): string
    {
        return 'settlement-payout';
    }

    public function getTaskQueue(): string
    {
        return 'cityos-settlement-queue';
    }

    public function getDescription(): string
    {
        return 'Financial settlement cycle from transaction aggregation through fee calculation to payout generation and reconciliation.';
    }

    public function getSteps(): array
    {
        return [
            ['name' => 'aggregate_transactions', 'description' => 'Collect and aggregate transactions for the settlement period', 'timeout' => 120],
            ['name' => 'calculate_fees', 'description' => 'Calculate platform fees, commissions, and taxes', 'timeout' => 60],
            ['name' => 'apply_penalties', 'description' => 'Apply any penalties or deductions', 'timeout' => 60],
            ['name' => 'generate_payout', 'description' => 'Generate payout instructions for payment processor', 'timeout' => 120],
            ['name' => 'reconcile_accounts', 'description' => 'Reconcile accounts and verify settlement totals', 'timeout' => 120],
        ];
    }

    public function getDefaultOptions(): array
    {
        return array_merge(parent::getDefaultOptions(), [
            'workflow_execution_timeout' => 3600,
            'retry_policy' => [
                'initial_interval' => 5,
                'backoff_coefficient' => 2.0,
                'maximum_interval' => 300,
                'maximum_attempts' => 5,
            ],
        ]);
    }

    public function execute(array $input): array
    {
        $settlementPeriod = $input['settlement_period'] ?? null;
        $results = [];
        $activities = new SettlementActivities();

        $this->logStep('aggregate_transactions', 'started', ['period' => $settlementPeriod]);
        $txResult = $activities->aggregateTransactions($input);
        $results[] = $txResult;

        $this->logStep('calculate_fees', 'started', ['period' => $settlementPeriod]);
        $results[] = $activities->calculateFees(array_merge($input, ['transactions' => $txResult['data'] ?? []]));

        $this->logStep('apply_penalties', 'started', ['period' => $settlementPeriod]);
        $results[] = $activities->applyPenalties($input);

        $this->logStep('generate_payout', 'started', ['period' => $settlementPeriod]);
        $results[] = $activities->generatePayout($input);

        $this->logStep('reconcile_accounts', 'started', ['period' => $settlementPeriod]);
        $results[] = $activities->reconcileAccounts($input);

        $this->logStep('workflow_complete', 'completed', ['period' => $settlementPeriod]);

        return [
            'workflow_type' => $this->getWorkflowType(),
            'settlement_period' => $settlementPeriod,
            'status' => 'completed',
            'steps' => $results,
        ];
    }
}
