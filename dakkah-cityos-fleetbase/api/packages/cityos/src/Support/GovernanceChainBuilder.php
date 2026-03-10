<?php

namespace Fleetbase\CityOS\Support;

use Fleetbase\CityOS\Models\Country;
use Fleetbase\CityOS\Models\GovernanceAuthority;
use Fleetbase\CityOS\Models\Policy;
use Fleetbase\CityOS\Models\Region;
use Fleetbase\CityOS\Models\Tenant;

class GovernanceChainBuilder
{
    public static function build(?Tenant $tenant, ?Country $country = null): array
    {
        $country = $country ?? $tenant?->country;

        if (!$country) {
            return [
                'region' => null,
                'country' => null,
                'authorities' => [],
                'effectivePolicies' => self::defaultPolicies(),
                'policyStack' => [],
            ];
        }

        $region = self::resolveRegion($country);
        $authorities = self::resolveAuthorities($country);
        $policyStack = self::resolvePolicyStack($region, $country, $authorities, $tenant);
        $merged = PolicyMerger::mergeAll($policyStack);

        return [
            'region' => $region ? self::formatRegion($region) : self::fallbackRegion($country),
            'country' => self::formatCountry($country),
            'authorities' => array_map([self::class, 'formatAuthority'], $authorities),
            'effectivePolicies' => $merged['effective'],
            'policyStack' => $merged['trace'],
            'policyCount' => $merged['policyCount'],
        ];
    }

    private static function resolveRegion(Country $country): ?Region
    {
        if ($country->region_uuid) {
            return Region::where('uuid', $country->region_uuid)->first();
        }

        $regionMap = [
            'SA' => 'GCC', 'AE' => 'GCC', 'BH' => 'GCC', 'KW' => 'GCC', 'OM' => 'GCC', 'QA' => 'GCC',
            'EG' => 'MENA', 'JO' => 'MENA', 'LB' => 'MENA', 'IQ' => 'MENA', 'MA' => 'MENA',
            'FR' => 'EU', 'ES' => 'EU', 'NL' => 'EU', 'DE' => 'EU', 'IT' => 'EU',
        ];

        $regionCode = $regionMap[$country->code] ?? 'GLOBAL';
        return Region::where('code', $regionCode)->first();
    }

    private static function resolveAuthorities(Country $country): array
    {
        $dbAuthorities = GovernanceAuthority::where('country_uuid', $country->uuid)
            ->where('status', 'active')
            ->orderBy('type')
            ->get()
            ->toArray();

        if (!empty($dbAuthorities)) {
            return $dbAuthorities;
        }

        return self::fallbackAuthorities($country->code);
    }

    private static function resolvePolicyStack(?Region $region, Country $country, array $authorities, ?Tenant $tenant): array
    {
        $stack = [];

        if ($region) {
            $regionPolicies = Policy::where('region_uuid', $region->uuid)
                ->where('status', 'active')
                ->orderBy('priority')
                ->get();

            foreach ($regionPolicies as $p) {
                $stack[] = $p->toArray();
            }

            if (empty($regionPolicies->count())) {
                $stack[] = self::buildRegionFallbackPolicy($region);
            }
        }

        $countryPolicies = Policy::where('country_uuid', $country->uuid)
            ->where('status', 'active')
            ->orderBy('priority')
            ->get();

        foreach ($countryPolicies as $p) {
            $stack[] = $p->toArray();
        }

        if (empty($countryPolicies->count())) {
            $countryOverrides = $country->policies ?? [];
            if (!empty($countryOverrides)) {
                $stack[] = [
                    'name' => "Country: {$country->name}",
                    'slug' => 'country-' . strtolower($country->code),
                    'scope' => 'national',
                    'policy_data' => $countryOverrides,
                ];
            }
        }

        foreach ($authorities as $auth) {
            $authUuid = $auth['uuid'] ?? null;
            if (!$authUuid) continue;

            $authPolicies = Policy::where('authority_uuid', $authUuid)
                ->where('status', 'active')
                ->orderBy('priority')
                ->get();

            foreach ($authPolicies as $p) {
                $stack[] = $p->toArray();
            }

            if (!empty($auth['mandates']) || !empty($auth['compliance_requirements']) || !empty($auth['data_handling_rules'])) {
                $stack[] = [
                    'name' => "Authority: " . ($auth['name'] ?? $auth['code'] ?? 'unknown'),
                    'slug' => 'authority-' . strtolower($auth['code'] ?? 'unknown'),
                    'scope' => $auth['type'] ?? 'regulatory',
                    'policy_data' => [
                        'compliance' => [
                            'frameworks' => $auth['mandates'] ?? [],
                            'requirements' => $auth['compliance_requirements'] ?? [],
                        ],
                        'dataResidency' => $auth['data_handling_rules'] ?? [],
                    ],
                ];
            }
        }

        if ($tenant) {
            $tenantPolicies = Policy::where('tenant_uuid', $tenant->uuid)
                ->where('status', 'active')
                ->orderBy('priority')
                ->get();

            foreach ($tenantPolicies as $p) {
                $stack[] = $p->toArray();
            }
        }

        return $stack;
    }

    private static function buildRegionFallbackPolicy(Region $region): array
    {
        return [
            'name' => "Region: {$region->name}",
            'slug' => 'region-' . strtolower($region->code),
            'scope' => 'regional',
            'policy_data' => [
                'dataResidency' => $region->data_residency_policy ?? self::defaultResidencyForZone($region->residency_zone),
                'compliance' => $region->compliance_policy ?? [],
                'classification' => $region->classification_policy ?? ['levels' => ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'], 'defaultLevel' => 'INTERNAL'],
            ],
        ];
    }

    private static function defaultResidencyForZone(string $zone): array
    {
        $zones = [
            'GCC' => ['zone' => 'GCC', 'allowedRegions' => ['me-central-1', 'me-south-1'], 'classification' => 'sovereign', 'crossBorderTransfer' => false, 'encryptionRequired' => true],
            'EU' => ['zone' => 'EU', 'allowedRegions' => ['eu-west-1', 'eu-central-1'], 'classification' => 'regional', 'crossBorderTransfer' => true, 'gdprCompliant' => true, 'encryptionRequired' => true],
            'MENA' => ['zone' => 'MENA', 'allowedRegions' => ['me-central-1', 'eu-south-1'], 'classification' => 'regional', 'crossBorderTransfer' => true, 'encryptionRequired' => true],
            'APAC' => ['zone' => 'APAC', 'allowedRegions' => ['ap-southeast-1', 'ap-northeast-1'], 'classification' => 'regional', 'crossBorderTransfer' => true, 'encryptionRequired' => true],
            'AMERICAS' => ['zone' => 'AMERICAS', 'allowedRegions' => ['us-east-1', 'us-west-2'], 'classification' => 'regional', 'crossBorderTransfer' => true, 'encryptionRequired' => false],
        ];

        return $zones[$zone] ?? ['zone' => 'GLOBAL', 'allowedRegions' => ['*'], 'classification' => 'global', 'crossBorderTransfer' => true];
    }

    private static function formatRegion(Region $region): array
    {
        return [
            'id' => $region->uuid,
            'name' => $region->name,
            'code' => $region->code,
            'residencyZone' => $region->residency_zone,
        ];
    }

    private static function fallbackRegion(Country $country): array
    {
        $regionMap = [
            'SA' => ['code' => 'GCC', 'name' => 'Gulf Cooperation Council', 'residencyZone' => 'GCC'],
            'AE' => ['code' => 'GCC', 'name' => 'Gulf Cooperation Council', 'residencyZone' => 'GCC'],
            'BH' => ['code' => 'GCC', 'name' => 'Gulf Cooperation Council', 'residencyZone' => 'GCC'],
            'KW' => ['code' => 'GCC', 'name' => 'Gulf Cooperation Council', 'residencyZone' => 'GCC'],
            'OM' => ['code' => 'GCC', 'name' => 'Gulf Cooperation Council', 'residencyZone' => 'GCC'],
            'QA' => ['code' => 'GCC', 'name' => 'Gulf Cooperation Council', 'residencyZone' => 'GCC'],
            'EG' => ['code' => 'MENA', 'name' => 'Middle East & North Africa', 'residencyZone' => 'MENA'],
            'JO' => ['code' => 'MENA', 'name' => 'Middle East & North Africa', 'residencyZone' => 'MENA'],
            'FR' => ['code' => 'EU', 'name' => 'European Union', 'residencyZone' => 'EU'],
            'ES' => ['code' => 'EU', 'name' => 'European Union', 'residencyZone' => 'EU'],
            'NL' => ['code' => 'EU', 'name' => 'European Union', 'residencyZone' => 'EU'],
        ];

        $info = $regionMap[$country->code] ?? ['code' => 'GLOBAL', 'name' => 'Global', 'residencyZone' => 'GLOBAL'];
        return [
            'id' => strtolower($info['code']),
            'name' => $info['name'],
            'code' => $info['code'],
            'residencyZone' => $info['residencyZone'],
        ];
    }

    private static function formatCountry(Country $country): array
    {
        $settings = $country->settings ?? [];
        return [
            'id' => $country->uuid,
            'name' => $country->name,
            'code' => $country->code,
            'settings' => [
                'currency' => $settings['currency'] ?? $country->currency_code ?? 'USD',
                'defaultLocale' => $settings['defaultLocale'] ?? $country->default_locale ?? 'en',
                'processingRegion' => $country->processing_region ?? 'global',
                'residencyClass' => $country->residency_class ?? 'global',
            ],
        ];
    }

    private static function formatAuthority(array $auth): array
    {
        return [
            'id' => $auth['uuid'] ?? $auth['id'] ?? null,
            'name' => $auth['name'] ?? '',
            'code' => $auth['code'] ?? '',
            'type' => $auth['type'] ?? 'regulatory',
            'jurisdiction' => $auth['jurisdiction'] ?? [],
        ];
    }

    private static function fallbackAuthorities(string $countryCode): array
    {
        $authorities = [
            'SA' => [
                ['uuid' => 'citc-sa', 'code' => 'CITC', 'name' => 'Communications, Space & Technology Commission', 'type' => 'regulatory', 'jurisdiction' => ['scope' => 'national', 'domain' => 'telecommunications'], 'mandates' => ['PDPL'], 'compliance_requirements' => ['data-localization'], 'data_handling_rules' => []],
                ['uuid' => 'ndmo-sa', 'code' => 'NDMO', 'name' => 'National Data Management Office', 'type' => 'regulatory', 'jurisdiction' => ['scope' => 'national', 'domain' => 'data-governance'], 'mandates' => ['PDPL', 'NCA-ECC'], 'compliance_requirements' => ['data-classification', 'privacy-impact-assessment'], 'data_handling_rules' => []],
                ['uuid' => 'tga-sa', 'code' => 'TGA', 'name' => 'Transport General Authority', 'type' => 'regulatory', 'jurisdiction' => ['scope' => 'national', 'domain' => 'logistics'], 'mandates' => ['TGA-REG'], 'compliance_requirements' => ['vehicle-registration', 'driver-licensing'], 'data_handling_rules' => []],
            ],
            'AE' => [
                ['uuid' => 'tdra-ae', 'code' => 'TDRA', 'name' => 'Telecommunications & Digital Government Regulatory Authority', 'type' => 'federal', 'jurisdiction' => ['scope' => 'national', 'domain' => 'telecommunications'], 'mandates' => ['PDPL-UAE'], 'compliance_requirements' => ['data-localization'], 'data_handling_rules' => []],
                ['uuid' => 'rta-dubai', 'code' => 'RTA', 'name' => 'Roads and Transport Authority', 'type' => 'municipal', 'jurisdiction' => ['scope' => 'emirate', 'domain' => 'transport', 'emirate' => 'Dubai'], 'mandates' => ['RTA-REG'], 'compliance_requirements' => ['taxi-licensing'], 'data_handling_rules' => []],
            ],
        ];

        return $authorities[$countryCode] ?? [];
    }

    public static function defaultPolicies(): array
    {
        return [
            'dataResidency' => ['zone' => 'GLOBAL', 'allowedRegions' => ['*'], 'classification' => 'global', 'crossBorderTransfer' => true],
            'compliance' => ['frameworks' => [], 'auditRequired' => false, 'retentionPeriod' => '3y'],
            'classification' => ['levels' => ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'], 'defaultLevel' => 'INTERNAL'],
            'operational' => [],
        ];
    }
}
