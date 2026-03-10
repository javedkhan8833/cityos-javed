<?php

namespace Fleetbase\CityOS\Services;

use Fleetbase\CityOS\Models\FeatureFlag;

class FeatureGateService
{
    protected array $cache = [];
    protected ?float $cacheTimestamp = null;
    protected float $cacheTtl = 60.0;

    public function isEnabled(string $featureKey, ?string $tenantTier = null, ?string $nodeType = null, array $userRoles = []): bool
    {
        if ($this->cacheTimestamp !== null && (microtime(true) - $this->cacheTimestamp) > $this->cacheTtl) {
            $this->cache = [];
            $this->cacheTimestamp = null;
        }

        $cacheKey = $featureKey . ':' . ($tenantTier ?? '') . ':' . ($nodeType ?? '') . ':' . implode(',', $userRoles);

        if (isset($this->cache[$cacheKey])) {
            return $this->cache[$cacheKey];
        }

        $flag = FeatureFlag::where('key', $featureKey)->where('status', 'active')->first();

        if (!$flag) {
            $this->cache[$cacheKey] = true;
            $this->cacheTimestamp = $this->cacheTimestamp ?? microtime(true);
            return true;
        }

        $result = $flag->evaluate($tenantTier, $nodeType, $userRoles);
        $this->cache[$cacheKey] = $result;
        $this->cacheTimestamp = $this->cacheTimestamp ?? microtime(true);

        return $result;
    }

    public function getAllFlags(): array
    {
        return FeatureFlag::where('status', 'active')
            ->get()
            ->mapWithKeys(function ($flag) {
                return [$flag->key => $flag->enabled];
            })
            ->toArray();
    }

    public function evaluateForContext(string $tenantTier, ?string $nodeType = null, array $userRoles = []): array
    {
        $flags = FeatureFlag::where('status', 'active')->get();
        $result = [];

        foreach ($flags as $flag) {
            $result[$flag->key] = $flag->evaluate($tenantTier, $nodeType, $userRoles);
        }

        return $result;
    }

    public function clearCache(): void
    {
        $this->cache = [];
        $this->cacheTimestamp = null;
    }

    public static function resetCache(): void
    {
        $instance = app(static::class);
        $instance->clearCache();
    }
}
