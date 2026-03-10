<?php

namespace Fleetbase\CityOS\Models;

use Fleetbase\Models\Model;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasPublicId;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Casts\Json;

class Sector extends Model
{
    use HasUuid, HasPublicId, HasApiModelBehavior;

    protected $table = 'cityos_sectors';
    protected $payloadKey = 'sector';
    protected $publicIdType = 'sector';

    protected $fillable = [
        'uuid',
        'cms_scope_id',
        'city_uuid',
        'slug',
        'name',
        'name_ar',
        'description',
        'status',
        'meta',
    ];

    protected $casts = [
        'meta' => Json::class,
    ];

    protected $searchableColumns = ['name', 'name_ar', 'slug'];

    protected $filterParams = ['city_uuid', 'status'];

    public function city()
    {
        return $this->belongsTo(City::class, 'city_uuid', 'uuid');
    }

    public function categories()
    {
        return $this->hasMany(Category::class, 'sector_uuid', 'uuid');
    }

    public function tenants()
    {
        return $this->hasMany(Tenant::class, 'sector_uuid', 'uuid');
    }
}
