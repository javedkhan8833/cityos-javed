<?php

namespace Fleetbase\CityOS\Temporal\Workflows;

use Fleetbase\CityOS\Temporal\Activities\InventoryActivities;

class InventoryReplenishmentWorkflow extends AbstractWorkflow
{
    public function getWorkflowType(): string
    {
        return 'inventory-replenishment';
    }

    public function getTaskQueue(): string
    {
        return 'cityos-inventory-queue';
    }

    public function getDescription(): string
    {
        return 'Automated stock replenishment from monitoring levels through purchase order creation to inventory update.';
    }

    public function getSteps(): array
    {
        return [
            ['name' => 'check_stock_levels', 'description' => 'Monitor current stock levels against thresholds', 'timeout' => 60],
            ['name' => 'create_purchase_order', 'description' => 'Create purchase order for items below threshold', 'timeout' => 120],
            ['name' => 'approve_purchase_order', 'description' => 'Route PO for approval based on amount', 'timeout' => 3600],
            ['name' => 'receive_goods', 'description' => 'Record receipt of goods from supplier', 'timeout' => 1800],
            ['name' => 'shelve_inventory', 'description' => 'Assign received goods to warehouse locations', 'timeout' => 600],
            ['name' => 'update_inventory', 'description' => 'Update inventory records and notify stakeholders', 'timeout' => 60],
        ];
    }

    public function getDefaultOptions(): array
    {
        return array_merge(parent::getDefaultOptions(), [
            'workflow_execution_timeout' => 86400,
            'workflow_run_timeout' => 86400,
        ]);
    }

    public function execute(array $input): array
    {
        $warehouseId = $input['warehouse_id'] ?? null;
        $results = [];
        $activities = new InventoryActivities();

        $this->logStep('check_stock_levels', 'started', ['warehouse_id' => $warehouseId]);
        $stockResult = $activities->checkStockLevels($input);
        $results[] = $stockResult;

        $this->logStep('create_purchase_order', 'started', ['warehouse_id' => $warehouseId]);
        $results[] = $activities->createPurchaseOrder(array_merge($input, ['low_stock_items' => $stockResult['data']['low_stock_items'] ?? []]));

        $this->logStep('receive_goods', 'started', ['warehouse_id' => $warehouseId]);
        $results[] = $activities->receiveGoods($input);

        $this->logStep('update_inventory', 'started', ['warehouse_id' => $warehouseId]);
        $results[] = $activities->updateInventory($input);

        $this->logStep('notify_stakeholders', 'started', ['warehouse_id' => $warehouseId]);
        $results[] = $activities->notifyStakeholders($input);

        $this->logStep('workflow_complete', 'completed', ['warehouse_id' => $warehouseId]);

        return [
            'workflow_type' => $this->getWorkflowType(),
            'warehouse_id' => $warehouseId,
            'status' => 'completed',
            'steps' => $results,
        ];
    }
}
