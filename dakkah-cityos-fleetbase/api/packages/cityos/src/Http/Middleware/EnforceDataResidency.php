<?php

namespace Fleetbase\CityOS\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Fleetbase\CityOS\Models\Tenant;
use Fleetbase\CityOS\Support\GovernanceChainBuilder;

class EnforceDataResidency
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

        $chain = GovernanceChainBuilder::build($tenant, $tenant->country);
        $residency = $chain['effectivePolicies']['dataResidency'] ?? [];

        $requestRegion = $request->header('X-CityOS-Processing-Region');
        if ($requestRegion && !empty($residency['allowedRegions'])) {
            $allowed = $residency['allowedRegions'];
            if ($allowed !== ['*'] && !in_array($requestRegion, $allowed)) {
                return response()->json([
                    'success' => false,
                    'error' => 'Data residency violation',
                    'message' => "Processing region {$requestRegion} is not allowed. Allowed: " . implode(', ', $allowed),
                    'residencyZone' => $residency['zone'] ?? 'unknown',
                ], 403);
            }
        }

        $response = $next($request);

        if (method_exists($response, 'header')) {
            $response->header('X-Data-Residency-Zone', $residency['zone'] ?? 'GLOBAL');
            if (!empty($residency['encryptionRequired'])) {
                $response->header('X-Data-Encryption-Required', 'true');
            }
        }

        return $response;
    }
}
