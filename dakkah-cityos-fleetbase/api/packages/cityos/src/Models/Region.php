<?php

namespace Fleetbase\CityOS\Models;

use Fleetbase\Models\Model;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasPublicId;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Casts\Json;

class Region extends Model
{
    use HasUuid, HasPublicId, HasApiModelBehavior;

    protected $table = 'cityos_regions';
    protected $payloadKey = 'region';
    protected $publicIdType = 'region';

    protected $fillable = [
        'uuid', 'code', 'name', 'name_ar', 'residency_zone',
        'data_residency_policy', 'compliance_policy', 'classification_policy',
        'status', 'meta',
    ];

    protected $casts = [
        'data_residency_policy' => Json::class,
        'compliance_policy' => Json::class,
        'classification_policy' => Json::class,
        'meta' => Json::class,
    ];

    protected $searchableColumns = ['name', 'name_ar', 'code'];
    protected $filterParams = ['code', 'residency_zone', 'status'];

    public function countries()
    {
        return $this->hasMany(Country::class, 'region_uuid', 'uuid');
    }

    public function policies()
    {
        return $this->hasMany(Policy::class, 'region_uuid', 'uuid');
    }

    public function tenants()
    {
        return $this->hasMany(Tenant::class, 'region_uuid', 'uuid');
    }
}
