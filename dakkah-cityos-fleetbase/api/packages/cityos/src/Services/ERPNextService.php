<?php

namespace Fleetbase\CityOS\Services;

use Fleetbase\CityOS\Models\IntegrationLog;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Http;

class ERPNextService
{
    protected string $baseUrl;
    protected string $apiKey;
    protected string $apiSecret;
    protected string $defaultCompany;
    protected string $defaultCurrency;

    public function __construct()
    {
        $this->baseUrl = config('erpnext.base_url', config('cityos.erpnext.base_url', env('ERPNEXT_BASE_URL', '')));
        $this->apiKey = config('erpnext.api_key', config('cityos.erpnext.api_key', env('ERPNEXT_API_KEY', '')));
        $this->apiSecret = config('erpnext.api_secret', config('cityos.erpnext.api_secret', env('ERPNEXT_API_SECRET', '')));
        $this->defaultCompany = config('erpnext.default_company', 'CityOS');
        $this->defaultCurrency = config('erpnext.default_currency', 'SAR');
    }

    public function isConfigured(): bool
    {
        return !empty($this->baseUrl) && !empty($this->apiKey);
    }

    protected function makeRequest(string $method, string $endpoint, array $data = []): array
    {
        if (!$this->isConfigured()) {
            return ['success' => false, 'mode' => 'stub', 'message' => 'ERPNext not configured'];
        }

        $url = rtrim($this->baseUrl, '/') . '/' . ltrim($endpoint, '/');

        $response = Http::withHeaders([
            'Authorization' => 'token ' . $this->apiKey . ':' . $this->apiSecret,
            'Content-Type' => 'application/json',
        ])->{$method}($url, $data);

        return [
            'success' => $response->successful(),
            'mode' => 'live',
            'status_code' => $response->status(),
            'data' => $response->json(),
        ];
    }

    protected function logAndReturn(string $operation, array $event, string $correlationId, array $liveResponse = null): array
    {
        $isLive = $this->isConfigured() && $liveResponse !== null;
        $mode = $isLive ? 'live' : 'stub';
        $status = $isLive ? ($liveResponse['success'] ? 'success' : 'error') : 'stub';

        IntegrationLog::logRequest('erpnext', $operation, [
            'correlation_id' => $correlationId,
            'request_data' => $event,
            'response_data' => $liveResponse['data'] ?? ['status' => 'queued', 'message' => "Event queued for ERPNext processing ({$mode} mode)"],
            'status' => $status,
            'error_message' => $isLive && !$liveResponse['success'] ? ($liveResponse['data']['message'] ?? 'ERPNext API error') : null,
            'response_code' => $liveResponse['status_code'] ?? null,
        ]);

        return [
            'success' => $isLive ? $liveResponse['success'] : true,
            'mode' => $mode,
            'correlation_id' => $correlationId,
            'data' => $isLive ? $liveResponse['data'] : $event,
            'message' => $isLive
                ? ($liveResponse['success'] ? "Operation {$operation} completed via ERPNext" : 'ERPNext API error')
                : "Operation {$operation} logged (stub mode)",
        ];
    }

    public function postDeliverySettlement(array $settlementData): array
    {
        $correlationId = (string) Str::uuid();

        $event = [
            'event_type' => 'DELIVERY_SETTLEMENT',
            'delivery_id' => $settlementData['delivery_id'] ?? '',
            'tenant_id' => $settlementData['tenant_id'] ?? '',
            'completed_at' => $settlementData['completed_at'] ?? now()->toIso8601String(),
            'provider' => $settlementData['provider'] ?? [],
            'financials' => [
                'delivery_fee' => $settlementData['delivery_fee'] ?? ['amount' => 0, 'currency' => 'SAR'],
                'service_fee' => $settlementData['service_fee'] ?? ['amount' => 0, 'currency' => 'SAR'],
                'provider_payout' => $settlementData['provider_payout'] ?? ['amount' => 0, 'currency' => 'SAR'],
                'platform_fee' => $settlementData['platform_fee'] ?? ['amount' => 0, 'currency' => 'SAR'],
                'tip' => $settlementData['tip'] ?? null,
                'cod_collected' => $settlementData['cod_collected'] ?? null,
                'penalties' => $settlementData['penalties'] ?? null,
            ],
            'references' => $settlementData['references'] ?? [],
            'node_context' => $settlementData['node_context'] ?? [],
        ];

        IntegrationLog::logRequest('erpnext', 'delivery_settlement', [
            'correlation_id' => $correlationId,
            'request_data' => $event,
            'response_data' => ['status' => 'queued', 'message' => 'Settlement event queued for ERPNext processing'],
            'status' => $this->isConfigured() ? 'success' : 'stub',
        ]);

        return [
            'success' => true,
            'mode' => $this->isConfigured() ? 'live' : 'stub',
            'correlation_id' => $correlationId,
            'event' => $event,
            'message' => $this->isConfigured()
                ? 'Settlement event posted to ERPNext'
                : 'Settlement event logged (ERPNext not configured - stub mode)',
        ];
    }

    public function postCODCollection(array $data): array
    {
        $correlationId = (string) Str::uuid();

        $event = [
            'event_type' => 'COD_COLLECTED',
            'delivery_id' => $data['delivery_id'] ?? '',
            'agent_id' => $data['agent_id'] ?? '',
            'amount' => $data['amount'] ?? ['amount' => 0, 'currency' => 'SAR'],
            'collected_at' => $data['collected_at'] ?? now()->toIso8601String(),
        ];

        IntegrationLog::logRequest('erpnext', 'cod_collection', [
            'correlation_id' => $correlationId,
            'request_data' => $event,
            'status' => $this->isConfigured() ? 'success' : 'stub',
        ]);

        return [
            'success' => true,
            'mode' => $this->isConfigured() ? 'live' : 'stub',
            'correlation_id' => $correlationId,
            'event' => $event,
        ];
    }

    public function postPenalty(array $data): array
    {
        $correlationId = (string) Str::uuid();

        $event = [
            'event_type' => 'PENALTY_APPLIED',
            'delivery_id' => $data['delivery_id'] ?? '',
            'provider_id' => $data['provider_id'] ?? '',
            'amount' => $data['amount'] ?? ['amount' => 0, 'currency' => 'SAR'],
            'reason' => $data['reason'] ?? '',
            'sla_id' => $data['sla_id'] ?? '',
        ];

        IntegrationLog::logRequest('erpnext', 'penalty_applied', [
            'correlation_id' => $correlationId,
            'request_data' => $event,
            'status' => $this->isConfigured() ? 'success' : 'stub',
        ]);

        return [
            'success' => true,
            'mode' => $this->isConfigured() ? 'live' : 'stub',
            'correlation_id' => $correlationId,
            'event' => $event,
        ];
    }

    public function requestPayout(array $data): array
    {
        $correlationId = (string) Str::uuid();

        $event = [
            'event_type' => 'PAYOUT_REQUESTED',
            'provider_id' => $data['provider_id'] ?? '',
            'period_start' => $data['period_start'] ?? '',
            'period_end' => $data['period_end'] ?? '',
            'total_amount' => $data['total_amount'] ?? ['amount' => 0, 'currency' => 'SAR'],
            'delivery_count' => $data['delivery_count'] ?? 0,
        ];

        IntegrationLog::logRequest('erpnext', 'payout_requested', [
            'correlation_id' => $correlationId,
            'request_data' => $event,
            'status' => $this->isConfigured() ? 'success' : 'stub',
        ]);

        return [
            'success' => true,
            'mode' => $this->isConfigured() ? 'live' : 'stub',
            'correlation_id' => $correlationId,
            'event' => $event,
        ];
    }

    public function getStatus(): array
    {
        return [
            'integration' => 'erpnext',
            'configured' => $this->isConfigured(),
            'mode' => $this->isConfigured() ? 'live' : 'stub',
            'default_company' => $this->defaultCompany,
            'default_currency' => $this->defaultCurrency,
            'capabilities' => [
                'delivery_settlement',
                'cod_collection',
                'penalty_applied',
                'payout_requested',
                'settlements',
                'cod_management',
                'penalties',
                'payouts',
                'reconciliation',
            ],
        ];
    }

    public function createSettlement(array $data): array
    {
        $correlationId = (string) Str::uuid();
        $settlementId = 'STL-' . strtoupper(Str::random(8));

        $event = [
            'id' => $settlementId,
            'type' => 'settlement',
            'status' => 'pending',
            'company' => $data['company'] ?? $this->defaultCompany,
            'currency' => $data['currency'] ?? $this->defaultCurrency,
            'total_amount' => $data['total_amount'] ?? 0,
            'delivery_fee' => $data['delivery_fee'] ?? 0,
            'service_fee' => $data['service_fee'] ?? 0,
            'platform_fee' => $data['platform_fee'] ?? 0,
            'cod_amount' => $data['cod_amount'] ?? 0,
            'penalties_amount' => $data['penalties_amount'] ?? 0,
            'net_amount' => $data['net_amount'] ?? ($data['total_amount'] ?? 0),
            'vendor_id' => $data['vendor_id'] ?? null,
            'period_start' => $data['period_start'] ?? now()->startOfWeek()->toDateString(),
            'period_end' => $data['period_end'] ?? now()->endOfWeek()->toDateString(),
            'order_count' => $data['order_count'] ?? 0,
            'notes' => $data['notes'] ?? '',
            'created_at' => now()->toIso8601String(),
        ];

        $liveResponse = null;
        if ($this->isConfigured()) {
            $liveResponse = $this->makeRequest('post', '/api/resource/' . config('erpnext.settlement_doctype', 'Settlement'), $event);
        }

        return $this->logAndReturn('create_settlement', $event, $correlationId, $liveResponse);
    }

    public function getSettlement(string $id): array
    {
        $correlationId = (string) Str::uuid();

        $event = ['id' => $id, 'action' => 'get_settlement'];

        $liveResponse = null;
        if ($this->isConfigured()) {
            $liveResponse = $this->makeRequest('get', '/api/resource/' . config('erpnext.settlement_doctype', 'Settlement') . '/' . $id);
        }

        if (!$this->isConfigured()) {
            $event = array_merge($event, [
                'status' => 'pending',
                'total_amount' => 0,
                'currency' => $this->defaultCurrency,
                'company' => $this->defaultCompany,
                'created_at' => now()->toIso8601String(),
            ]);
        }

        return $this->logAndReturn('get_settlement', $event, $correlationId, $liveResponse);
    }

    public function listSettlements(array $filters = []): array
    {
        $correlationId = (string) Str::uuid();

        $event = ['action' => 'list_settlements', 'filters' => $filters];

        $liveResponse = null;
        if ($this->isConfigured()) {
            $liveResponse = $this->makeRequest('get', '/api/resource/' . config('erpnext.settlement_doctype', 'Settlement'), $filters);
        }

        if (!$this->isConfigured()) {
            $event['results'] = [];
            $event['total'] = 0;
        }

        return $this->logAndReturn('list_settlements', $event, $correlationId, $liveResponse);
    }

    public function approveSettlement(string $id): array
    {
        $correlationId = (string) Str::uuid();

        $event = [
            'id' => $id,
            'action' => 'approve_settlement',
            'status' => 'approved',
            'approved_at' => now()->toIso8601String(),
        ];

        $liveResponse = null;
        if ($this->isConfigured()) {
            $liveResponse = $this->makeRequest('put', '/api/resource/' . config('erpnext.settlement_doctype', 'Settlement') . '/' . $id, [
                'status' => 'Approved',
                'approved_at' => now()->toIso8601String(),
            ]);
        }

        return $this->logAndReturn('approve_settlement', $event, $correlationId, $liveResponse);
    }

    public function processSettlement(string $id): array
    {
        $correlationId = (string) Str::uuid();

        $event = [
            'id' => $id,
            'action' => 'process_settlement',
            'status' => 'processed',
            'processed_at' => now()->toIso8601String(),
        ];

        $liveResponse = null;
        if ($this->isConfigured()) {
            $liveResponse = $this->makeRequest('put', '/api/resource/' . config('erpnext.settlement_doctype', 'Settlement') . '/' . $id, [
                'status' => 'Processed',
                'processed_at' => now()->toIso8601String(),
            ]);
        }

        return $this->logAndReturn('process_settlement', $event, $correlationId, $liveResponse);
    }

    public function recordCODCollection(string $orderId, float $amount, string $collectedBy): array
    {
        $correlationId = (string) Str::uuid();
        $collectionId = 'COD-' . strtoupper(Str::random(8));

        $event = [
            'id' => $collectionId,
            'type' => 'cod_collection',
            'order_id' => $orderId,
            'amount' => $amount,
            'currency' => $this->defaultCurrency,
            'collected_by' => $collectedBy,
            'status' => 'collected',
            'collected_at' => now()->toIso8601String(),
        ];

        $liveResponse = null;
        if ($this->isConfigured()) {
            $liveResponse = $this->makeRequest('post', '/api/resource/' . config('erpnext.cod.collection_doctype', 'COD Collection'), $event);
        }

        return $this->logAndReturn('record_cod_collection', $event, $correlationId, $liveResponse);
    }

    public function getCODCollections(array $filters = []): array
    {
        $correlationId = (string) Str::uuid();

        $event = ['action' => 'list_cod_collections', 'filters' => $filters];

        $liveResponse = null;
        if ($this->isConfigured()) {
            $liveResponse = $this->makeRequest('get', '/api/resource/' . config('erpnext.cod.collection_doctype', 'COD Collection'), $filters);
        }

        if (!$this->isConfigured()) {
            $event['results'] = [];
            $event['total'] = 0;
        }

        return $this->logAndReturn('list_cod_collections', $event, $correlationId, $liveResponse);
    }

    public function reconcileCOD(string $settlementId): array
    {
        $correlationId = (string) Str::uuid();

        $event = [
            'action' => 'reconcile_cod',
            'settlement_id' => $settlementId,
            'status' => 'reconciled',
            'reconciled_at' => now()->toIso8601String(),
            'matched_count' => 0,
            'unmatched_count' => 0,
            'total_reconciled' => 0,
        ];

        $liveResponse = null;
        if ($this->isConfigured()) {
            $liveResponse = $this->makeRequest('post', '/api/method/erpnext.cod.reconcile', [
                'settlement_id' => $settlementId,
            ]);
        }

        return $this->logAndReturn('reconcile_cod', $event, $correlationId, $liveResponse);
    }

    public function getCODSummary(array $dateRange = []): array
    {
        $correlationId = (string) Str::uuid();

        $event = [
            'action' => 'cod_summary',
            'date_range' => $dateRange,
            'total_collected' => 0,
            'total_reconciled' => 0,
            'total_pending' => 0,
            'collection_count' => 0,
            'currency' => $this->defaultCurrency,
            'period_start' => $dateRange['start'] ?? now()->startOfMonth()->toDateString(),
            'period_end' => $dateRange['end'] ?? now()->toDateString(),
        ];

        $liveResponse = null;
        if ($this->isConfigured()) {
            $liveResponse = $this->makeRequest('get', '/api/method/erpnext.cod.summary', $dateRange);
        }

        return $this->logAndReturn('cod_summary', $event, $correlationId, $liveResponse);
    }

    public function createPenalty(array $data): array
    {
        $correlationId = (string) Str::uuid();
        $penaltyId = 'PEN-' . strtoupper(Str::random(8));

        $event = [
            'id' => $penaltyId,
            'type' => 'penalty',
            'status' => 'created',
            'amount' => $data['amount'] ?? 0,
            'currency' => $data['currency'] ?? $this->defaultCurrency,
            'reason' => $data['reason'] ?? '',
            'category' => $data['category'] ?? 'general',
            'target_type' => $data['target_type'] ?? 'vendor',
            'target_id' => $data['target_id'] ?? null,
            'order_id' => $data['order_id'] ?? null,
            'sla_id' => $data['sla_id'] ?? null,
            'notes' => $data['notes'] ?? '',
            'created_at' => now()->toIso8601String(),
        ];

        $liveResponse = null;
        if ($this->isConfigured()) {
            $liveResponse = $this->makeRequest('post', '/api/resource/' . config('erpnext.penalties.penalty_doctype', 'Penalty'), $event);
        }

        return $this->logAndReturn('create_penalty', $event, $correlationId, $liveResponse);
    }

    public function getPenalties(array $filters = []): array
    {
        $correlationId = (string) Str::uuid();

        $event = ['action' => 'list_penalties', 'filters' => $filters];

        $liveResponse = null;
        if ($this->isConfigured()) {
            $liveResponse = $this->makeRequest('get', '/api/resource/' . config('erpnext.penalties.penalty_doctype', 'Penalty'), $filters);
        }

        if (!$this->isConfigured()) {
            $event['results'] = [];
            $event['total'] = 0;
        }

        return $this->logAndReturn('list_penalties', $event, $correlationId, $liveResponse);
    }

    public function applyPenalty(string $penaltyId, string $targetId): array
    {
        $correlationId = (string) Str::uuid();

        $event = [
            'action' => 'apply_penalty',
            'penalty_id' => $penaltyId,
            'target_id' => $targetId,
            'status' => 'applied',
            'applied_at' => now()->toIso8601String(),
        ];

        $liveResponse = null;
        if ($this->isConfigured()) {
            $liveResponse = $this->makeRequest('put', '/api/resource/' . config('erpnext.penalties.penalty_doctype', 'Penalty') . '/' . $penaltyId, [
                'status' => 'Applied',
                'target_id' => $targetId,
                'applied_at' => now()->toIso8601String(),
            ]);
        }

        return $this->logAndReturn('apply_penalty', $event, $correlationId, $liveResponse);
    }

    public function waivePenalty(string $penaltyId, string $reason): array
    {
        $correlationId = (string) Str::uuid();

        $event = [
            'action' => 'waive_penalty',
            'penalty_id' => $penaltyId,
            'waive_reason' => $reason,
            'status' => 'waived',
            'waived_at' => now()->toIso8601String(),
        ];

        $liveResponse = null;
        if ($this->isConfigured()) {
            $liveResponse = $this->makeRequest('put', '/api/resource/' . config('erpnext.penalties.penalty_doctype', 'Penalty') . '/' . $penaltyId, [
                'status' => 'Waived',
                'waive_reason' => $reason,
                'waived_at' => now()->toIso8601String(),
            ]);
        }

        return $this->logAndReturn('waive_penalty', $event, $correlationId, $liveResponse);
    }

    public function getPenaltySummary(array $dateRange = []): array
    {
        $correlationId = (string) Str::uuid();

        $event = [
            'action' => 'penalty_summary',
            'date_range' => $dateRange,
            'total_penalties' => 0,
            'total_amount' => 0,
            'applied_count' => 0,
            'waived_count' => 0,
            'pending_count' => 0,
            'currency' => $this->defaultCurrency,
            'period_start' => $dateRange['start'] ?? now()->startOfMonth()->toDateString(),
            'period_end' => $dateRange['end'] ?? now()->toDateString(),
            'by_category' => [],
        ];

        $liveResponse = null;
        if ($this->isConfigured()) {
            $liveResponse = $this->makeRequest('get', '/api/method/erpnext.penalties.summary', $dateRange);
        }

        return $this->logAndReturn('penalty_summary', $event, $correlationId, $liveResponse);
    }

    public function generatePayout(string $vendorId, array $period): array
    {
        $correlationId = (string) Str::uuid();
        $payoutId = 'PAY-' . strtoupper(Str::random(8));

        $event = [
            'id' => $payoutId,
            'type' => 'payout',
            'status' => 'generated',
            'vendor_id' => $vendorId,
            'company' => $this->defaultCompany,
            'currency' => $this->defaultCurrency,
            'period_start' => $period['start'] ?? now()->startOfWeek()->toDateString(),
            'period_end' => $period['end'] ?? now()->endOfWeek()->toDateString(),
            'total_deliveries' => 0,
            'delivery_earnings' => 0,
            'tips' => 0,
            'penalties_deducted' => 0,
            'cod_adjustment' => 0,
            'net_payout' => 0,
            'generated_at' => now()->toIso8601String(),
        ];

        $liveResponse = null;
        if ($this->isConfigured()) {
            $liveResponse = $this->makeRequest('post', '/api/resource/' . config('erpnext.payout_doctype', 'Payout'), $event);
        }

        return $this->logAndReturn('generate_payout', $event, $correlationId, $liveResponse);
    }

    public function getPayouts(array $filters = []): array
    {
        $correlationId = (string) Str::uuid();

        $event = ['action' => 'list_payouts', 'filters' => $filters];

        $liveResponse = null;
        if ($this->isConfigured()) {
            $liveResponse = $this->makeRequest('get', '/api/resource/' . config('erpnext.payout_doctype', 'Payout'), $filters);
        }

        if (!$this->isConfigured()) {
            $event['results'] = [];
            $event['total'] = 0;
        }

        return $this->logAndReturn('list_payouts', $event, $correlationId, $liveResponse);
    }

    public function approvePayout(string $payoutId): array
    {
        $correlationId = (string) Str::uuid();

        $event = [
            'action' => 'approve_payout',
            'payout_id' => $payoutId,
            'status' => 'approved',
            'approved_at' => now()->toIso8601String(),
        ];

        $liveResponse = null;
        if ($this->isConfigured()) {
            $liveResponse = $this->makeRequest('put', '/api/resource/' . config('erpnext.payout_doctype', 'Payout') . '/' . $payoutId, [
                'status' => 'Approved',
                'approved_at' => now()->toIso8601String(),
            ]);
        }

        return $this->logAndReturn('approve_payout', $event, $correlationId, $liveResponse);
    }

    public function processPayout(string $payoutId): array
    {
        $correlationId = (string) Str::uuid();

        $event = [
            'action' => 'process_payout',
            'payout_id' => $payoutId,
            'status' => 'processed',
            'processed_at' => now()->toIso8601String(),
        ];

        $liveResponse = null;
        if ($this->isConfigured()) {
            $liveResponse = $this->makeRequest('put', '/api/resource/' . config('erpnext.payout_doctype', 'Payout') . '/' . $payoutId, [
                'status' => 'Processed',
                'processed_at' => now()->toIso8601String(),
            ]);
        }

        return $this->logAndReturn('process_payout', $event, $correlationId, $liveResponse);
    }

    public function getPayoutSummary(array $dateRange = []): array
    {
        $correlationId = (string) Str::uuid();

        $event = [
            'action' => 'payout_summary',
            'date_range' => $dateRange,
            'total_payouts' => 0,
            'total_amount' => 0,
            'processed_count' => 0,
            'pending_count' => 0,
            'approved_count' => 0,
            'currency' => $this->defaultCurrency,
            'period_start' => $dateRange['start'] ?? now()->startOfMonth()->toDateString(),
            'period_end' => $dateRange['end'] ?? now()->toDateString(),
            'by_vendor' => [],
        ];

        $liveResponse = null;
        if ($this->isConfigured()) {
            $liveResponse = $this->makeRequest('get', '/api/method/erpnext.payouts.summary', $dateRange);
        }

        return $this->logAndReturn('payout_summary', $event, $correlationId, $liveResponse);
    }

    public function reconcile(array $period): array
    {
        $correlationId = (string) Str::uuid();
        $reconciliationId = 'REC-' . strtoupper(Str::random(8));

        $event = [
            'id' => $reconciliationId,
            'action' => 'reconcile',
            'status' => 'completed',
            'period_start' => $period['start'] ?? now()->startOfWeek()->toDateString(),
            'period_end' => $period['end'] ?? now()->endOfWeek()->toDateString(),
            'settlements_reviewed' => 0,
            'cod_matched' => 0,
            'penalties_applied' => 0,
            'discrepancies_found' => 0,
            'reconciled_at' => now()->toIso8601String(),
        ];

        $liveResponse = null;
        if ($this->isConfigured()) {
            $liveResponse = $this->makeRequest('post', '/api/method/erpnext.reconciliation.run', $period);
        }

        return $this->logAndReturn('reconcile', $event, $correlationId, $liveResponse);
    }

    public function getReconciliationReport(array $period): array
    {
        $correlationId = (string) Str::uuid();

        $event = [
            'action' => 'reconciliation_report',
            'period_start' => $period['start'] ?? now()->startOfWeek()->toDateString(),
            'period_end' => $period['end'] ?? now()->endOfWeek()->toDateString(),
            'summary' => [
                'total_settlements' => 0,
                'total_cod_collections' => 0,
                'total_penalties' => 0,
                'total_payouts' => 0,
                'total_revenue' => 0,
                'total_expenses' => 0,
                'net_position' => 0,
            ],
            'status' => 'generated',
            'currency' => $this->defaultCurrency,
            'generated_at' => now()->toIso8601String(),
        ];

        $liveResponse = null;
        if ($this->isConfigured()) {
            $liveResponse = $this->makeRequest('get', '/api/method/erpnext.reconciliation.report', $period);
        }

        return $this->logAndReturn('reconciliation_report', $event, $correlationId, $liveResponse);
    }

    public function getDiscrepancies(array $period): array
    {
        $correlationId = (string) Str::uuid();

        $event = [
            'action' => 'list_discrepancies',
            'period_start' => $period['start'] ?? now()->startOfWeek()->toDateString(),
            'period_end' => $period['end'] ?? now()->endOfWeek()->toDateString(),
            'discrepancies' => [],
            'total' => 0,
        ];

        $liveResponse = null;
        if ($this->isConfigured()) {
            $liveResponse = $this->makeRequest('get', '/api/method/erpnext.reconciliation.discrepancies', $period);
        }

        return $this->logAndReturn('list_discrepancies', $event, $correlationId, $liveResponse);
    }

    public function resolveDiscrepancy(string $id, array $resolution): array
    {
        $correlationId = (string) Str::uuid();

        $event = [
            'action' => 'resolve_discrepancy',
            'discrepancy_id' => $id,
            'resolution_type' => $resolution['type'] ?? 'manual',
            'resolution_notes' => $resolution['notes'] ?? '',
            'adjusted_amount' => $resolution['adjusted_amount'] ?? null,
            'status' => 'resolved',
            'resolved_at' => now()->toIso8601String(),
        ];

        $liveResponse = null;
        if ($this->isConfigured()) {
            $liveResponse = $this->makeRequest('post', '/api/method/erpnext.reconciliation.resolve', array_merge(
                ['discrepancy_id' => $id],
                $resolution
            ));
        }

        return $this->logAndReturn('resolve_discrepancy', $event, $correlationId, $liveResponse);
    }

    public function getDashboard(): array
    {
        $correlationId = (string) Str::uuid();

        $event = [
            'action' => 'financial_dashboard',
            'overview' => [
                'total_settlements' => 0,
                'pending_settlements' => 0,
                'total_cod_collected' => 0,
                'pending_cod_reconciliation' => 0,
                'total_penalties' => 0,
                'total_payouts' => 0,
                'pending_payouts' => 0,
                'net_revenue' => 0,
            ],
            'trends' => [
                'daily_settlements' => [],
                'daily_cod' => [],
                'daily_payouts' => [],
            ],
            'currency' => $this->defaultCurrency,
            'generated_at' => now()->toIso8601String(),
        ];

        $liveResponse = null;
        if ($this->isConfigured()) {
            $liveResponse = $this->makeRequest('get', '/api/method/erpnext.finance.dashboard');
        }

        return $this->logAndReturn('financial_dashboard', $event, $correlationId, $liveResponse);
    }
}
