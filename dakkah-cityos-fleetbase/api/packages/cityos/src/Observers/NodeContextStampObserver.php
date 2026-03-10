<?php

namespace Fleetbase\CityOS\Observers;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;
use Fleetbase\CityOS\Support\NodeContext;
use Fleetbase\CityOS\Models\Tenant;

class NodeContextStampObserver
{
    protected static array $columnCache = [];

    protected static function hasColumn(string $table, string $column): bool
    {
        $key = "{$table}.{$column}";
        if (!isset(static::$columnCache[$key])) {
            static::$columnCache[$key] = Schema::hasColumn($table, $column);
        }
        return static::$columnCache[$key];
    }

    public function creating(Model $model): void
    {
        $this->stampNodeContext($model);
    }

    public function updating(Model $model): void
    {
        $this->stampNodeContext($model);
    }

    protected function stampNodeContext(Model $model): void
    {
        $nodeContext = request()?->attributes?->get('node_context');
        $table = $model->getTable();

        if (!static::hasColumn($table, 'tenant_uuid')) {
            return;
        }

        if ($nodeContext && $nodeContext instanceof NodeContext) {
            $tenant = $nodeContext->resolveTenant();

            if (empty($model->tenant_uuid) && $tenant) {
                $model->setAttribute('tenant_uuid', $tenant->uuid);
            }

            if (empty($model->country_code) && !empty($nodeContext->country) && static::hasColumn($table, 'country_code')) {
                $countryCode = $this->resolveCountryCode($nodeContext->country);
                if ($countryCode) {
                    $model->setAttribute('country_code', $countryCode);
                }
            }

            if (empty($model->city_uuid) && $tenant?->city_uuid && static::hasColumn($table, 'city_uuid')) {
                $model->setAttribute('city_uuid', $tenant->city_uuid);
            }

            if (empty($model->sector_uuid) && $tenant?->sector_uuid && static::hasColumn($table, 'sector_uuid')) {
                $model->setAttribute('sector_uuid', $tenant->sector_uuid);
            }

            return;
        }

        if (empty($model->tenant_uuid) && !empty($model->company_uuid)) {
            $this->stampFromCompany($model);
        }
    }

    protected function stampFromCompany(Model $model): void
    {
        $table = $model->getTable();

        $tenants = Tenant::where('company_uuid', $model->company_uuid)->get();
        if ($tenants->isEmpty()) {
            return;
        }

        $tenant = $tenants->count() === 1
            ? $tenants->first()
            : ($tenants->firstWhere('tenant_tier', Tenant::TIER_MASTER)
                ?? $tenants->firstWhere('tenant_tier', Tenant::TIER_GLOBAL)
                ?? $tenants->firstWhere('tenant_tier', Tenant::TIER_COUNTRY)
                ?? $tenants->first());

        if (!$tenant) {
            return;
        }

        $model->setAttribute('tenant_uuid', $tenant->uuid);

        if (static::hasColumn($table, 'country_code') && empty($model->country_code)) {
            $country = $tenant->country;
            if ($country) {
                $model->setAttribute('country_code', $country->code);
            }
        }

        if (static::hasColumn($table, 'city_uuid') && empty($model->city_uuid)) {
            $model->setAttribute('city_uuid', $tenant->city_uuid);
        }

        if (static::hasColumn($table, 'sector_uuid') && empty($model->sector_uuid)) {
            $model->setAttribute('sector_uuid', $tenant->sector_uuid);
        }
    }

    protected function resolveCountryCode(string $countryInput): ?string
    {
        if (strlen($countryInput) === 2) {
            return strtoupper($countryInput);
        }

        $country = \Fleetbase\CityOS\Models\Country::where('name', $countryInput)
            ->orWhere('name_ar', $countryInput)
            ->orWhere('code', $countryInput)
            ->first();

        return $country ? $country->code : null;
    }
}
