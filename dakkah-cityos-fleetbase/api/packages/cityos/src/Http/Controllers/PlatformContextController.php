<?php

namespace Fleetbase\CityOS\Http\Controllers;

use Fleetbase\CityOS\Models\Country;
use Fleetbase\CityOS\Models\City;
use Fleetbase\CityOS\Models\Tenant;
use Fleetbase\CityOS\Services\SystemsRegistryService;
use Fleetbase\CityOS\Services\CapabilitiesService;
use Fleetbase\CityOS\Support\GovernanceChainBuilder;
use Fleetbase\Http\Controllers\Controller;
use Illuminate\Http\Request;

class PlatformContextController extends Controller
{
    protected SystemsRegistryService $systemsRegistry;
    protected CapabilitiesService $capabilities;

    public function __construct()
    {
        $this->systemsRegistry = new SystemsRegistryService();
        $this->capabilities = new CapabilitiesService();
    }

    public function context(Request $request)
    {
        $tenantSlug = $request->input('tenant', $request->input('tenantId', $request->header('X-CityOS-Tenant-Id')));
        $nodeId = $request->input('node', $request->input('nodeId', $request->header('X-CityOS-Node-Id')));

        $tenant = null;
        $isDefaultTenant = false;

        if ($tenantSlug) {
            $tenant = Tenant::where('handle', $tenantSlug)
                ->orWhere('uuid', $tenantSlug)
                ->first();
        }

        if (!$tenant) {
            $tenant = $this->getDefaultTenant();
            $isDefaultTenant = true;
        }

        $country = $tenant?->country;
        $nodeHierarchy = $this->buildNodeHierarchy($tenant, $nodeId);
        $governanceChain = GovernanceChainBuilder::build($tenant, $country);

        $response = [
            'success' => true,
            'data' => [
                'tenant' => $this->formatTenant($tenant),
                'nodeHierarchy' => $nodeHierarchy,
                'governanceChain' => $governanceChain,
                'capabilities' => $this->capabilities->getCapabilities(),
                'systems' => $this->systemsRegistry->getSummary(),
                'contextHeaders' => [
                    'X-CityOS-Correlation-Id',
                    'X-CityOS-Tenant-Id',
                    'X-CityOS-Node-Id',
                    'X-CityOS-Node-Type',
                    'X-CityOS-Locale',
                    'X-CityOS-User-Id',
                    'X-CityOS-Channel',
                    'X-Idempotency-Key',
                ],
                'hierarchyLevels' => ['CITY', 'DISTRICT', 'ZONE', 'FACILITY', 'ASSET'],
                'resolvedAt' => now()->toIso8601String(),
                'isDefaultTenant' => $isDefaultTenant,
            ],
        ];

        return response()->json($response)
            ->header('Cache-Control', 'public, max-age=60, s-maxage=300');
    }

    public function defaultTenant(Request $request)
    {
        $tenant = $this->getDefaultTenant();
        $country = $tenant?->country;
        $nodeHierarchy = $this->buildNodeHierarchy($tenant);
        $governanceChain = GovernanceChainBuilder::build($tenant, $country);

        $response = [
            'success' => true,
            'data' => [
                'tenant' => $this->formatTenant($tenant),
                'nodeHierarchy' => $nodeHierarchy,
                'governanceChain' => $governanceChain,
                'usage' => [
                    'description' => 'Use this tenant as fallback when no tenant-specific context is available',
                    'headers' => [
                        'X-CityOS-Tenant-Id' => $tenant?->uuid ?? '',
                        'X-CityOS-Locale' => 'en',
                    ],
                    'bootstrapUrl' => '/api/platform/context?tenant=' . ($tenant?->handle ?? 'platform'),
                ],
                'resolvedAt' => now()->toIso8601String(),
                'isDefaultTenant' => true,
            ],
        ];

        return response()->json($response)
            ->header('Cache-Control', 'public, max-age=300, s-maxage=600');
    }

    public function capabilities(Request $request)
    {
        return response()->json([
            'success' => true,
            'data' => $this->capabilities->getCapabilities(),
        ]);
    }

    private function getDefaultTenant(): ?Tenant
    {
        return Tenant::where('handle', 'platform')
            ->orWhere(function ($q) {
                $q->where('status', 'active')->orderBy('created_at', 'asc');
            })
            ->first();
    }

    private function formatTenant(?Tenant $tenant): ?array
    {
        if (!$tenant) {
            return null;
        }

        $settings = $tenant->settings ?? [];
        $country = $tenant->country;

        return [
            'id' => $tenant->uuid,
            'name' => $tenant->name,
            'slug' => $tenant->handle,
            'domain' => $tenant->domain,
            'residencyZone' => $this->resolveResidencyZone($country),
            'status' => $tenant->status ?? 'active',
            'description' => $tenant->name_ar ? "{$tenant->name} ({$tenant->name_ar})" : $tenant->name,
            'settings' => [
                'defaultLocale' => $country->default_locale ?? $settings['default_locale'] ?? 'en',
                'supportedLocales' => [
                    ['locale' => 'en'],
                    ['locale' => 'ar'],
                ],
                'timezone' => $settings['timezone'] ?? ($country ? $this->resolveTimezone($country->code) : 'UTC'),
                'currency' => $settings['default_currency'] ?? $country->currency_code ?? 'USD',
            ],
        ];
    }

    private function buildNodeHierarchy(?Tenant $tenant, ?string $nodeId = null): array
    {
        if (!$tenant) {
            return [];
        }

        $city = $tenant->city;
        if (!$city) {
            $country = $tenant->country;
            if ($country) {
                $cities = $country->cities()->where('status', 'active')->get();
                return $cities->map(function ($city) {
                    return $this->formatCityNode($city);
                })->toArray();
            }
            return [];
        }

        if ($nodeId) {
            $targetCity = City::where('uuid', $nodeId)->first();
            if ($targetCity) {
                return [$this->formatCityNode($targetCity)];
            }
        }

        return [$this->formatCityNode($city)];
    }

    private function formatCityNode(City $city): array
    {
        return [
            'id' => $city->uuid,
            'name' => $city->name,
            'code' => strtoupper(substr($city->slug, 0, 3)) . '-001',
            'type' => 'CITY',
            'slug' => $city->slug,
            'status' => $city->status ?? 'active',
            'coordinates' => [
                'lat' => $city->latitude ?? 0.0,
                'lng' => $city->longitude ?? 0.0,
            ],
            'parent' => $city->country_uuid,
            'children' => [],
        ];
    }

    private function resolveResidencyZone(?Country $country): string
    {
        if (!$country) {
            return 'GLOBAL';
        }

        $gccCodes = ['SA', 'AE', 'BH', 'KW', 'OM', 'QA'];
        $euCodes = ['FR', 'ES', 'NL', 'DE', 'IT', 'BE', 'AT', 'PT', 'IE', 'FI'];
        $menaCodes = ['EG', 'JO', 'LB', 'IQ', 'MA', 'TN', 'DZ'];

        if (in_array($country->code, $gccCodes)) return 'GCC';
        if (in_array($country->code, $euCodes)) return 'EU';
        if (in_array($country->code, $menaCodes)) return 'MENA';

        return 'GLOBAL';
    }

    private function resolveTimezone(string $countryCode): string
    {
        $timezones = [
            'SA' => 'Asia/Riyadh',
            'AE' => 'Asia/Dubai',
            'BH' => 'Asia/Bahrain',
            'KW' => 'Asia/Kuwait',
            'QA' => 'Asia/Qatar',
            'OM' => 'Asia/Muscat',
            'EG' => 'Africa/Cairo',
            'JO' => 'Asia/Amman',
            'FR' => 'Europe/Paris',
            'ES' => 'Europe/Madrid',
            'NL' => 'Europe/Amsterdam',
        ];

        return $timezones[$countryCode] ?? 'UTC';
    }
}
