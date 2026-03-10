<?php

namespace Fleetbase\CityOS\Models;

use Fleetbase\Models\Model;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasPublicId;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Casts\Json;

class GovernanceAuthority extends Model
{
    use HasUuid, HasPublicId, HasApiModelBehavior;

    protected $table = 'cityos_governance_authorities';
    protected $payloadKey = 'governance_authority';
    protected $publicIdType = 'gov_auth';

    protected $fillable = [
        'uuid', 'cms_authority_id', 'country_uuid', 'parent_authority_uuid', 'code', 'name', 'name_ar',
        'type', 'jurisdiction', 'mandates', 'compliance_requirements',
        'data_handling_rules', 'status', 'meta',
    ];

    protected $casts = [
        'jurisdiction' => Json::class,
        'mandates' => Json::class,
        'compliance_requirements' => Json::class,
        'data_handling_rules' => Json::class,
        'meta' => Json::class,
    ];

    protected $searchableColumns = ['name', 'name_ar', 'code'];
    protected $filterParams = ['country_uuid', 'type', 'status'];

    public function country()
    {
        return $this->belongsTo(Country::class, 'country_uuid', 'uuid');
    }

    public function parentAuthority()
    {
        return $this->belongsTo(self::class, 'parent_authority_uuid', 'uuid');
    }

    public function childAuthorities()
    {
        return $this->hasMany(self::class, 'parent_authority_uuid', 'uuid');
    }

    public function policies()
    {
        return $this->hasMany(Policy::class, 'authority_uuid', 'uuid');
    }

    public function getAncestryChain(): array
    {
        $chain = [$this->toArray()];
        $current = $this;
        while ($current->parentAuthority) {
            $current = $current->parentAuthority;
            array_unshift($chain, $current->toArray());
        }
        return $chain;
    }
}
