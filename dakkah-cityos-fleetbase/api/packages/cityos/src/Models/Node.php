<?php

namespace Fleetbase\CityOS\Models;

use Fleetbase\Models\Model;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasPublicId;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Casts\Json;

class Node extends Model
{
    use HasUuid, HasPublicId, HasApiModelBehavior;

    protected $table = 'cityos_nodes';
    protected $payloadKey = 'node';
    protected $publicIdType = 'node';

    protected $fillable = [
        'uuid', 'parent_uuid', 'cms_node_id', 'type', 'name', 'name_ar',
        'slug', 'code', 'country_uuid', 'city_uuid',
        'coordinates_lat', 'coordinates_lng', 'coordinates_alt',
        'status', 'depth', 'path', 'stewardship_state',
        'stewardship_tenant_uuid', 'meta',
    ];

    protected $casts = [
        'meta' => Json::class,
        'coordinates_lat' => 'float',
        'coordinates_lng' => 'float',
        'coordinates_alt' => 'float',
        'depth' => 'integer',
    ];

    protected $searchableColumns = ['name', 'name_ar', 'slug', 'code'];
    protected $filterParams = ['type', 'status', 'country_uuid', 'city_uuid', 'parent_uuid', 'stewardship_state'];

    const TYPE_GLOBAL = 'GLOBAL';
    const TYPE_CONTINENT = 'CONTINENT';
    const TYPE_REGION = 'REGION';
    const TYPE_COUNTRY = 'COUNTRY';
    const TYPE_CITY = 'CITY';
    const TYPE_DISTRICT = 'DISTRICT';
    const TYPE_ZONE = 'ZONE';
    const TYPE_FACILITY = 'FACILITY';
    const TYPE_ASSET = 'ASSET';

    const VALID_TYPES = [
        self::TYPE_GLOBAL, self::TYPE_CONTINENT, self::TYPE_REGION,
        self::TYPE_COUNTRY, self::TYPE_CITY, self::TYPE_DISTRICT,
        self::TYPE_ZONE, self::TYPE_FACILITY, self::TYPE_ASSET,
    ];

    const HIERARCHY_ORDER = [
        self::TYPE_GLOBAL => 0,
        self::TYPE_CONTINENT => 1,
        self::TYPE_REGION => 2,
        self::TYPE_COUNTRY => 3,
        self::TYPE_CITY => 4,
        self::TYPE_DISTRICT => 5,
        self::TYPE_ZONE => 6,
        self::TYPE_FACILITY => 7,
        self::TYPE_ASSET => 8,
    ];

    const VALID_PARENT_TYPES = [
        self::TYPE_GLOBAL => [],
        self::TYPE_CONTINENT => [self::TYPE_GLOBAL],
        self::TYPE_REGION => [self::TYPE_CONTINENT],
        self::TYPE_COUNTRY => [self::TYPE_REGION],
        self::TYPE_CITY => [self::TYPE_COUNTRY],
        self::TYPE_DISTRICT => [self::TYPE_CITY],
        self::TYPE_ZONE => [self::TYPE_DISTRICT],
        self::TYPE_FACILITY => [self::TYPE_ZONE, self::TYPE_DISTRICT, self::TYPE_CITY],
        self::TYPE_ASSET => [self::TYPE_FACILITY],
    ];

    const STEWARDSHIP_STATES = ['unclaimed', 'claim-pending', 'claimed', 'disputed', 'reverted'];

    const STEWARDSHIP_TRANSITIONS = [
        'unclaimed' => ['claim-pending'],
        'claim-pending' => ['claimed', 'unclaimed'],
        'claimed' => ['disputed'],
        'disputed' => ['claimed', 'reverted'],
        'reverted' => ['claim-pending', 'unclaimed'],
    ];

    public function parent()
    {
        return $this->belongsTo(self::class, 'parent_uuid', 'uuid');
    }

    public function children()
    {
        return $this->hasMany(self::class, 'parent_uuid', 'uuid');
    }

    public function country()
    {
        return $this->belongsTo(Country::class, 'country_uuid', 'uuid');
    }

    public function city()
    {
        return $this->belongsTo(City::class, 'city_uuid', 'uuid');
    }

    public function stewardshipTenant()
    {
        return $this->belongsTo(Tenant::class, 'stewardship_tenant_uuid', 'uuid');
    }

    public function validateParentType(): bool
    {
        if (!$this->parent_uuid) {
            return $this->type === self::TYPE_GLOBAL;
        }

        $parent = $this->parent;
        if (!$parent) {
            return false;
        }

        $validParents = self::VALID_PARENT_TYPES[$this->type] ?? [];
        return in_array($parent->type, $validParents);
    }

    public function canTransitionStewardship(string $newState): bool
    {
        $current = $this->stewardship_state ?? 'unclaimed';
        $allowed = self::STEWARDSHIP_TRANSITIONS[$current] ?? [];
        return in_array($newState, $allowed);
    }

    public function getAncestryPath(): array
    {
        $path = [$this];
        $current = $this;
        while ($current->parent) {
            $current = $current->parent;
            array_unshift($path, $current);
        }
        return $path;
    }

    public function getDepthFromRoot(): int
    {
        return self::HIERARCHY_ORDER[$this->type] ?? 0;
    }

    public function buildPath(): string
    {
        return collect($this->getAncestryPath())->pluck('slug')->implode('/');
    }
}
