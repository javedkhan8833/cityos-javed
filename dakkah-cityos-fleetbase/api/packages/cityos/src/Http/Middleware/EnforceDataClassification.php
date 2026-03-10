<?php

namespace Fleetbase\CityOS\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Fleetbase\CityOS\Services\ComplianceCheckService;
use Fleetbase\CityOS\Models\Tenant;

class EnforceDataClassification
{
    public function handle(Request $request, Closure $next)
    {
        $tenantId = $request->header('X-CityOS-Tenant-Id');
        if (!$tenantId) {
            return $next($request);
        }

        $tenant = Tenant::where('uuid', $tenantId)->orWhere('handle', $tenantId)->first();
        if (!$tenant) {
            return $next($request);
        }

        $operation = $this->resolveOperation($request);
        $service = new ComplianceCheckService();
        $violations = $service->checkTenantCompliance($tenant, $operation);

        $critical = array_filter($violations, fn($v) => $v['severity'] === 'critical');
        if (!empty($critical) && in_array($operation, ['create', 'update', 'export'])) {
            return response()->json([
                'success' => false,
                'error' => 'Compliance violation',
                'violations' => array_values($critical),
            ], 403);
        }

        $response = $next($request);

        if (method_exists($response, 'header')) {
            $response->header('X-CityOS-Classification', $tenant->data_classification_default ?? 'INTERNAL');
            $response->header('X-CityOS-Residency-Zone', $tenant->residency_zone ?? 'GLOBAL');
        }

        return $response;
    }

    private function resolveOperation(Request $request): string
    {
        return match ($request->method()) {
            'POST' => 'create',
            'PUT', 'PATCH' => 'update',
            'DELETE' => 'delete',
            default => 'read',
        };
    }
}
