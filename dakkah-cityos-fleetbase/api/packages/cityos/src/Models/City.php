<?php

namespace Fleetbase\CityOS\Models;

use Fleetbase\Models\Model;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasPublicId;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Casts\Json;

class City extends Model
{
    use HasUuid, HasPublicId, HasApiModelBehavior;

    protected $table = 'cityos_cities';
    protected $payloadKey = 'city';
    protected $publicIdType = 'city';

    protected $fillable = [
        'uuid',
        'country_uuid',
        'slug',
        'name',
        'name_ar',
        'theme',
        'timezone',
        'status',
        'geo_boundary',
        'meta',
    ];

    protected $casts = [
        'geo_boundary' => Json::class,
        'meta' => Json::class,
    ];

    protected $searchableColumns = ['name', 'name_ar', 'slug'];

    protected $filterParams = ['country_uuid', 'status'];

    public function country()
    {
        return $this->belongsTo(Country::class, 'country_uuid', 'uuid');
    }

    public function sectors()
    {
        return $this->hasMany(Sector::class, 'city_uuid', 'uuid');
    }

    public function tenants()
    {
        return $this->hasMany(Tenant::class, 'city_uuid', 'uuid');
    }
}
