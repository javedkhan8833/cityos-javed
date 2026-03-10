<?php

namespace Fleetbase\CityOS\Seeders;

use Fleetbase\CityOS\Models\Country;
use Fleetbase\CityOS\Models\FeatureFlag;
use Fleetbase\CityOS\Models\GovernanceAuthority;
use Fleetbase\CityOS\Models\Node;
use Fleetbase\CityOS\Models\Policy;
use Fleetbase\CityOS\Models\Region;
use Illuminate\Database\Seeder;

class CityOSGovernanceSeeder extends Seeder
{
    public function run()
    {
        $this->command->info('Seeding CityOS governance data...');

        $regions = $this->seedRegions();
        $this->linkCountriesToRegions($regions);
        $authorities = $this->seedGovernanceAuthorities();
        $this->seedPolicies($regions, $authorities);
        $this->seedFeatureFlags();
        $this->seedNodes();

        $this->command->info('CityOS governance seeding complete!');
    }

    protected function seedRegions(): array
    {
        $regions = [];
        $data = [
            [
                'code' => 'GCC',
                'name' => 'Gulf Cooperation Council',
                'name_ar' => 'مجلس التعاون الخليجي',
                'residency_zone' => 'GCC',
                'data_residency_policy' => [
                    'zone' => 'GCC',
                    'allowedRegions' => ['me-central-1', 'me-south-1'],
                    'classification' => 'sovereign',
                    'crossBorderTransfer' => false,
                    'encryptionRequired' => true,
                ],
                'compliance_policy' => [
                    'frameworks' => ['PDPL', 'NCA-ECC'],
                    'auditRequired' => true,
                    'retentionPeriod' => '7y',
                ],
                'classification_policy' => [
                    'levels' => ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'],
                    'defaultLevel' => 'INTERNAL',
                ],
                'status' => 'active',
            ],
            [
                'code' => 'MENA',
                'name' => 'Middle East & North Africa',
                'name_ar' => 'الشرق الأوسط وشمال أفريقيا',
                'residency_zone' => 'MENA',
                'data_residency_policy' => [
                    'zone' => 'MENA',
                    'allowedRegions' => ['me-central-1', 'eu-south-1'],
                    'classification' => 'regional',
                    'crossBorderTransfer' => true,
                    'encryptionRequired' => true,
                ],
                'compliance_policy' => [
                    'frameworks' => [],
                    'auditRequired' => false,
                    'retentionPeriod' => '3y',
                ],
                'classification_policy' => [
                    'levels' => ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL'],
                    'defaultLevel' => 'INTERNAL',
                ],
                'status' => 'active',
            ],
            [
                'code' => 'EU',
                'name' => 'European Union',
                'name_ar' => 'الاتحاد الأوروبي',
                'residency_zone' => 'EU',
                'data_residency_policy' => [
                    'zone' => 'EU',
                    'allowedRegions' => ['eu-west-1', 'eu-central-1'],
                    'classification' => 'regional',
                    'crossBorderTransfer' => true,
                    'gdprCompliant' => true,
                    'encryptionRequired' => true,
                ],
                'compliance_policy' => [
                    'frameworks' => ['GDPR', 'ePrivacy'],
                    'auditRequired' => true,
                    'retentionPeriod' => '5y',
                ],
                'classification_policy' => [
                    'levels' => ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'],
                    'defaultLevel' => 'INTERNAL',
                ],
                'status' => 'active',
            ],
            [
                'code' => 'GLOBAL',
                'name' => 'Global',
                'name_ar' => 'عالمي',
                'residency_zone' => 'GLOBAL',
                'data_residency_policy' => [
                    'zone' => 'GLOBAL',
                    'allowedRegions' => ['*'],
                    'classification' => 'global',
                    'crossBorderTransfer' => true,
                    'encryptionRequired' => false,
                ],
                'status' => 'active',
            ],
        ];

        foreach ($data as $r) {
            $regions[$r['code']] = Region::updateOrCreate(['code' => $r['code']], $r);
        }

        return $regions;
    }

    protected function linkCountriesToRegions(array $regions): void
    {
        $countryRegionMap = [
            'SA' => 'GCC', 'AE' => 'GCC', 'BH' => 'GCC', 'KW' => 'GCC', 'OM' => 'GCC', 'QA' => 'GCC',
            'EG' => 'MENA', 'JO' => 'MENA', 'LB' => 'MENA', 'IQ' => 'MENA', 'MA' => 'MENA',
            'FR' => 'EU', 'ES' => 'EU', 'NL' => 'EU', 'DE' => 'EU', 'IT' => 'EU',
        ];

        foreach ($countryRegionMap as $countryCode => $regionCode) {
            $country = Country::where('code', $countryCode)->first();
            $region = $regions[$regionCode] ?? null;
            if ($country && $region) {
                $country->update(['region_uuid' => $region->uuid]);
            }
        }
    }

    protected function seedGovernanceAuthorities(): array
    {
        $authorities = [];
        $data = [
            [
                'code' => 'CITC',
                'name' => 'Communications, Space & Technology Commission',
                'name_ar' => 'هيئة الاتصالات والفضاء والتقنية',
                'country_code' => 'SA',
                'type' => 'regulatory',
                'jurisdiction' => ['scope' => 'national', 'domain' => 'telecommunications'],
                'mandates' => ['PDPL'],
                'compliance_requirements' => ['data-localization'],
                'status' => 'active',
            ],
            [
                'code' => 'NDMO',
                'name' => 'National Data Management Office',
                'name_ar' => 'مكتب إدارة البيانات الوطنية',
                'country_code' => 'SA',
                'type' => 'regulatory',
                'jurisdiction' => ['scope' => 'national', 'domain' => 'data-governance'],
                'mandates' => ['PDPL', 'NCA-ECC'],
                'compliance_requirements' => ['data-classification', 'privacy-impact-assessment'],
                'status' => 'active',
            ],
            [
                'code' => 'TGA',
                'name' => 'Transport General Authority',
                'name_ar' => 'الهيئة العامة للنقل',
                'country_code' => 'SA',
                'type' => 'regulatory',
                'jurisdiction' => ['scope' => 'national', 'domain' => 'logistics'],
                'mandates' => ['TGA-REG'],
                'compliance_requirements' => ['vehicle-registration', 'driver-licensing'],
                'status' => 'active',
            ],
            [
                'code' => 'TDRA',
                'name' => 'Telecommunications & Digital Government Regulatory Authority',
                'name_ar' => 'هيئة تنظيم الاتصالات والحكومة الرقمية',
                'country_code' => 'AE',
                'type' => 'federal',
                'jurisdiction' => ['scope' => 'national', 'domain' => 'telecommunications'],
                'mandates' => ['PDPL-UAE'],
                'compliance_requirements' => ['data-localization'],
                'status' => 'active',
            ],
            [
                'code' => 'RTA',
                'name' => 'Roads and Transport Authority',
                'name_ar' => 'هيئة الطرق والمواصلات',
                'country_code' => 'AE',
                'type' => 'municipal',
                'jurisdiction' => ['scope' => 'emirate', 'domain' => 'transport', 'emirate' => 'Dubai'],
                'mandates' => ['RTA-REG'],
                'compliance_requirements' => ['taxi-licensing'],
                'status' => 'active',
            ],
        ];

        foreach ($data as $a) {
            $country = Country::where('code', $a['country_code'])->first();
            unset($a['country_code']);
            $a['country_uuid'] = $country?->uuid;
            $authorities[$a['code']] = GovernanceAuthority::updateOrCreate(['code' => $a['code']], $a);
        }

        return $authorities;
    }

    protected function seedPolicies(array $regions, array $authorities): void
    {
        $gccRegion = $regions['GCC'] ?? null;
        $saCountry = Country::where('code', 'SA')->first();

        $policies = [
            [
                'name' => 'GCC Data Residency',
                'slug' => 'gcc-data-residency',
                'type' => 'data-residency',
                'scope' => 'regional',
                'priority' => 10,
                'region_uuid' => $gccRegion?->uuid,
                'policy_data' => [
                    'dataResidency' => [
                        'zone' => 'GCC',
                        'allowedRegions' => ['me-central-1', 'me-south-1'],
                        'classification' => 'sovereign',
                        'crossBorderTransfer' => false,
                        'encryptionRequired' => true,
                    ],
                ],
                'enforced' => \Illuminate\Support\Facades\DB::raw('true'),
                'status' => 'active',
            ],
            [
                'name' => 'GCC Classification',
                'slug' => 'gcc-classification',
                'type' => 'classification',
                'scope' => 'regional',
                'priority' => 10,
                'region_uuid' => $gccRegion?->uuid,
                'policy_data' => [
                    'classification' => [
                        'levels' => ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'],
                        'defaultLevel' => 'INTERNAL',
                    ],
                ],
                'enforced' => \Illuminate\Support\Facades\DB::raw('true'),
                'status' => 'active',
            ],
            [
                'name' => 'SA PDPL Compliance',
                'slug' => 'sa-pdpl-compliance',
                'type' => 'compliance',
                'scope' => 'national',
                'priority' => 20,
                'country_uuid' => $saCountry?->uuid,
                'policy_data' => [
                    'compliance' => [
                        'frameworks' => ['PDPL', 'NCA-ECC'],
                        'auditRequired' => true,
                        'retentionPeriod' => '7y',
                    ],
                ],
                'enforced' => \Illuminate\Support\Facades\DB::raw('true'),
                'status' => 'active',
            ],
        ];

        foreach ($policies as $p) {
            Policy::updateOrCreate(['slug' => $p['slug']], $p);
        }
    }

    protected function seedFeatureFlags(): void
    {
        $flags = [
            [
                'key' => 'multi-tenant-isolation',
                'name' => 'Multi-Tenant Data Isolation',
                'description' => 'Enforce strict data isolation between tenants',
                'enabled' => \Illuminate\Support\Facades\DB::raw('true'),
                'conditions' => ['tenant_tiers' => ['MASTER', 'GLOBAL', 'REGIONAL']],
                'status' => 'active',
            ],
            [
                'key' => 'governance-chain',
                'name' => 'Governance Chain Resolution',
                'description' => 'Enable cascading governance policy resolution',
                'enabled' => \Illuminate\Support\Facades\DB::raw('true'),
                'conditions' => [],
                'status' => 'active',
            ],
            [
                'key' => 'cms-sync',
                'name' => 'CMS Synchronization',
                'description' => 'Sync hierarchy data from Payload CMS',
                'enabled' => \Illuminate\Support\Facades\DB::raw('true'),
                'conditions' => ['tenant_tiers' => ['MASTER', 'GLOBAL']],
                'status' => 'active',
            ],
            [
                'key' => 'data-classification-enforcement',
                'name' => 'Data Classification Enforcement',
                'description' => 'Enforce data classification levels on API responses',
                'enabled' => \Illuminate\Support\Facades\DB::raw('false'),
                'conditions' => [],
                'status' => 'active',
            ],
        ];

        foreach ($flags as $f) {
            FeatureFlag::updateOrCreate(['key' => $f['key']], $f);
        }
    }

    protected function seedNodes(): void
    {
        $saCountry = Country::where('code', 'SA')->first();
        $aeCountry = Country::where('code', 'AE')->first();

        $global = Node::updateOrCreate(['slug' => 'dakkah-global'], [
            'type' => 'GLOBAL',
            'name' => 'Dakkah Global',
            'name_ar' => 'دكة عالمي',
            'slug' => 'dakkah-global',
            'code' => 'DAKKAH-GLOBAL',
            'depth' => 0,
            'status' => 'active',
            'stewardship_state' => 'claimed',
        ]);

        $meContinent = Node::updateOrCreate(['slug' => 'middle-east'], [
            'type' => 'CONTINENT',
            'name' => 'Middle East',
            'name_ar' => 'الشرق الأوسط',
            'slug' => 'middle-east',
            'code' => 'ME',
            'parent_uuid' => $global->uuid,
            'depth' => 1,
            'status' => 'active',
        ]);

        $sa = Node::updateOrCreate(['slug' => 'saudi-arabia-node'], [
            'type' => 'REGION',
            'name' => 'Saudi Arabia',
            'name_ar' => 'المملكة العربية السعودية',
            'slug' => 'saudi-arabia-node',
            'code' => 'SA',
            'parent_uuid' => $meContinent->uuid,
            'country_uuid' => $saCountry?->uuid,
            'depth' => 2,
            'status' => 'active',
        ]);

        $ae = Node::updateOrCreate(['slug' => 'uae-node'], [
            'type' => 'REGION',
            'name' => 'United Arab Emirates',
            'name_ar' => 'الإمارات العربية المتحدة',
            'slug' => 'uae-node',
            'code' => 'AE',
            'parent_uuid' => $meContinent->uuid,
            'country_uuid' => $aeCountry?->uuid,
            'depth' => 2,
            'status' => 'active',
        ]);

        Node::updateOrCreate(['slug' => 'riyadh-node'], [
            'type' => 'CITY',
            'name' => 'Riyadh',
            'name_ar' => 'الرياض',
            'slug' => 'riyadh-node',
            'code' => 'RUH-001',
            'parent_uuid' => $sa->uuid,
            'country_uuid' => $saCountry?->uuid,
            'coordinates_lat' => 24.7136,
            'coordinates_lng' => 46.6753,
            'depth' => 4,
            'status' => 'active',
        ]);

        Node::updateOrCreate(['slug' => 'dubai-node'], [
            'type' => 'CITY',
            'name' => 'Dubai',
            'name_ar' => 'دبي',
            'slug' => 'dubai-node',
            'code' => 'DXB-001',
            'parent_uuid' => $ae->uuid,
            'country_uuid' => $aeCountry?->uuid,
            'coordinates_lat' => 25.2048,
            'coordinates_lng' => 55.2708,
            'depth' => 4,
            'status' => 'active',
        ]);

        foreach (Node::all() as $node) {
            $node->update(['path' => $node->buildPath()]);
        }
    }
}
