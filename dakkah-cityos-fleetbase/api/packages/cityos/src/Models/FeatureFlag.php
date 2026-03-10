<?php

namespace Fleetbase\CityOS\Models;

use Fleetbase\Models\Model;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasPublicId;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Casts\Json;

class FeatureFlag extends Model
{
    use HasUuid, HasPublicId, HasApiModelBehavior;

    protected $table = 'cityos_feature_flags';
    protected $payloadKey = 'feature_flag';
    protected $publicIdType = 'ff';

    protected $fillable = [
        'uuid', 'key', 'name', 'description', 'enabled',
        'conditions', 'status', 'meta',
    ];

    protected $casts = [
        'conditions' => Json::class,
        'meta' => Json::class,
        'enabled' => 'boolean',
    ];

    protected $searchableColumns = ['name', 'key'];
    protected $filterParams = ['key', 'enabled', 'status'];

    public function evaluate(?string $tenantTier = null, ?string $nodeType = null, array $userRoles = []): bool
    {
        if (!$this->enabled || $this->status !== 'active') {
            return false;
        }

        $conditions = $this->conditions ?? [];
        if (empty($conditions)) {
            return true;
        }

        if (!empty($conditions['tenant_tiers']) && $tenantTier) {
            if (!in_array($tenantTier, $conditions['tenant_tiers'])) {
                return false;
            }
        }

        if (!empty($conditions['node_types']) && $nodeType) {
            if (!in_array($nodeType, $conditions['node_types'])) {
                return false;
            }
        }

        if (!empty($conditions['roles']) && !empty($userRoles)) {
            if (empty(array_intersect($conditions['roles'], $userRoles))) {
                return false;
            }
        }

        if (isset($conditions['percentage'])) {
            $hash = crc32($tenantTier . $nodeType . implode(',', $userRoles));
            if (abs($hash % 100) >= $conditions['percentage']) {
                return false;
            }
        }

        return true;
    }
}
