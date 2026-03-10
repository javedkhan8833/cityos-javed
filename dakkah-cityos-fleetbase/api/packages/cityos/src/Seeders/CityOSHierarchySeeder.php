<?php

namespace Fleetbase\CityOS\Seeders;

use Fleetbase\CityOS\Models\Country;
use Fleetbase\CityOS\Models\City;
use Fleetbase\CityOS\Models\Sector;
use Fleetbase\CityOS\Models\Category;
use Fleetbase\CityOS\Models\Tenant;
use Fleetbase\CityOS\Models\Channel;
use Fleetbase\CityOS\Models\Surface;
use Fleetbase\CityOS\Models\Portal;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CityOSHierarchySeeder extends Seeder
{
    protected string $imagePath;

    public function run()
    {
        $this->imagePath = storage_path('app/cityos/images');

        $this->command->info('Seeding CityOS hierarchy data...');

        $countries = $this->seedCountries();
        $cities = $this->seedCities($countries);
        $sectors = $this->seedSectors();
        $categories = $this->seedCategories($sectors);
        $tenants = $this->seedTenants($countries, $cities, $sectors, $categories);
        $channels = $this->seedChannels($tenants);
        $surfaces = $this->seedSurfaces($tenants, $channels);
        $this->seedPortals($tenants, $surfaces);

        $this->command->info('CityOS hierarchy seeding complete!');
        $this->command->table(['Entity', 'Count'], [
            ['Countries', count($countries)],
            ['Cities', count($cities)],
            ['Sectors', count($sectors)],
            ['Categories', count($categories)],
            ['Tenants', count($tenants)],
            ['Channels', count($channels)],
            ['Surfaces', count($surfaces)],
            ['Portals', \Fleetbase\CityOS\Models\Portal::query()->count()],
        ]);
    }

    protected function seedCountries(): array
    {
        $data = [
            [
                'code' => 'SA',
                'name' => 'Saudi Arabia',
                'name_ar' => 'المملكة العربية السعودية',
                'currency_code' => 'SAR',
                'default_locale' => 'ar-SA',
                'processing_region' => 'me-central-1',
                'residency_class' => 'sovereign',
                'status' => 'active',
                'meta' => [
                    'flag_image' => 'countries/saudi_arabia.png',
                    'dialing_code' => '+966',
                    'timezone' => 'Asia/Riyadh',
                    'iso_alpha3' => 'SAU',
                    'capital' => 'Riyadh',
                    'population' => 36947025,
                    'area_km2' => 2149690,
                    'languages' => ['ar'],
                    'vat_rate' => 15.0,
                ],
            ],
            [
                'code' => 'AE',
                'name' => 'United Arab Emirates',
                'name_ar' => 'الإمارات العربية المتحدة',
                'currency_code' => 'AED',
                'default_locale' => 'ar-AE',
                'processing_region' => 'me-central-1',
                'residency_class' => 'regional',
                'status' => 'active',
                'meta' => [
                    'flag_image' => 'countries/uae.png',
                    'dialing_code' => '+971',
                    'timezone' => 'Asia/Dubai',
                    'iso_alpha3' => 'ARE',
                    'capital' => 'Abu Dhabi',
                    'population' => 9441129,
                    'area_km2' => 83600,
                    'languages' => ['ar', 'en'],
                    'vat_rate' => 5.0,
                ],
            ],
        ];

        $countries = [];
        foreach ($data as $item) {
            $countries[$item['code']] = Country::updateOrCreate(['code' => $item['code']], $item);
            $this->command->info("  Country: {$item['name']} ({$item['code']})");
        }

        return $countries;
    }

    protected function seedCities(array $countries): array
    {
        $data = [
            'SA' => [
                ['slug' => 'riyadh', 'name' => 'Riyadh', 'name_ar' => 'الرياض', 'lat' => 24.7136, 'lng' => 46.6753, 'timezone' => 'Asia/Riyadh', 'population' => 7677000, 'region' => 'Central', 'region_ar' => 'المنطقة الوسطى', 'image' => 'cities/riyadh.png'],
                ['slug' => 'jeddah', 'name' => 'Jeddah', 'name_ar' => 'جدة', 'lat' => 21.4858, 'lng' => 39.1925, 'timezone' => 'Asia/Riyadh', 'population' => 4697000, 'region' => 'Western', 'region_ar' => 'المنطقة الغربية', 'image' => 'cities/jeddah.png'],
                ['slug' => 'makkah', 'name' => 'Makkah', 'name_ar' => 'مكة المكرمة', 'lat' => 21.3891, 'lng' => 39.8579, 'timezone' => 'Asia/Riyadh', 'population' => 2042000, 'region' => 'Western', 'region_ar' => 'المنطقة الغربية', 'image' => 'cities/makkah.png'],
                ['slug' => 'dammam', 'name' => 'Dammam', 'name_ar' => 'الدمام', 'lat' => 26.3927, 'lng' => 49.9777, 'timezone' => 'Asia/Riyadh', 'population' => 1252000, 'region' => 'Eastern', 'region_ar' => 'المنطقة الشرقية', 'image' => 'cities/dammam.png'],
                ['slug' => 'medina', 'name' => 'Medina', 'name_ar' => 'المدينة المنورة', 'lat' => 24.5247, 'lng' => 39.5692, 'timezone' => 'Asia/Riyadh', 'population' => 1411599, 'region' => 'Western', 'region_ar' => 'المنطقة الغربية', 'image' => 'cities/riyadh.png'],
                ['slug' => 'tabuk', 'name' => 'Tabuk', 'name_ar' => 'تبوك', 'lat' => 28.3838, 'lng' => 36.5550, 'timezone' => 'Asia/Riyadh', 'population' => 672000, 'region' => 'Northwestern', 'region_ar' => 'منطقة تبوك', 'image' => 'cities/riyadh.png'],
                ['slug' => 'abha', 'name' => 'Abha', 'name_ar' => 'أبها', 'lat' => 18.2164, 'lng' => 42.5053, 'timezone' => 'Asia/Riyadh', 'population' => 366551, 'region' => 'Southern', 'region_ar' => 'منطقة عسير', 'image' => 'cities/riyadh.png'],
            ],
            'AE' => [
                ['slug' => 'dubai', 'name' => 'Dubai', 'name_ar' => 'دبي', 'lat' => 25.2048, 'lng' => 55.2708, 'timezone' => 'Asia/Dubai', 'population' => 3478300, 'region' => 'Dubai', 'region_ar' => 'دبي', 'image' => 'cities/dubai.png'],
                ['slug' => 'abu-dhabi', 'name' => 'Abu Dhabi', 'name_ar' => 'أبوظبي', 'lat' => 24.4539, 'lng' => 54.3773, 'timezone' => 'Asia/Dubai', 'population' => 1483000, 'region' => 'Abu Dhabi', 'region_ar' => 'أبوظبي', 'image' => 'cities/abu_dhabi.png'],
                ['slug' => 'sharjah', 'name' => 'Sharjah', 'name_ar' => 'الشارقة', 'lat' => 25.3462, 'lng' => 55.4211, 'timezone' => 'Asia/Dubai', 'population' => 1274749, 'region' => 'Sharjah', 'region_ar' => 'الشارقة', 'image' => 'cities/sharjah.png'],
            ],
        ];

        $cities = [];
        foreach ($data as $countryCode => $cityList) {
            foreach ($cityList as $city) {
                $record = City::updateOrCreate(
                    ['slug' => $city['slug'], 'country_uuid' => $countries[$countryCode]->uuid],
                    [
                        'country_uuid' => $countries[$countryCode]->uuid,
                        'slug' => $city['slug'],
                        'name' => $city['name'],
                        'name_ar' => $city['name_ar'],
                        'status' => 'active',
                        'meta' => [
                            'latitude' => $city['lat'],
                            'longitude' => $city['lng'],
                            'timezone' => $city['timezone'],
                            'population' => $city['population'],
                            'region' => $city['region'],
                            'region_ar' => $city['region_ar'],
                            'image' => $city['image'],
                            'coverage_radius_km' => $city['population'] > 2000000 ? 80 : 40,
                        ],
                    ]
                );
                $cities[$city['slug']] = $record;
                $this->command->info("  City: {$city['name']} ({$countryCode})");
            }
        }

        return $cities;
    }

    protected function seedSectors(): array
    {
        $data = [
            ['slug' => 'logistics', 'name' => 'Logistics & Delivery', 'name_ar' => 'الخدمات اللوجستية والتوصيل', 'description' => 'Last-mile delivery, freight, and supply chain operations', 'description_ar' => 'التوصيل للميل الأخير والشحن وعمليات سلسلة التوريد', 'icon' => 'truck', 'image' => 'sectors/logistics.png'],
            ['slug' => 'services', 'name' => 'Field Services', 'name_ar' => 'الخدمات الميدانية', 'description' => 'On-site installation, maintenance, and repair services', 'description_ar' => 'خدمات التركيب والصيانة والإصلاح في الموقع', 'icon' => 'wrench', 'image' => 'sectors/services.png'],
            ['slug' => 'mobility', 'name' => 'Mobility & Transport', 'name_ar' => 'التنقل والنقل', 'description' => 'Ride-hailing, car rental, and urban mobility solutions', 'description_ar' => 'خدمات النقل التشاركي وتأجير السيارات وحلول التنقل الحضري', 'icon' => 'car', 'image' => 'sectors/mobility.png'],
            ['slug' => 'warehousing', 'name' => 'Warehousing & Inventory', 'name_ar' => 'التخزين والمخزون', 'description' => 'Warehouse management, inventory tracking, and fulfillment', 'description_ar' => 'إدارة المستودعات وتتبع المخزون والتنفيذ', 'icon' => 'warehouse', 'image' => 'categories/warehousing.png'],
        ];

        $sectors = [];
        foreach ($data as $item) {
            $record = Sector::updateOrCreate(['slug' => $item['slug']], [
                'slug' => $item['slug'],
                'name' => $item['name'],
                'name_ar' => $item['name_ar'],
                'status' => 'active',
                'meta' => [
                    'description' => $item['description'],
                    'description_ar' => $item['description_ar'],
                    'icon' => $item['icon'],
                    'image' => $item['image'],
                    'sort_order' => array_search($item, $data),
                ],
            ]);
            $sectors[$item['slug']] = $record;
            $this->command->info("  Sector: {$item['name']}");
        }

        return $sectors;
    }

    protected function seedCategories(array $sectors): array
    {
        $data = [
            'logistics' => [
                ['slug' => 'food-delivery', 'name' => 'Food Delivery', 'name_ar' => 'توصيل الطعام', 'type' => 'category', 'image' => 'categories/food_delivery.png', 'subcategories' => [
                    ['slug' => 'restaurant-delivery', 'name' => 'Restaurant Delivery', 'name_ar' => 'توصيل المطاعم'],
                    ['slug' => 'grocery-delivery', 'name' => 'Grocery Delivery', 'name_ar' => 'توصيل البقالة'],
                    ['slug' => 'catering-delivery', 'name' => 'Catering Delivery', 'name_ar' => 'توصيل الطعام الجماعي'],
                ]],
                ['slug' => 'parcel-delivery', 'name' => 'Parcel Delivery', 'name_ar' => 'توصيل الطرود', 'type' => 'category', 'image' => 'categories/parcel_delivery.png', 'subcategories' => [
                    ['slug' => 'same-day', 'name' => 'Same Day Delivery', 'name_ar' => 'توصيل في نفس اليوم'],
                    ['slug' => 'express', 'name' => 'Express Delivery', 'name_ar' => 'التوصيل السريع'],
                    ['slug' => 'economy', 'name' => 'Economy Delivery', 'name_ar' => 'التوصيل الاقتصادي'],
                    ['slug' => 'international', 'name' => 'International Shipping', 'name_ar' => 'الشحن الدولي'],
                ]],
                ['slug' => 'e-commerce-fulfillment', 'name' => 'E-Commerce Fulfillment', 'name_ar' => 'تنفيذ التجارة الإلكترونية', 'type' => 'category', 'image' => 'categories/parcel_delivery.png', 'subcategories' => [
                    ['slug' => 'pick-pack-ship', 'name' => 'Pick, Pack & Ship', 'name_ar' => 'الانتقاء والتعبئة والشحن'],
                    ['slug' => 'returns-management', 'name' => 'Returns Management', 'name_ar' => 'إدارة المرتجعات'],
                ]],
            ],
            'services' => [
                ['slug' => 'installation', 'name' => 'Installation Services', 'name_ar' => 'خدمات التركيب', 'type' => 'category', 'image' => 'categories/installation.png', 'subcategories' => [
                    ['slug' => 'hvac-installation', 'name' => 'HVAC Installation', 'name_ar' => 'تركيب أنظمة التكييف'],
                    ['slug' => 'appliance-install', 'name' => 'Appliance Installation', 'name_ar' => 'تركيب الأجهزة'],
                    ['slug' => 'furniture-assembly', 'name' => 'Furniture Assembly', 'name_ar' => 'تجميع الأثاث'],
                ]],
                ['slug' => 'maintenance', 'name' => 'Maintenance & Repair', 'name_ar' => 'الصيانة والإصلاح', 'type' => 'category', 'image' => 'categories/installation.png', 'subcategories' => [
                    ['slug' => 'plumbing', 'name' => 'Plumbing', 'name_ar' => 'السباكة'],
                    ['slug' => 'electrical', 'name' => 'Electrical', 'name_ar' => 'الكهرباء'],
                    ['slug' => 'cleaning', 'name' => 'Cleaning Services', 'name_ar' => 'خدمات التنظيف'],
                ]],
            ],
            'mobility' => [
                ['slug' => 'ride-hailing', 'name' => 'Ride Hailing', 'name_ar' => 'طلب الرحلات', 'type' => 'category', 'image' => 'categories/ride_hailing.png', 'subcategories' => [
                    ['slug' => 'economy-ride', 'name' => 'Economy Ride', 'name_ar' => 'رحلة اقتصادية'],
                    ['slug' => 'premium-ride', 'name' => 'Premium Ride', 'name_ar' => 'رحلة مميزة'],
                    ['slug' => 'shared-ride', 'name' => 'Shared Ride', 'name_ar' => 'رحلة مشتركة'],
                ]],
                ['slug' => 'car-rental', 'name' => 'Car Rental', 'name_ar' => 'تأجير السيارات', 'type' => 'category', 'image' => 'categories/ride_hailing.png', 'subcategories' => [
                    ['slug' => 'daily-rental', 'name' => 'Daily Rental', 'name_ar' => 'تأجير يومي'],
                    ['slug' => 'monthly-rental', 'name' => 'Monthly Rental', 'name_ar' => 'تأجير شهري'],
                ]],
            ],
            'warehousing' => [
                ['slug' => 'inventory-management', 'name' => 'Inventory Management', 'name_ar' => 'إدارة المخزون', 'type' => 'category', 'image' => 'categories/warehousing.png', 'subcategories' => [
                    ['slug' => 'stock-tracking', 'name' => 'Stock Tracking', 'name_ar' => 'تتبع المخزون'],
                    ['slug' => 'batch-management', 'name' => 'Batch Management', 'name_ar' => 'إدارة الدفعات'],
                ]],
            ],
        ];

        $categories = [];
        foreach ($data as $sectorSlug => $catList) {
            if (!isset($sectors[$sectorSlug])) continue;
            $sector = $sectors[$sectorSlug];

            foreach ($catList as $cat) {
                $record = Category::updateOrCreate(['slug' => $cat['slug']], [
                    'slug' => $cat['slug'],
                    'name' => $cat['name'],
                    'name_ar' => $cat['name_ar'],
                    'sector_uuid' => $sector->uuid,
                    'level' => 1,
                    'status' => 'active',
                    'meta' => [
                        'type' => $cat['type'],
                        'image' => $cat['image'],
                    ],
                ]);
                $categories[$cat['slug']] = $record;
                $this->command->info("  Category: {$cat['name']} ({$sectorSlug})");

                if (!empty($cat['subcategories'])) {
                    foreach ($cat['subcategories'] as $sub) {
                        $subRecord = Category::updateOrCreate(['slug' => $sub['slug']], [
                            'slug' => $sub['slug'],
                            'name' => $sub['name'],
                            'name_ar' => $sub['name_ar'],
                            'parent_uuid' => $record->uuid,
                            'sector_uuid' => $sector->uuid,
                            'level' => 2,
                            'status' => 'active',
                            'meta' => ['type' => 'subcategory'],
                        ]);
                        $categories[$sub['slug']] = $subRecord;
                    }
                }
            }
        }

        return $categories;
    }

    protected function seedTenants(array $countries, array $cities, array $sectors, array $categories): array
    {
        $data = [
            [
                'handle' => 'dakkah-riyadh-logistics',
                'name' => 'Dakkah Logistics Riyadh',
                'name_ar' => 'دكة للخدمات اللوجستية - الرياض',
                'type' => 'enterprise',
                'subscription_tier' => 'premium',
                'domain' => 'riyadh.logistics.dakkah.sa',
                'subdomain' => 'riyadh-logistics',
                'country' => 'SA', 'city' => 'riyadh',
                'sector' => 'logistics', 'category' => 'parcel-delivery',
                'medusa_tenant_id' => 'med_riyadh_logistics_001',
                'payload_tenant_id' => 'pl_riyadh_logistics_001',
                'erpnext_company' => 'Dakkah Logistics Riyadh Co.',
                'branding' => ['name' => 'Dakkah Logistics', 'primary_color' => '#1A5F3A', 'secondary_color' => '#D4AF37', 'logo' => 'tenants/dakkah_logistics.png'],
                'settings' => ['max_delivery_radius_km' => 80, 'default_currency' => 'SAR', 'sla_express_minutes' => 60, 'sla_standard_minutes' => 240, 'operating_hours' => ['start' => '06:00', 'end' => '02:00'], 'supported_payment_methods' => ['card', 'cod', 'wallet'], 'cold_chain_enabled' => true],
            ],
            [
                'handle' => 'dakkah-riyadh-food',
                'name' => 'Dakkah Food Delivery Riyadh',
                'name_ar' => 'دكة لتوصيل الطعام - الرياض',
                'type' => 'enterprise',
                'subscription_tier' => 'premium',
                'domain' => 'riyadh.food.dakkah.sa',
                'subdomain' => 'riyadh-food',
                'country' => 'SA', 'city' => 'riyadh',
                'sector' => 'logistics', 'category' => 'food-delivery',
                'medusa_tenant_id' => 'med_riyadh_food_001',
                'payload_tenant_id' => 'pl_riyadh_food_001',
                'erpnext_company' => 'Dakkah Food Delivery Riyadh Co.',
                'branding' => ['name' => 'Dakkah Eats', 'primary_color' => '#E63946', 'secondary_color' => '#F4A261', 'logo' => 'tenants/dakkah_eats.png'],
                'settings' => ['max_delivery_radius_km' => 30, 'default_currency' => 'SAR', 'sla_express_minutes' => 30, 'sla_standard_minutes' => 60, 'operating_hours' => ['start' => '10:00', 'end' => '03:00'], 'supported_payment_methods' => ['card', 'cod', 'wallet', 'apple_pay']],
            ],
            [
                'handle' => 'dakkah-jeddah-logistics',
                'name' => 'Dakkah Logistics Jeddah',
                'name_ar' => 'دكة للخدمات اللوجستية - جدة',
                'type' => 'enterprise',
                'subscription_tier' => 'standard',
                'domain' => 'jeddah.logistics.dakkah.sa',
                'subdomain' => 'jeddah-logistics',
                'country' => 'SA', 'city' => 'jeddah',
                'sector' => 'logistics', 'category' => 'parcel-delivery',
                'medusa_tenant_id' => 'med_jeddah_logistics_001',
                'payload_tenant_id' => 'pl_jeddah_logistics_001',
                'erpnext_company' => 'Dakkah Logistics Jeddah Co.',
                'branding' => ['name' => 'Dakkah Logistics Jeddah', 'primary_color' => '#2A6FDB', 'secondary_color' => '#F4D03F'],
                'settings' => ['max_delivery_radius_km' => 60, 'default_currency' => 'SAR', 'sla_express_minutes' => 60, 'sla_standard_minutes' => 240],
            ],
            [
                'handle' => 'dakkah-dubai-logistics',
                'name' => 'Dakkah Logistics Dubai',
                'name_ar' => 'دكة للخدمات اللوجستية - دبي',
                'type' => 'enterprise',
                'subscription_tier' => 'premium',
                'domain' => 'dubai.logistics.dakkah.ae',
                'subdomain' => 'dubai-logistics',
                'country' => 'AE', 'city' => 'dubai',
                'sector' => 'logistics', 'category' => 'parcel-delivery',
                'medusa_tenant_id' => 'med_dubai_logistics_001',
                'payload_tenant_id' => 'pl_dubai_logistics_001',
                'erpnext_company' => 'Dakkah Logistics Dubai LLC',
                'branding' => ['name' => 'Dakkah Dubai', 'primary_color' => '#C8A950', 'secondary_color' => '#1A1A2E'],
                'settings' => ['max_delivery_radius_km' => 70, 'default_currency' => 'AED', 'sla_express_minutes' => 45, 'sla_standard_minutes' => 180],
            ],
            [
                'handle' => 'dakkah-riyadh-services',
                'name' => 'Dakkah Field Services Riyadh',
                'name_ar' => 'دكة للخدمات الميدانية - الرياض',
                'type' => 'enterprise',
                'subscription_tier' => 'standard',
                'domain' => 'riyadh.services.dakkah.sa',
                'subdomain' => 'riyadh-services',
                'country' => 'SA', 'city' => 'riyadh',
                'sector' => 'services', 'category' => 'installation',
                'medusa_tenant_id' => 'med_riyadh_services_001',
                'payload_tenant_id' => 'pl_riyadh_services_001',
                'erpnext_company' => 'Dakkah Services Riyadh Co.',
                'branding' => ['name' => 'Dakkah Services', 'primary_color' => '#0B3D91', 'secondary_color' => '#FF6B35'],
                'settings' => ['max_service_radius_km' => 50, 'default_currency' => 'SAR', 'sla_standard_minutes' => 480, 'supported_payment_methods' => ['card', 'bank_transfer']],
            ],
            [
                'handle' => 'dakkah-riyadh-mobility',
                'name' => 'Dakkah Mobility Riyadh',
                'name_ar' => 'دكة للتنقل - الرياض',
                'type' => 'enterprise',
                'subscription_tier' => 'premium',
                'domain' => 'riyadh.mobility.dakkah.sa',
                'subdomain' => 'riyadh-mobility',
                'country' => 'SA', 'city' => 'riyadh',
                'sector' => 'mobility', 'category' => 'ride-hailing',
                'medusa_tenant_id' => 'med_riyadh_mobility_001',
                'payload_tenant_id' => 'pl_riyadh_mobility_001',
                'erpnext_company' => 'Dakkah Mobility Riyadh Co.',
                'branding' => ['name' => 'Dakkah Ride', 'primary_color' => '#6C3082', 'secondary_color' => '#00C9A7'],
                'settings' => ['max_ride_radius_km' => 100, 'default_currency' => 'SAR', 'surge_pricing_enabled' => true],
            ],
        ];

        $tenants = [];
        foreach ($data as $item) {
            $tenant = Tenant::updateOrCreate(['handle' => $item['handle']], [
                'handle' => $item['handle'],
                'name' => $item['name'],
                'name_ar' => $item['name_ar'],
                'type' => $item['type'],
                'subscription_tier' => $item['subscription_tier'],
                'status' => 'active',
                'domain' => $item['domain'],
                'subdomain' => $item['subdomain'],
                'country_uuid' => $countries[$item['country']]->uuid ?? null,
                'city_uuid' => $cities[$item['city']]->uuid ?? null,
                'sector_uuid' => $sectors[$item['sector']]->uuid ?? null,
                'category_uuid' => $categories[$item['category']]->uuid ?? null,
                'medusa_tenant_id' => $item['medusa_tenant_id'],
                'payload_tenant_id' => $item['payload_tenant_id'],
                'erpnext_company' => $item['erpnext_company'],
                'branding' => $item['branding'],
                'settings' => $item['settings'],
                'meta' => ['created_via' => 'seeder', 'version' => '1.0'],
            ]);
            $tenants[$item['handle']] = $tenant;
            $this->command->info("  Tenant: {$item['name']}");
        }

        return $tenants;
    }

    protected function seedChannels(array $tenants): array
    {
        $channelTypes = [
            ['slug' => 'web', 'name' => 'Web Channel', 'type' => 'web', 'description' => 'Browser-based web application'],
            ['slug' => 'mobile', 'name' => 'Mobile Channel', 'type' => 'mobile', 'description' => 'iOS and Android mobile applications'],
            ['slug' => 'api', 'name' => 'API Channel', 'type' => 'api', 'description' => 'REST/GraphQL API integration'],
            ['slug' => 'kiosk', 'name' => 'Kiosk Channel', 'type' => 'kiosk', 'description' => 'Self-service kiosk terminals'],
        ];

        $channels = [];
        foreach ($tenants as $handle => $tenant) {
            foreach ($channelTypes as $ch) {
                $channelSlug = "{$handle}-{$ch['slug']}";
                $record = Channel::updateOrCreate(['slug' => $channelSlug], [
                    'tenant_uuid' => $tenant->uuid,
                    'slug' => $channelSlug,
                    'name' => "{$tenant->name} - {$ch['name']}",
                    'type' => $ch['type'],
                    'status' => 'active',
                    'medusa_sales_channel_id' => "msc_{$handle}_{$ch['slug']}",
                    'meta' => [
                        'description' => $ch['description'],
                        'name_ar' => $ch['slug'] === 'web' ? 'قناة الويب' : ($ch['slug'] === 'mobile' ? 'قناة الجوال' : ($ch['slug'] === 'api' ? 'قناة واجهة البرمجة' : 'قناة الكشك')),
                        'image' => $ch['slug'] === 'kiosk' ? 'channels/kiosk.png' : null,
                    ],
                ]);
                $channels[$channelSlug] = $record;
            }
        }
        $this->command->info("  Channels: " . count($channels) . " created across " . count($tenants) . " tenants");

        return $channels;
    }

    protected function seedSurfaces(array $tenants, array $channels): array
    {
        $surfaceTypes = [
            ['slug' => 'consumer-app', 'name' => 'Consumer App', 'type' => 'consumer', 'persona' => 'customer', 'image' => 'surfaces/consumer_app.png', 'channel' => 'mobile'],
            ['slug' => 'provider-portal', 'name' => 'Provider Portal', 'type' => 'provider', 'persona' => 'provider', 'image' => 'surfaces/provider_portal.png', 'channel' => 'web'],
            ['slug' => 'agent-app', 'name' => 'Agent App', 'type' => 'agent', 'persona' => 'agent', 'image' => 'surfaces/consumer_app.png', 'channel' => 'mobile'],
            ['slug' => 'admin-dashboard', 'name' => 'Admin Dashboard', 'type' => 'admin', 'persona' => 'admin', 'image' => 'surfaces/provider_portal.png', 'channel' => 'web'],
        ];

        $surfaces = [];
        foreach ($tenants as $handle => $tenant) {
            foreach ($surfaceTypes as $sf) {
                $surfaceSlug = "{$handle}-{$sf['slug']}";
                $channelKey = "{$handle}-{$sf['channel']}";
                $channel = $channels[$channelKey] ?? null;

                $record = Surface::updateOrCreate(['slug' => $surfaceSlug], [
                    'channel_uuid' => $channel?->uuid,
                    'slug' => $surfaceSlug,
                    'name' => "{$tenant->name} - {$sf['name']}",
                    'type' => $sf['type'],
                    'status' => 'active',
                    'meta' => [
                        'tenant_uuid' => $tenant->uuid,
                        'persona' => $sf['persona'],
                        'image' => $sf['image'],
                    ],
                ]);
                $surfaces[$surfaceSlug] = $record;
            }
        }
        $this->command->info("  Surfaces: " . count($surfaces) . " created across " . count($tenants) . " tenants");

        return $surfaces;
    }

    protected function seedPortals(array $tenants, array $surfaces): void
    {
        $portalTypes = [
            ['slug' => 'storefront', 'name' => 'Storefront', 'type' => 'storefront', 'surface' => 'consumer-app'],
            ['slug' => 'admin', 'name' => 'Admin Dashboard', 'type' => 'admin', 'surface' => 'admin-dashboard'],
            ['slug' => 'fleet-ops', 'name' => 'Fleet Operations', 'type' => 'operations', 'surface' => 'provider-portal'],
        ];

        $count = 0;
        foreach ($tenants as $handle => $tenant) {
            foreach ($portalTypes as $pt) {
                $portalSlug = "{$handle}-{$pt['slug']}";
                $surfaceKey = "{$handle}-{$pt['surface']}";
                $surface = $surfaces[$surfaceKey] ?? null;

                Portal::updateOrCreate(['slug' => $portalSlug], [
                    'tenant_uuid' => $tenant->uuid,
                    'surface_uuid' => $surface?->uuid,
                    'slug' => $portalSlug,
                    'name' => "{$tenant->name} - {$pt['name']}",
                    'type' => $pt['type'],
                    'status' => 'active',
                    'medusa_store_id' => "ms_{$handle}_{$pt['slug']}",
                    'payload_store_id' => "ps_{$handle}_{$pt['slug']}",
                    'meta' => ['created_via' => 'seeder'],
                ]);
                $count++;
            }
        }
        $this->command->info("  Portals: {$count} created across " . count($tenants) . " tenants");
    }
}
