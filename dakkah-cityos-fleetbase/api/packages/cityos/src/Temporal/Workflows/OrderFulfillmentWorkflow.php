<?php

namespace Fleetbase\CityOS\Temporal\Workflows;

use Fleetbase\CityOS\Temporal\Activities\OrderActivities;

class OrderFulfillmentWorkflow extends AbstractWorkflow
{
    public function getWorkflowType(): string
    {
        return 'order-fulfillment';
    }

    public function getTaskQueue(): string
    {
        return 'cityos-order-queue';
    }

    public function getDescription(): string
    {
        return 'Orchestrates the full order lifecycle from validation through delivery and settlement.';
    }

    public function getSteps(): array
    {
        return [
            ['name' => 'validate_order', 'description' => 'Validate order details and inventory availability', 'timeout' => 30],
            ['name' => 'assign_driver', 'description' => 'Find and assign an available driver for delivery', 'timeout' => 120],
            ['name' => 'confirm_pickup', 'description' => 'Confirm driver has picked up the order', 'timeout' => 300],
            ['name' => 'track_transit', 'description' => 'Track order in transit to destination', 'timeout' => 1800],
            ['name' => 'confirm_delivery', 'description' => 'Confirm order has been delivered to customer', 'timeout' => 300],
            ['name' => 'process_payment', 'description' => 'Process payment and finalize settlement', 'timeout' => 60],
        ];
    }

    public function getDefaultOptions(): array
    {
        return array_merge(parent::getDefaultOptions(), [
            'workflow_execution_timeout' => 7200,
            'workflow_run_timeout' => 7200,
        ]);
    }

    public function execute(array $input): array
    {
        $orderId = $input['order_id'] ?? null;
        $results = [];
        $activities = new OrderActivities();

        $this->logStep('validate_order', 'started', ['order_id' => $orderId]);
        $results[] = $activities->validateOrder($input);

        $this->logStep('assign_driver', 'started', ['order_id' => $orderId]);
        $results[] = $activities->assignDriver($input);

        $this->logStep('confirm_pickup', 'started', ['order_id' => $orderId]);
        $results[] = $activities->confirmPickup($input);

        $this->logStep('track_transit', 'started', ['order_id' => $orderId]);
        $results[] = $activities->trackTransit($input);

        $this->logStep('confirm_delivery', 'started', ['order_id' => $orderId]);
        $results[] = $activities->confirmDelivery($input);

        $this->logStep('process_payment', 'started', ['order_id' => $orderId]);
        $results[] = $activities->processPayment($input);

        $this->logStep('workflow_complete', 'completed', ['order_id' => $orderId]);

        return [
            'workflow_type' => $this->getWorkflowType(),
            'order_id' => $orderId,
            'status' => 'completed',
            'steps' => $results,
        ];
    }
}
