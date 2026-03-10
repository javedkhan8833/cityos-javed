<?php

namespace Fleetbase\CityOS\Models;

use Fleetbase\Models\Model;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasPublicId;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Casts\Json;

class Country extends Model
{
    use HasUuid, HasPublicId, HasApiModelBehavior;

    protected $table = 'cityos_countries';
    protected $payloadKey = 'country';
    protected $publicIdType = 'country';

    protected $fillable = [
        'uuid', 'code', 'region_uuid', 'name', 'name_ar', 'currency_code',
        'default_locale', 'processing_region', 'residency_class',
        'policies', 'settings', 'cms_country_id', 'status', 'meta',
    ];

    protected $casts = [
        'meta' => Json::class,
        'policies' => Json::class,
        'settings' => Json::class,
    ];

    protected $searchableColumns = ['name', 'name_ar', 'code'];
    protected $filterParams = ['code', 'status', 'region_uuid'];

    public function region()
    {
        return $this->belongsTo(Region::class, 'region_uuid', 'uuid');
    }

    public function cities()
    {
        return $this->hasMany(City::class, 'country_uuid', 'uuid');
    }

    public function tenants()
    {
        return $this->hasMany(Tenant::class, 'country_uuid', 'uuid');
    }

    public function governanceAuthorities()
    {
        return $this->hasMany(GovernanceAuthority::class, 'country_uuid', 'uuid');
    }

    public function countryPolicies()
    {
        return $this->hasMany(Policy::class, 'country_uuid', 'uuid');
    }
}
