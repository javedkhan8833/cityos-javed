<?php

namespace Fleetbase\CityOS\Http\Controllers;

use Fleetbase\CityOS\Models\Country;
use Fleetbase\CityOS\Models\FeatureFlag;
use Fleetbase\CityOS\Models\GovernanceAuthority;
use Fleetbase\CityOS\Models\Node;
use Fleetbase\CityOS\Models\Policy;
use Fleetbase\CityOS\Models\Region;
use Fleetbase\CityOS\Models\Tenant;
use Fleetbase\CityOS\Services\ComplianceCheckService;
use Fleetbase\CityOS\Services\FeatureGateService;
use Fleetbase\CityOS\Support\GovernanceChainBuilder;
use Fleetbase\Http\Controllers\Controller;
use Illuminate\Http\Request;

class GovernanceController extends Controller
{
    public function resolve(Request $request)
    {
        $countryCode = $request->input('country');
        $tenantSlug = $request->input('tenant');

        $country = $countryCode ? Country::where('code', $countryCode)->first() : null;
        $tenant = $tenantSlug ? Tenant::where('handle', $tenantSlug)->orWhere('uuid', $tenantSlug)->first() : null;

        if (!$country && $tenant) {
            $country = $tenant->country;
        }

        $chain = GovernanceChainBuilder::build($tenant, $country);

        return response()->json([
            'success' => true,
            'data' => $chain,
        ]);
    }

    public function tenantHierarchy(Request $request)
    {
        $tenantSlug = $request->input('tenant');
        $mode = $request->input('mode', 'tree');

        if ($mode === 'ancestry' && $tenantSlug) {
            $tenant = Tenant::where('handle', $tenantSlug)->orWhere('uuid', $tenantSlug)->first();
            if (!$tenant) {
                return response()->json(['success' => false, 'error' => "Tenant '{$tenantSlug}' not found"], 404);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'tenant' => $tenantSlug,
                    'mode' => 'ancestry',
                    'ancestry' => $tenant->getAncestryChain(),
                    'tiers' => array_map(fn($t) => $t->tenant_tier, $tenant->getAncestryTenants()),
                    'depth' => count($tenant->getAncestryChain()),
                ],
            ]);
        }

        $query = Tenant::whereNull('parent_tenant_uuid');
        if ($tenantSlug) {
            $root = Tenant::where('handle', $tenantSlug)->orWhere('uuid', $tenantSlug)->first();
            if ($root) {
                $query = Tenant::where('parent_tenant_uuid', $root->uuid);
                $tree = [$this->buildTenantTree($root)];
            } else {
                return response()->json(['success' => false, 'error' => "Tenant '{$tenantSlug}' not found"], 404);
            }
        } else {
            $roots = $query->get();
            $tree = $roots->map(fn($t) => $this->buildTenantTree($t))->toArray();
        }

        return response()->json([
            'success' => true,
            'data' => [
                'mode' => 'tree',
                'tiers' => Tenant::VALID_TIERS,
                'tree' => $tree,
            ],
        ]);
    }

    public function compliance(Request $request)
    {
        $tenantSlug = $request->input('tenant');
        $tenant = $tenantSlug ? Tenant::where('handle', $tenantSlug)->orWhere('uuid', $tenantSlug)->first() : null;

        if (!$tenant) {
            return response()->json(['success' => false, 'error' => 'Tenant required'], 400);
        }

        $service = new ComplianceCheckService();
        $violations = $service->checkTenantCompliance($tenant, $request->input('operation', 'read'));

        return response()->json([
            'success' => true,
            'data' => $service->getViolationSummary($violations),
        ]);
    }

    public function featureFlags(Request $request)
    {
        $tenantTier = $request->input('tenant_tier');
        $nodeType = $request->input('node_type');

        $service = new FeatureGateService();

        if ($tenantTier) {
            $flags = $service->evaluateForContext($tenantTier, $nodeType);
        } else {
            $flags = $service->getAllFlags();
        }

        return response()->json([
            'success' => true,
            'data' => [
                'flags' => $flags,
                'context' => [
                    'tenantTier' => $tenantTier,
                    'nodeType' => $nodeType,
                ],
            ],
        ]);
    }

    public function nodeTree(Request $request)
    {
        $type = $request->input('type');
        $parentUuid = $request->input('parent');

        $query = Node::query();
        if ($type) {
            $query->where('type', $type);
        }
        if ($parentUuid) {
            $query->where('parent_uuid', $parentUuid);
        } else {
            $query->whereNull('parent_uuid');
        }

        $nodes = $query->orderBy('depth')->orderBy('name')->get();

        $tree = $nodes->map(fn($n) => $this->buildNodeTree($n))->toArray();

        return response()->json([
            'success' => true,
            'data' => [
                'levels' => Node::VALID_TYPES,
                'tree' => $tree,
                'total' => Node::count(),
            ],
        ]);
    }

    private function buildTenantTree(Tenant $tenant): array
    {
        $children = Tenant::where('parent_tenant_uuid', $tenant->uuid)->get();

        return [
            'id' => $tenant->uuid,
            'name' => $tenant->name,
            'slug' => $tenant->handle,
            'tier' => $tenant->tenant_tier,
            'status' => $tenant->status,
            'residencyZone' => $tenant->residency_zone,
            'children' => $children->map(fn($c) => $this->buildTenantTree($c))->toArray(),
        ];
    }

    private function buildNodeTree(Node $node): array
    {
        $children = Node::where('parent_uuid', $node->uuid)->orderBy('name')->get();

        return [
            'id' => $node->uuid,
            'name' => $node->name,
            'slug' => $node->slug,
            'type' => $node->type,
            'code' => $node->code,
            'depth' => $node->depth,
            'status' => $node->status,
            'coordinates' => $node->coordinates_lat ? [
                'lat' => $node->coordinates_lat,
                'lng' => $node->coordinates_lng,
            ] : null,
            'children' => $children->map(fn($c) => $this->buildNodeTree($c))->toArray(),
        ];
    }
}
