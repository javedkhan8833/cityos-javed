<?php

namespace Fleetbase\CityOS\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Fleetbase\CityOS\Support\NodeContext;
use Fleetbase\CityOS\Services\FeatureGateService;

class EnforceFeatureGate
{
    public function handle(Request $request, Closure $next)
    {
        if (!config('cityos.feature_gates.enabled', false)) {
            return $next($request);
        }

        $nodeContext = $request->attributes->get('node_context');
        if (!$nodeContext || !$nodeContext instanceof NodeContext) {
            return $next($request);
        }

        $tenant = $nodeContext->resolveTenant();
        if (!$tenant) {
            return $next($request);
        }

        $featureKey = $this->resolveFeatureKey($request);
        if (!$featureKey) {
            return $next($request);
        }

        $gate = app(FeatureGateService::class);
        $allowed = $gate->isEnabled(
            $featureKey,
            $tenant->tenant_tier,
            null,
            []
        );

        if (!$allowed) {
            return response()->json([
                'success' => false,
                'error' => 'Feature not available',
                'message' => "Feature '{$featureKey}' is not enabled for tenant tier '{$tenant->tenant_tier}'",
                'feature' => $featureKey,
                'tenant_tier' => $tenant->tenant_tier,
            ], 403);
        }

        return $next($request);
    }

    protected function resolveFeatureKey(Request $request): ?string
    {
        $path = $request->path();

        $moduleMap = [
            'fleet-ops' => 'fleetops',
            'pallet' => 'pallet',
            'storefront' => 'storefront',
        ];

        foreach ($moduleMap as $prefix => $module) {
            if (str_contains($path, $prefix)) {
                $operation = $this->resolveOperation($request);
                return "{$module}.{$operation}";
            }
        }

        return null;
    }

    protected function resolveOperation(Request $request): string
    {
        return match ($request->method()) {
            'POST' => 'create',
            'PUT', 'PATCH' => 'update',
            'DELETE' => 'delete',
            default => 'read',
        };
    }
}
