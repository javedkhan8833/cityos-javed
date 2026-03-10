<?php

namespace Fleetbase\CityOS\Services;

use Fleetbase\CityOS\Models\Category;
use Fleetbase\CityOS\Models\Country;
use Fleetbase\CityOS\Models\FeatureFlag;
use Fleetbase\CityOS\Models\GovernanceAuthority;
use Fleetbase\CityOS\Models\Node;
use Fleetbase\CityOS\Models\Policy;
use Fleetbase\CityOS\Models\Portal;
use Fleetbase\CityOS\Models\Region;
use Fleetbase\CityOS\Models\Sector;
use Fleetbase\CityOS\Models\Store;
use Fleetbase\CityOS\Models\Tenant;
use Illuminate\Support\Str;

class CmsMappingService
{
    public function syncCountries(array $cmsCountries): array
    {
        $stats = ['created' => 0, 'updated' => 0, 'unchanged' => 0];

        foreach ($cmsCountries as $c) {
            $cmsId = $c['id'] ?? null;
            $code = $c['code'] ?? '';

            $existing = $cmsId
                ? (Country::where('cms_country_id', $cmsId)->first() ?? Country::where('code', $code)->whereNull('cms_country_id')->first())
                : Country::where('code', $code)->first();

            $region = null;
            if (!empty($c['region'])) {
                $regionRef = is_array($c['region']) ? ($c['region']['slug'] ?? $c['region']['code'] ?? '') : $c['region'];
                $region = Region::where('code', $regionRef)->orWhere('uuid', $regionRef)->first();
            }

            $data = [
                'code' => $code,
                'name' => $c['name'] ?? '',
                'name_ar' => $c['nameAr'] ?? $c['name_ar'] ?? null,
                'region_uuid' => $region?->uuid,
                'policies' => $c['policies'] ?? null,
                'settings' => $c['settings'] ?? null,
                'cms_country_id' => $cmsId,
                'status' => $c['status'] ?? 'active',
            ];

            if ($existing) {
                $existing->update($data);
                $stats['updated']++;
            } else {
                Country::create($data);
                $stats['created']++;
            }
        }

        return $stats;
    }

    public function syncGovernanceAuthorities(array $cmsAuthorities): array
    {
        $stats = ['created' => 0, 'updated' => 0, 'unchanged' => 0];

        foreach ($cmsAuthorities as $a) {
            $cmsId = $a['id'] ?? null;
            $code = $a['code'] ?? '';

            $existing = $cmsId
                ? (GovernanceAuthority::where('cms_authority_id', $cmsId)->first() ?? GovernanceAuthority::where('code', $code)->whereNull('cms_authority_id')->first())
                : GovernanceAuthority::where('code', $code)->first();

            $country = null;
            if (!empty($a['country'])) {
                $countryRef = is_array($a['country']) ? ($a['country']['code'] ?? '') : $a['country'];
                $country = Country::where('code', $countryRef)->orWhere('uuid', $countryRef)->first();
            }

            $parentAuth = null;
            if (!empty($a['parentAuthority'])) {
                $parentRef = is_array($a['parentAuthority']) ? ($a['parentAuthority']['code'] ?? '') : $a['parentAuthority'];
                $parentAuth = GovernanceAuthority::where('code', $parentRef)->orWhere('uuid', $parentRef)->first();
            }

            $data = [
                'cms_authority_id' => $cmsId,
                'code' => $code,
                'name' => $a['name'] ?? '',
                'name_ar' => $a['nameAr'] ?? $a['name_ar'] ?? null,
                'country_uuid' => $country?->uuid,
                'parent_authority_uuid' => $parentAuth?->uuid,
                'type' => $a['type'] ?? 'regulatory',
                'jurisdiction' => $a['jurisdiction'] ?? null,
                'mandates' => $a['mandates'] ?? null,
                'compliance_requirements' => $a['complianceRequirements'] ?? $a['compliance_requirements'] ?? null,
                'data_handling_rules' => $a['dataHandlingRules'] ?? $a['data_handling_rules'] ?? null,
                'status' => $a['status'] ?? 'active',
            ];

            if ($existing) {
                $existing->update($data);
                $stats['updated']++;
            } else {
                GovernanceAuthority::create($data);
                $stats['created']++;
            }
        }

        return $stats;
    }

    public function syncScopes(array $cmsScopes): array
    {
        $stats = ['created' => 0, 'updated' => 0, 'unchanged' => 0];

        foreach ($cmsScopes as $s) {
            $cmsId = $s['id'] ?? null;
            $slug = $s['slug'] ?? Str::slug($s['name'] ?? '');

            $existing = $cmsId
                ? (Sector::where('cms_scope_id', $cmsId)->first() ?? Sector::where('slug', $slug)->whereNull('cms_scope_id')->first())
                : Sector::where('slug', $slug)->first();

            $cityUuid = null;
            if (!empty($s['city'])) {
                $cityRef = is_array($s['city']) ? ($s['city']['slug'] ?? $s['city']['id'] ?? '') : $s['city'];
                $city = \Fleetbase\CityOS\Models\City::where('slug', $cityRef)->orWhere('uuid', $cityRef)->first();
                $cityUuid = $city?->uuid;
            }

            $data = [
                'cms_scope_id' => $cmsId,
                'slug' => $slug,
                'name' => $s['name'] ?? '',
                'name_ar' => $s['nameAr'] ?? $s['name_ar'] ?? null,
                'description' => $s['description'] ?? null,
                'city_uuid' => $cityUuid,
                'status' => $s['status'] ?? 'active',
            ];

            if ($existing) {
                $existing->update($data);
                $stats['updated']++;
            } else {
                Sector::create($data);
                $stats['created']++;
            }
        }

        return $stats;
    }

    public function syncCategories(array $cmsCategories): array
    {
        $stats = ['created' => 0, 'updated' => 0, 'unchanged' => 0];

        foreach ($cmsCategories as $cat) {
            $cmsId = $cat['id'] ?? null;
            $slug = $cat['slug'] ?? Str::slug($cat['name'] ?? '');

            $existing = $cmsId
                ? (Category::where('cms_category_id', $cmsId)->first() ?? Category::where('slug', $slug)->whereNull('parent_uuid')->whereNull('cms_category_id')->first())
                : Category::where('slug', $slug)->whereNull('parent_uuid')->first();

            $sectorUuid = null;
            if (!empty($cat['scope']) || !empty($cat['sector'])) {
                $scopeRef = $cat['scope'] ?? $cat['sector'] ?? null;
                if ($scopeRef) {
                    $scopeSlug = is_array($scopeRef) ? ($scopeRef['slug'] ?? $scopeRef['id'] ?? '') : $scopeRef;
                    $sector = Sector::where('cms_scope_id', $scopeSlug)->orWhere('slug', $scopeSlug)->orWhere('uuid', $scopeSlug)->first();
                    $sectorUuid = $sector?->uuid;
                }
            }

            $data = [
                'cms_category_id' => $cmsId,
                'slug' => $slug,
                'name' => $cat['name'] ?? '',
                'name_ar' => $cat['nameAr'] ?? $cat['name_ar'] ?? null,
                'description' => $cat['description'] ?? null,
                'sector_uuid' => $sectorUuid,
                'parent_uuid' => null,
                'level' => 0,
                'icon' => $cat['icon'] ?? null,
                'sort_order' => $cat['sortOrder'] ?? $cat['sort_order'] ?? 0,
                'status' => $cat['status'] ?? 'active',
            ];

            if ($existing) {
                $existing->update($data);
                $stats['updated']++;
            } else {
                Category::create($data);
                $stats['created']++;
            }
        }

        return $stats;
    }

    public function syncSubcategories(array $cmsSubcategories): array
    {
        $stats = ['created' => 0, 'updated' => 0, 'unchanged' => 0];

        foreach ($cmsSubcategories as $sub) {
            $cmsId = $sub['id'] ?? null;
            $slug = $sub['slug'] ?? Str::slug($sub['name'] ?? '');

            $existing = $cmsId
                ? (Category::where('cms_category_id', $cmsId)->first() ?? Category::where('slug', $slug)->whereNotNull('parent_uuid')->whereNull('cms_category_id')->first())
                : Category::where('slug', $slug)->whereNotNull('parent_uuid')->first();

            $parentUuid = null;
            if (!empty($sub['parent']) || !empty($sub['category'])) {
                $parentRef = $sub['parent'] ?? $sub['category'] ?? null;
                if ($parentRef) {
                    $parentSlug = is_array($parentRef) ? ($parentRef['slug'] ?? $parentRef['id'] ?? '') : $parentRef;
                    $parent = Category::where('cms_category_id', $parentSlug)->orWhere('slug', $parentSlug)->orWhere('uuid', $parentSlug)->first();
                    $parentUuid = $parent?->uuid;
                }
            }

            $data = [
                'cms_category_id' => $cmsId,
                'slug' => $slug,
                'name' => $sub['name'] ?? '',
                'name_ar' => $sub['nameAr'] ?? $sub['name_ar'] ?? null,
                'description' => $sub['description'] ?? null,
                'parent_uuid' => $parentUuid,
                'level' => 1,
                'icon' => $sub['icon'] ?? null,
                'sort_order' => $sub['sortOrder'] ?? $sub['sort_order'] ?? 0,
                'status' => $sub['status'] ?? 'active',
            ];

            if ($existing) {
                $existing->update($data);
                $stats['updated']++;
            } else {
                Category::create($data);
                $stats['created']++;
            }
        }

        return $stats;
    }

    public function syncTenants(array $cmsTenants): array
    {
        $stats = ['created' => 0, 'updated' => 0, 'unchanged' => 0];

        $tierOrder = ['MASTER' => 0, 'GLOBAL' => 1, 'REGIONAL' => 2, 'COUNTRY' => 3, 'CITY' => 4];
        usort($cmsTenants, function ($a, $b) use ($tierOrder) {
            return ($tierOrder[$a['tier'] ?? 'CITY'] ?? 99) - ($tierOrder[$b['tier'] ?? 'CITY'] ?? 99);
        });

        foreach ($cmsTenants as $t) {
            $cmsId = $t['id'] ?? null;
            $handle = $t['slug'] ?? $t['handle'] ?? '';

            $existing = $cmsId
                ? (Tenant::where('cms_tenant_id', $cmsId)->first() ?? Tenant::where('handle', $handle)->whereNull('cms_tenant_id')->first())
                : Tenant::where('handle', $handle)->first();

            $parentTenant = null;
            if (!empty($t['parentTenant'])) {
                $parentRef = is_array($t['parentTenant']) ? ($t['parentTenant']['slug'] ?? '') : $t['parentTenant'];
                $parentTenant = Tenant::where('handle', $parentRef)->orWhere('cms_tenant_id', $parentRef)->orWhere('uuid', $parentRef)->first();
            }

            $country = null;
            if (!empty($t['country'])) {
                $countryRef = is_array($t['country']) ? ($t['country']['code'] ?? '') : $t['country'];
                $country = Country::where('code', $countryRef)->orWhere('uuid', $countryRef)->first();
            }

            $region = null;
            if (!empty($t['region'])) {
                $regionRef = is_array($t['region']) ? ($t['region']['code'] ?? '') : $t['region'];
                $region = Region::where('code', $regionRef)->orWhere('uuid', $regionRef)->first();
            }

            $data = [
                'handle' => $handle,
                'name' => $t['name'] ?? '',
                'name_ar' => $t['nameAr'] ?? $t['name_ar'] ?? null,
                'cms_tenant_id' => $cmsId,
                'tenant_tier' => $t['tier'] ?? $t['tenant_tier'] ?? 'CITY',
                'parent_tenant_uuid' => $parentTenant?->uuid,
                'country_uuid' => $country?->uuid,
                'region_uuid' => $region?->uuid,
                'residency_zone' => $t['residencyZone'] ?? $t['residency_zone'] ?? null,
                'data_classification_default' => $t['classificationDefault'] ?? 'INTERNAL',
                'status' => $t['status'] ?? 'active',
                'domain' => $t['domain'] ?? null,
                'subdomain' => $t['subdomain'] ?? null,
            ];

            if ($existing) {
                $existing->update($data);
                $stats['updated']++;
            } else {
                Tenant::create($data);
                $stats['created']++;
            }
        }

        return $stats;
    }

    public function syncStores(array $cmsStores): array
    {
        $stats = ['created' => 0, 'updated' => 0, 'unchanged' => 0];

        foreach ($cmsStores as $s) {
            $cmsId = $s['id'] ?? null;
            $slug = $s['slug'] ?? Str::slug($s['name'] ?? '');

            $existing = $cmsId
                ? (Store::where('cms_store_id', $cmsId)->first() ?? Store::where('slug', $slug)->whereNull('cms_store_id')->first())
                : Store::where('slug', $slug)->first();

            $tenantUuid = null;
            if (!empty($s['tenant'])) {
                $tenantRef = is_array($s['tenant']) ? ($s['tenant']['slug'] ?? $s['tenant']['id'] ?? '') : $s['tenant'];
                $tenant = Tenant::where('handle', $tenantRef)->orWhere('cms_tenant_id', $tenantRef)->orWhere('uuid', $tenantRef)->first();
                $tenantUuid = $tenant?->uuid;
            }

            $portalUuid = null;
            if (!empty($s['portal'])) {
                $portalRef = is_array($s['portal']) ? ($s['portal']['slug'] ?? $s['portal']['id'] ?? '') : $s['portal'];
                $portal = Portal::where('slug', $portalRef)->orWhere('uuid', $portalRef)->first();
                $portalUuid = $portal?->uuid;
            }

            $countryUuid = null;
            if (!empty($s['country'])) {
                $countryRef = is_array($s['country']) ? ($s['country']['code'] ?? '') : $s['country'];
                $country = Country::where('code', $countryRef)->orWhere('uuid', $countryRef)->first();
                $countryUuid = $country?->uuid;
            }

            $data = [
                'cms_store_id' => $cmsId,
                'slug' => $slug,
                'name' => $s['name'] ?? '',
                'name_ar' => $s['nameAr'] ?? $s['name_ar'] ?? null,
                'type' => $s['type'] ?? 'retail',
                'tenant_uuid' => $tenantUuid,
                'portal_uuid' => $portalUuid,
                'country_uuid' => $countryUuid,
                'domain' => $s['domain'] ?? null,
                'subdomain' => $s['subdomain'] ?? null,
                'timezone' => $s['timezone'] ?? null,
                'locale' => $s['locale'] ?? null,
                'currency' => $s['currency'] ?? 'SAR',
                'status' => $s['status'] ?? 'active',
                'branding' => $s['branding'] ?? null,
                'settings' => $s['settings'] ?? null,
            ];

            if ($existing) {
                $existing->update($data);
                $stats['updated']++;
            } else {
                Store::create($data);
                $stats['created']++;
            }
        }

        return $stats;
    }

    public function syncPortals(array $cmsPortals): array
    {
        $stats = ['created' => 0, 'updated' => 0, 'unchanged' => 0];

        foreach ($cmsPortals as $p) {
            $cmsId = $p['id'] ?? null;
            $slug = $p['slug'] ?? Str::slug($p['name'] ?? '');

            $existing = $cmsId
                ? (Portal::where('cms_portal_id', $cmsId)->first() ?? Portal::where('slug', $slug)->whereNull('cms_portal_id')->first())
                : Portal::where('slug', $slug)->first();

            $tenantUuid = null;
            if (!empty($p['tenant'])) {
                $tenantRef = is_array($p['tenant']) ? ($p['tenant']['slug'] ?? $p['tenant']['id'] ?? '') : $p['tenant'];
                $tenant = Tenant::where('handle', $tenantRef)->orWhere('cms_tenant_id', $tenantRef)->orWhere('uuid', $tenantRef)->first();
                $tenantUuid = $tenant?->uuid;
            }

            $data = [
                'cms_portal_id' => $cmsId,
                'slug' => $slug,
                'name' => $p['name'] ?? '',
                'type' => $p['type'] ?? 'web',
                'tenant_uuid' => $tenantUuid,
                'domain' => $p['domain'] ?? null,
                'subdomain' => $p['subdomain'] ?? null,
                'path_prefix' => $p['pathPrefix'] ?? $p['path_prefix'] ?? null,
                'status' => $p['status'] ?? 'active',
                'payload_store_id' => $p['payloadStoreId'] ?? null,
                'branding' => $p['branding'] ?? null,
                'seo' => $p['seo'] ?? null,
                'config' => $p['config'] ?? null,
            ];

            if ($existing) {
                $existing->update($data);
                $stats['updated']++;
            } else {
                Portal::create($data);
                $stats['created']++;
            }
        }

        return $stats;
    }

    public function syncRegions(array $cmsRegions): array
    {
        $stats = ['created' => 0, 'updated' => 0, 'unchanged' => 0];

        foreach ($cmsRegions as $r) {
            $existing = Region::where('code', $r['code'] ?? $r['slug'] ?? '')->first();

            $data = [
                'code' => $r['code'] ?? strtoupper($r['slug'] ?? ''),
                'name' => $r['name'] ?? '',
                'name_ar' => $r['nameAr'] ?? $r['name_ar'] ?? null,
                'residency_zone' => $r['residencyZone'] ?? $r['residency_zone'] ?? 'GLOBAL',
                'data_residency_policy' => $r['policies']['dataResidency'] ?? $r['data_residency_policy'] ?? null,
                'compliance_policy' => $r['policies']['compliance'] ?? $r['compliance_policy'] ?? null,
                'classification_policy' => $r['policies']['classification'] ?? $r['classification_policy'] ?? null,
                'status' => $r['status'] ?? 'active',
            ];

            if ($existing) {
                $existing->update($data);
                $stats['updated']++;
            } else {
                Region::create($data);
                $stats['created']++;
            }
        }

        return $stats;
    }

    public function syncPolicies(array $cmsPolicies): array
    {
        $stats = ['created' => 0, 'updated' => 0, 'unchanged' => 0];

        foreach ($cmsPolicies as $p) {
            $existing = Policy::where('slug', $p['slug'] ?? '')->first();

            $authority = null;
            if (!empty($p['authority'])) {
                $authRef = is_array($p['authority']) ? ($p['authority']['code'] ?? '') : $p['authority'];
                $authority = GovernanceAuthority::where('code', $authRef)->orWhere('uuid', $authRef)->first();
            }

            $region = null;
            if (!empty($p['region'])) {
                $regionRef = is_array($p['region']) ? ($p['region']['code'] ?? '') : $p['region'];
                $region = Region::where('code', $regionRef)->orWhere('uuid', $regionRef)->first();
            }

            $country = null;
            if (!empty($p['country'])) {
                $countryRef = is_array($p['country']) ? ($p['country']['code'] ?? '') : $p['country'];
                $country = Country::where('code', $countryRef)->orWhere('uuid', $countryRef)->first();
            }

            $data = [
                'name' => $p['name'] ?? '',
                'slug' => $p['slug'] ?? Str::slug($p['name'] ?? ''),
                'type' => $p['type'] ?? 'compliance',
                'scope' => $p['scope'] ?? 'global',
                'priority' => $p['priority'] ?? 0,
                'policy_data' => $p['policyData'] ?? $p['policy_data'] ?? null,
                'enforced' => $p['enforced'] ?? false,
                'authority_uuid' => $authority?->uuid,
                'region_uuid' => $region?->uuid,
                'country_uuid' => $country?->uuid,
                'status' => $p['status'] ?? 'active',
            ];

            if ($existing) {
                $existing->update($data);
                $stats['updated']++;
            } else {
                Policy::create($data);
                $stats['created']++;
            }
        }

        return $stats;
    }

    public function syncNodes(array $cmsNodes): array
    {
        $stats = ['created' => 0, 'updated' => 0, 'unchanged' => 0];

        usort($cmsNodes, function ($a, $b) {
            $order = Node::HIERARCHY_ORDER;
            $aOrder = $order[$a['type'] ?? ''] ?? 99;
            $bOrder = $order[$b['type'] ?? ''] ?? 99;
            return $aOrder - $bOrder;
        });

        foreach ($cmsNodes as $n) {
            $existing = Node::where('cms_node_id', $n['id'] ?? '')
                ->orWhere('slug', $n['slug'] ?? '')
                ->first();

            $parentNode = null;
            if (!empty($n['parent'])) {
                $parentRef = is_array($n['parent']) ? ($n['parent']['id'] ?? $n['parent']['slug'] ?? '') : $n['parent'];
                $parentNode = Node::where('cms_node_id', $parentRef)->orWhere('slug', $parentRef)->orWhere('uuid', $parentRef)->first();
            }

            $country = null;
            if (!empty($n['country'])) {
                $countryRef = is_array($n['country']) ? ($n['country']['code'] ?? '') : $n['country'];
                $country = Country::where('code', $countryRef)->orWhere('uuid', $countryRef)->first();
            }

            $data = [
                'cms_node_id' => $n['id'] ?? null,
                'parent_uuid' => $parentNode?->uuid,
                'type' => $n['type'] ?? 'CITY',
                'name' => $n['name'] ?? '',
                'name_ar' => $n['nameAr'] ?? $n['name_ar'] ?? null,
                'slug' => $n['slug'] ?? Str::slug($n['name'] ?? ''),
                'code' => $n['code'] ?? null,
                'country_uuid' => $country?->uuid,
                'coordinates_lat' => $n['coordinates']['lat'] ?? $n['coordinates_lat'] ?? null,
                'coordinates_lng' => $n['coordinates']['lng'] ?? $n['coordinates_lng'] ?? null,
                'status' => $n['status'] ?? 'active',
                'depth' => Node::HIERARCHY_ORDER[$n['type'] ?? 'CITY'] ?? 0,
            ];

            if ($existing) {
                $existing->update($data);
                $stats['updated']++;
            } else {
                $node = Node::create($data);
                $node->update(['path' => $node->buildPath()]);
                $stats['created']++;
            }
        }

        return $stats;
    }

    public function syncFeatureFlags(array $cmsFlags): array
    {
        $stats = ['created' => 0, 'updated' => 0, 'unchanged' => 0];

        foreach ($cmsFlags as $f) {
            $existing = FeatureFlag::where('key', $f['key'] ?? '')->first();

            $data = [
                'key' => $f['key'] ?? '',
                'name' => $f['name'] ?? $f['key'] ?? '',
                'description' => $f['description'] ?? null,
                'enabled' => $f['enabled'] ?? false,
                'conditions' => $f['conditions'] ?? null,
                'status' => $f['status'] ?? 'active',
            ];

            if ($existing) {
                $existing->update($data);
                $stats['updated']++;
            } else {
                FeatureFlag::create($data);
                $stats['created']++;
            }
        }

        return $stats;
    }
}
