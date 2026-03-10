<?php

namespace Fleetbase\CityOS\Models;

use Fleetbase\Models\Model;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasPublicId;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Casts\Json;

class Policy extends Model
{
    use HasUuid, HasPublicId, HasApiModelBehavior;

    protected $table = 'cityos_policies';
    protected $payloadKey = 'policy';
    protected $publicIdType = 'policy';

    protected $fillable = [
        'uuid', 'authority_uuid', 'region_uuid', 'country_uuid', 'tenant_uuid',
        'name', 'slug', 'type', 'scope', 'priority', 'policy_data',
        'enforced', 'status', 'meta',
    ];

    protected $casts = [
        'policy_data' => Json::class,
        'meta' => Json::class,
        'enforced' => 'boolean',
        'priority' => 'integer',
    ];

    protected $searchableColumns = ['name', 'slug'];
    protected $filterParams = ['type', 'scope', 'enforced', 'status', 'authority_uuid', 'region_uuid', 'country_uuid', 'tenant_uuid'];

    const TYPE_DATA_RESIDENCY = 'data-residency';
    const TYPE_COMPLIANCE = 'compliance';
    const TYPE_SECURITY = 'security';
    const TYPE_OPERATIONAL = 'operational';
    const TYPE_CLASSIFICATION = 'classification';

    const SCOPE_GLOBAL = 'global';
    const SCOPE_REGIONAL = 'regional';
    const SCOPE_NATIONAL = 'national';
    const SCOPE_MUNICIPAL = 'municipal';
    const SCOPE_TENANT = 'tenant';

    public function authority()
    {
        return $this->belongsTo(GovernanceAuthority::class, 'authority_uuid', 'uuid');
    }

    public function region()
    {
        return $this->belongsTo(Region::class, 'region_uuid', 'uuid');
    }

    public function country()
    {
        return $this->belongsTo(Country::class, 'country_uuid', 'uuid');
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class, 'tenant_uuid', 'uuid');
    }

    public function isEnforced(): bool
    {
        return $this->enforced && $this->status === 'active';
    }
}
