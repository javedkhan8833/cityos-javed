<?php

namespace Fleetbase\CityOS\Temporal\Activities;

class OrderActivities extends AbstractActivity
{
    public function getActivityType(): string
    {
        return 'order';
    }

    public function validateOrder(array $input): array
    {
        $this->logExecution('validateOrder', $input);
        $orderId = $input['order_id'] ?? null;
        return $this->success('validateOrder', [
            'order_id' => $orderId,
            'valid' => true,
            'checks' => [
                'items_available' => true,
                'address_valid' => true,
                'payment_method_valid' => true,
            ],
        ]);
    }

    public function assignDriver(array $input): array
    {
        $this->logExecution('assignDriver', $input);
        $orderId = $input['order_id'] ?? null;
        return $this->success('assignDriver', [
            'order_id' => $orderId,
            'driver_id' => null,
            'assignment_method' => 'auto',
            'estimated_pickup_time' => now()->addMinutes(15)->toIso8601String(),
        ]);
    }

    public function confirmPickup(array $input): array
    {
        $this->logExecution('confirmPickup', $input);
        return $this->success('confirmPickup', [
            'order_id' => $input['order_id'] ?? null,
            'pickup_confirmed' => true,
            'pickup_time' => now()->toIso8601String(),
        ]);
    }

    public function trackTransit(array $input): array
    {
        $this->logExecution('trackTransit', $input);
        return $this->success('trackTransit', [
            'order_id' => $input['order_id'] ?? null,
            'in_transit' => true,
            'estimated_delivery_time' => now()->addMinutes(30)->toIso8601String(),
        ]);
    }

    public function confirmDelivery(array $input): array
    {
        $this->logExecution('confirmDelivery', $input);
        return $this->success('confirmDelivery', [
            'order_id' => $input['order_id'] ?? null,
            'delivered' => true,
            'delivery_time' => now()->toIso8601String(),
            'proof_of_delivery' => null,
        ]);
    }

    public function processPayment(array $input): array
    {
        $this->logExecution('processPayment', $input);
        return $this->success('processPayment', [
            'order_id' => $input['order_id'] ?? null,
            'payment_processed' => true,
            'amount' => $input['amount'] ?? 0,
            'currency' => $input['currency'] ?? 'USD',
            'transaction_id' => null,
        ]);
    }
}
