<?php

namespace Fleetbase\CityOS\Models;

use Fleetbase\Models\Model;
use Fleetbase\Models\Company;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasPublicId;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Casts\Json;

class Tenant extends Model
{
    use HasUuid, HasPublicId, HasApiModelBehavior;

    protected $table = 'cityos_tenants';
    protected $payloadKey = 'tenant';
    protected $publicIdType = 'tenant';

    const TIER_MASTER = 'MASTER';
    const TIER_GLOBAL = 'GLOBAL';
    const TIER_REGIONAL = 'REGIONAL';
    const TIER_COUNTRY = 'COUNTRY';
    const TIER_CITY = 'CITY';

    const VALID_TIERS = [
        self::TIER_MASTER, self::TIER_GLOBAL, self::TIER_REGIONAL,
        self::TIER_COUNTRY, self::TIER_CITY,
    ];

    protected $fillable = [
        'uuid', 'company_uuid', 'country_uuid', 'city_uuid', 'sector_uuid',
        'category_uuid', 'parent_tenant_uuid', 'tenant_tier', 'region_uuid',
        'governance_authority_uuid', 'residency_zone', 'data_classification_default',
        'handle', 'name', 'name_ar', 'type', 'subscription_tier', 'status',
        'domain', 'subdomain', 'medusa_tenant_id', 'payload_tenant_id',
        'cms_tenant_id', 'erpnext_company', 'branding', 'settings', 'meta',
        'feature_flags',
    ];

    protected $casts = [
        'branding' => Json::class,
        'settings' => Json::class,
        'meta' => Json::class,
        'feature_flags' => Json::class,
    ];

    protected $searchableColumns = ['name', 'name_ar', 'handle'];

    protected $filterParams = [
        'company_uuid', 'country_uuid', 'city_uuid',
        'sector_uuid', 'category_uuid', 'status',
        'subscription_tier', 'type', 'tenant_tier',
        'parent_tenant_uuid', 'region_uuid',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class, 'company_uuid', 'uuid');
    }

    public function country()
    {
        return $this->belongsTo(Country::class, 'country_uuid', 'uuid');
    }

    public function city()
    {
        return $this->belongsTo(City::class, 'city_uuid', 'uuid');
    }

    public function sector()
    {
        return $this->belongsTo(Sector::class, 'sector_uuid', 'uuid');
    }

    public function category()
    {
        return $this->belongsTo(Category::class, 'category_uuid', 'uuid');
    }

    public function region()
    {
        return $this->belongsTo(Region::class, 'region_uuid', 'uuid');
    }

    public function governanceAuthority()
    {
        return $this->belongsTo(GovernanceAuthority::class, 'governance_authority_uuid', 'uuid');
    }

    public function parentTenant()
    {
        return $this->belongsTo(self::class, 'parent_tenant_uuid', 'uuid');
    }

    public function childTenants()
    {
        return $this->hasMany(self::class, 'parent_tenant_uuid', 'uuid');
    }

    public function channels()
    {
        return $this->hasMany(Channel::class, 'tenant_uuid', 'uuid');
    }

    public function portals()
    {
        return $this->hasMany(Portal::class, 'tenant_uuid', 'uuid');
    }

    public function policies()
    {
        return $this->hasMany(Policy::class, 'tenant_uuid', 'uuid');
    }

    public function getAncestryChain(): array
    {
        $chain = [$this->handle ?? $this->uuid];
        $current = $this;
        while ($current->parentTenant) {
            $current = $current->parentTenant;
            array_unshift($chain, $current->handle ?? $current->uuid);
        }
        return $chain;
    }

    public function getAncestryTenants(): array
    {
        $tenants = [$this];
        $current = $this;
        while ($current->parentTenant) {
            $current = $current->parentTenant;
            array_unshift($tenants, $current);
        }
        return $tenants;
    }

    public function isMaster(): bool
    {
        return $this->tenant_tier === self::TIER_MASTER;
    }

    public function isGlobal(): bool
    {
        return $this->tenant_tier === self::TIER_GLOBAL;
    }

    public function getNodeContext(): array
    {
        return [
            'country' => $this->country?->code ?? '',
            'cityOrTheme' => $this->city?->slug ?? '',
            'sector' => $this->sector?->slug ?? '',
            'category' => $this->category?->slug ?? '',
            'subcategory' => $this->category?->parent ? $this->category->slug : '',
            'tenant' => $this->handle ?? $this->uuid,
            'brand' => $this->branding['name'] ?? $this->name,
            'locale' => $this->country?->default_locale ?? 'ar-SA',
            'processingRegion' => $this->country?->processing_region ?? 'me-central-1',
            'residencyClass' => $this->residency_zone ?? $this->country?->residency_class ?? 'sovereign',
        ];
    }
}
