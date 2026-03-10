<?php

namespace Fleetbase\CityOS\Models;

use Fleetbase\Models\Model;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasPublicId;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Casts\Json;

class Portal extends Model
{
    use HasUuid, HasPublicId, HasApiModelBehavior;

    protected $table = 'cityos_portals';
    protected $payloadKey = 'portal';
    protected $publicIdType = 'portal';

    protected $fillable = [
        'uuid',
        'cms_portal_id',
        'tenant_uuid',
        'surface_uuid',
        'slug',
        'name',
        'type',
        'domain',
        'subdomain',
        'path_prefix',
        'status',
        'payload_store_id',
        'medusa_store_id',
        'branding',
        'seo',
        'config',
        'meta',
    ];

    protected $casts = [
        'branding' => Json::class,
        'seo' => Json::class,
        'config' => Json::class,
        'meta' => Json::class,
    ];

    protected $searchableColumns = ['name', 'slug', 'domain', 'subdomain'];

    protected $filterParams = ['tenant_uuid', 'surface_uuid', 'type', 'status'];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class, 'tenant_uuid', 'uuid');
    }

    public function surface()
    {
        return $this->belongsTo(Surface::class, 'surface_uuid', 'uuid');
    }
}
