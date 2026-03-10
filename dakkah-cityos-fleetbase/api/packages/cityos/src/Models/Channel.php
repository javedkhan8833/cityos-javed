<?php

namespace Fleetbase\CityOS\Models;

use Fleetbase\Models\Model;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasPublicId;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Casts\Json;

class Channel extends Model
{
    use HasUuid, HasPublicId, HasApiModelBehavior;

    protected $table = 'cityos_channels';
    protected $payloadKey = 'channel';
    protected $publicIdType = 'channel';

    protected $fillable = [
        'uuid',
        'tenant_uuid',
        'slug',
        'name',
        'type',
        'status',
        'medusa_sales_channel_id',
        'config',
        'meta',
    ];

    protected $casts = [
        'config' => Json::class,
        'meta' => Json::class,
    ];

    protected $searchableColumns = ['name', 'slug'];

    protected $filterParams = ['tenant_uuid', 'type', 'status'];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class, 'tenant_uuid', 'uuid');
    }

    public function surfaces()
    {
        return $this->hasMany(Surface::class, 'channel_uuid', 'uuid');
    }
}
