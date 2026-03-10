<?php

namespace Fleetbase\CityOS\Http\Controllers;

use Fleetbase\CityOS\Services\ERPNextService;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class FinancialController extends Controller
{
    protected ERPNextService $erpnext;

    public function __construct()
    {
        $this->erpnext = app(ERPNextService::class);
    }

    public function listSettlements(Request $request)
    {
        $filters = $request->only(['status', 'vendor_id', 'period_start', 'period_end', 'page', 'limit']);
        $result = $this->erpnext->listSettlements($filters);
        return response()->json($result);
    }

    public function createSettlement(Request $request)
    {
        $data = $request->validate([
            'total_amount' => 'required|numeric|min:0',
            'vendor_id' => 'nullable|string',
            'company' => 'nullable|string',
            'currency' => 'nullable|string',
            'delivery_fee' => 'nullable|numeric',
            'service_fee' => 'nullable|numeric',
            'platform_fee' => 'nullable|numeric',
            'cod_amount' => 'nullable|numeric',
            'penalties_amount' => 'nullable|numeric',
            'net_amount' => 'nullable|numeric',
            'period_start' => 'nullable|date',
            'period_end' => 'nullable|date',
            'order_count' => 'nullable|integer',
            'notes' => 'nullable|string',
        ]);

        $result = $this->erpnext->createSettlement($data);
        return response()->json($result, $result['success'] ? 201 : 500);
    }

    public function getSettlement(string $id)
    {
        $result = $this->erpnext->getSettlement($id);
        return response()->json($result);
    }

    public function approveSettlement(string $id)
    {
        $result = $this->erpnext->approveSettlement($id);
        return response()->json($result);
    }

    public function processSettlement(string $id)
    {
        $result = $this->erpnext->processSettlement($id);
        return response()->json($result);
    }

    public function listCODCollections(Request $request)
    {
        $filters = $request->only(['status', 'order_id', 'collected_by', 'date_start', 'date_end', 'page', 'limit']);
        $result = $this->erpnext->getCODCollections($filters);
        return response()->json($result);
    }

    public function recordCODCollection(Request $request)
    {
        $data = $request->validate([
            'order_id' => 'required|string',
            'amount' => 'required|numeric|min:0',
            'collected_by' => 'required|string',
        ]);

        $result = $this->erpnext->recordCODCollection($data['order_id'], (float) $data['amount'], $data['collected_by']);
        return response()->json($result, $result['success'] ? 201 : 500);
    }

    public function codSummary(Request $request)
    {
        $dateRange = $request->only(['start', 'end']);
        $result = $this->erpnext->getCODSummary($dateRange);
        return response()->json($result);
    }

    public function reconcileCOD(Request $request)
    {
        $data = $request->validate([
            'settlement_id' => 'required|string',
        ]);

        $result = $this->erpnext->reconcileCOD($data['settlement_id']);
        return response()->json($result);
    }

    public function listPenalties(Request $request)
    {
        $filters = $request->only(['status', 'target_type', 'target_id', 'category', 'date_start', 'date_end', 'page', 'limit']);
        $result = $this->erpnext->getPenalties($filters);
        return response()->json($result);
    }

    public function createPenalty(Request $request)
    {
        $data = $request->validate([
            'amount' => 'required|numeric|min:0',
            'reason' => 'required|string',
            'target_type' => 'nullable|string',
            'target_id' => 'nullable|string',
            'category' => 'nullable|string',
            'currency' => 'nullable|string',
            'order_id' => 'nullable|string',
            'sla_id' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $result = $this->erpnext->createPenalty($data);
        return response()->json($result, $result['success'] ? 201 : 500);
    }

    public function applyPenalty(Request $request, string $id)
    {
        $data = $request->validate([
            'target_id' => 'required|string',
        ]);

        $result = $this->erpnext->applyPenalty($id, $data['target_id']);
        return response()->json($result);
    }

    public function waivePenalty(Request $request, string $id)
    {
        $data = $request->validate([
            'reason' => 'required|string',
        ]);

        $result = $this->erpnext->waivePenalty($id, $data['reason']);
        return response()->json($result);
    }

    public function penaltySummary(Request $request)
    {
        $dateRange = $request->only(['start', 'end']);
        $result = $this->erpnext->getPenaltySummary($dateRange);
        return response()->json($result);
    }

    public function listPayouts(Request $request)
    {
        $filters = $request->only(['status', 'vendor_id', 'period_start', 'period_end', 'page', 'limit']);
        $result = $this->erpnext->getPayouts($filters);
        return response()->json($result);
    }

    public function generatePayout(Request $request)
    {
        $data = $request->validate([
            'vendor_id' => 'required|string',
            'period_start' => 'nullable|date',
            'period_end' => 'nullable|date',
        ]);

        $period = [
            'start' => $data['period_start'] ?? now()->startOfWeek()->toDateString(),
            'end' => $data['period_end'] ?? now()->endOfWeek()->toDateString(),
        ];

        $result = $this->erpnext->generatePayout($data['vendor_id'], $period);
        return response()->json($result, $result['success'] ? 201 : 500);
    }

    public function approvePayout(string $id)
    {
        $result = $this->erpnext->approvePayout($id);
        return response()->json($result);
    }

    public function processPayout(string $id)
    {
        $result = $this->erpnext->processPayout($id);
        return response()->json($result);
    }

    public function payoutSummary(Request $request)
    {
        $dateRange = $request->only(['start', 'end']);
        $result = $this->erpnext->getPayoutSummary($dateRange);
        return response()->json($result);
    }

    public function runReconciliation(Request $request)
    {
        $period = $request->only(['start', 'end']);
        if (empty($period['start'])) {
            $period['start'] = now()->startOfWeek()->toDateString();
        }
        if (empty($period['end'])) {
            $period['end'] = now()->endOfWeek()->toDateString();
        }

        $result = $this->erpnext->reconcile($period);
        return response()->json($result);
    }

    public function reconciliationReport(Request $request)
    {
        $period = $request->only(['start', 'end']);
        if (empty($period['start'])) {
            $period['start'] = now()->startOfWeek()->toDateString();
        }
        if (empty($period['end'])) {
            $period['end'] = now()->endOfWeek()->toDateString();
        }

        $result = $this->erpnext->getReconciliationReport($period);
        return response()->json($result);
    }

    public function listDiscrepancies(Request $request)
    {
        $period = $request->only(['start', 'end']);
        if (empty($period['start'])) {
            $period['start'] = now()->startOfMonth()->toDateString();
        }
        if (empty($period['end'])) {
            $period['end'] = now()->toDateString();
        }

        $result = $this->erpnext->getDiscrepancies($period);
        return response()->json($result);
    }

    public function resolveDiscrepancy(Request $request, string $id)
    {
        $resolution = $request->validate([
            'type' => 'nullable|string',
            'notes' => 'nullable|string',
            'adjusted_amount' => 'nullable|numeric',
        ]);

        $result = $this->erpnext->resolveDiscrepancy($id, $resolution);
        return response()->json($result);
    }

    public function dashboard()
    {
        $result = $this->erpnext->getDashboard();
        return response()->json($result);
    }
}
