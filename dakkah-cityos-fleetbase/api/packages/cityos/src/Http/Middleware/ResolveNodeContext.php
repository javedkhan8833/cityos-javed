<?php

namespace Fleetbase\CityOS\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Fleetbase\CityOS\Support\NodeContext;
use Fleetbase\CityOS\Models\Tenant;

class ResolveNodeContext
{
    protected static array $tenantCache = [];

    public function handle(Request $request, Closure $next)
    {
        $nodeContext = NodeContext::fromRequest($request);

        $explicitTenantHeader = $request->header(
            config('cityos.node_context.header_prefix', 'X-CityOS-') . 'Tenant'
        );
        $hasExplicitTenant = !empty($explicitTenantHeader);

        $resolvedTenant = null;

        if (!empty($nodeContext->tenant)) {
            $resolvedTenant = $nodeContext->resolveTenant();
        }

        if (!$resolvedTenant && $hasExplicitTenant) {
            $nodeContext->markExplicitTenantInvalid();
        } elseif (!$resolvedTenant) {
            $resolvedTenant = $this->resolveDefaultTenant($request);
        }

        if ($resolvedTenant) {
            $nodeContext->tenant = $resolvedTenant->handle ?? $resolvedTenant->uuid;
            $nodeContext->setResolvedTenant($resolvedTenant);
        }

        $request->attributes->set('node_context', $nodeContext);

        $response = $next($request);

        $resolved = $nodeContext->resolveTenant();
        if (method_exists($response, 'header') && $resolved) {
            $response->header('X-CityOS-Tenant', $nodeContext->tenant);
            $response->header('X-CityOS-Country', $nodeContext->country);
            $response->header('X-CityOS-City', $nodeContext->cityOrTheme);
            $response->header('X-CityOS-Sector', $nodeContext->sector);
            $response->header('X-CityOS-Locale', $nodeContext->locale);
        }

        return $response;
    }

    protected function resolveDefaultTenant(Request $request): ?Tenant
    {
        $companyUuid = null;

        $user = $request->user();
        if ($user && !empty($user->company_uuid)) {
            $companyUuid = $user->company_uuid;
        }

        if (empty($companyUuid)) {
            $companyUuid = session('company');
        }

        if (empty($companyUuid)) {
            return null;
        }

        if (isset(static::$tenantCache[$companyUuid])) {
            return static::$tenantCache[$companyUuid];
        }

        $tenants = Tenant::where('company_uuid', $companyUuid)->get();

        $result = null;

        if ($tenants->count() === 1) {
            $result = $tenants->first();
        } elseif ($tenants->count() > 1) {
            $result = $tenants->firstWhere('tenant_tier', Tenant::TIER_MASTER)
                ?? $tenants->firstWhere('tenant_tier', Tenant::TIER_GLOBAL)
                ?? $tenants->firstWhere('tenant_tier', Tenant::TIER_COUNTRY);
        }

        static::$tenantCache[$companyUuid] = $result;

        return $result;
    }
}
