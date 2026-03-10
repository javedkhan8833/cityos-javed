<?php

namespace Fleetbase\CityOS\Models;

use Fleetbase\Models\Model;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasPublicId;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Casts\Json;

class Store extends Model
{
    use HasUuid, HasPublicId, HasApiModelBehavior;

    protected $table = 'cityos_stores';
    protected $payloadKey = 'store';
    protected $publicIdType = 'store';

    protected $fillable = [
        'uuid',
        'cms_store_id',
        'tenant_uuid',
        'portal_uuid',
        'country_uuid',
        'slug',
        'name',
        'name_ar',
        'type',
        'domain',
        'subdomain',
        'timezone',
        'locale',
        'currency',
        'status',
        'branding',
        'settings',
        'meta',
    ];

    protected $casts = [
        'branding' => Json::class,
        'settings' => Json::class,
        'meta' => Json::class,
    ];

    protected $searchableColumns = ['name', 'name_ar', 'slug', 'domain'];

    protected $filterParams = ['tenant_uuid', 'portal_uuid', 'country_uuid', 'type', 'status'];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class, 'tenant_uuid', 'uuid');
    }

    public function portal()
    {
        return $this->belongsTo(Portal::class, 'portal_uuid', 'uuid');
    }

    public function country()
    {
        return $this->belongsTo(Country::class, 'country_uuid', 'uuid');
    }
}
