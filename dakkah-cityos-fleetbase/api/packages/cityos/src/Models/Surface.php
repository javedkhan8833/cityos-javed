<?php

namespace Fleetbase\CityOS\Models;

use Fleetbase\Models\Model;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasPublicId;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Casts\Json;

class Surface extends Model
{
    use HasUuid, HasPublicId, HasApiModelBehavior;

    protected $table = 'cityos_surfaces';
    protected $payloadKey = 'surface';
    protected $publicIdType = 'surface';

    protected $fillable = [
        'uuid',
        'channel_uuid',
        'slug',
        'name',
        'type',
        'status',
        'theme_config',
        'meta',
    ];

    protected $casts = [
        'theme_config' => Json::class,
        'meta' => Json::class,
    ];

    protected $searchableColumns = ['name', 'slug'];

    protected $filterParams = ['channel_uuid', 'type', 'status'];

    public function channel()
    {
        return $this->belongsTo(Channel::class, 'channel_uuid', 'uuid');
    }

    public function portals()
    {
        return $this->hasMany(Portal::class, 'surface_uuid', 'uuid');
    }
}
