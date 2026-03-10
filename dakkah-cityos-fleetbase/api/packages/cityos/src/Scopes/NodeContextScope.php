<?php

namespace Fleetbase\CityOS\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Schema;
use Fleetbase\CityOS\Support\NodeContext;

class NodeContextScope implements Scope
{
    protected static array $columnCache = [];

    public function apply(Builder $builder, Model $model): void
    {
        if (!config('cityos.scoping.enabled', true)) {
            return;
        }

        $nodeContext = request()?->attributes?->get('node_context');

        if ($nodeContext && $nodeContext instanceof NodeContext && $nodeContext->isExplicitTenantInvalid()) {
            $builder->whereRaw('1 = 0');
            return;
        }

        $tenant = null;
        if ($nodeContext && $nodeContext instanceof NodeContext && !empty($nodeContext->tenant)) {
            $tenant = $nodeContext->resolveTenant();
        }

        if (!$tenant) {
            $table = $model->getTable();
            $cacheKey = "{$table}.company_uuid";
            if (!isset(static::$columnCache[$cacheKey])) {
                static::$columnCache[$cacheKey] = Schema::hasColumn($table, 'company_uuid');
            }
            if (static::$columnCache[$cacheKey]) {
                $user = request()?->user();
                if ($user && !empty($user->company_uuid)) {
                    $builder->where($model->qualifyColumn('company_uuid'), $user->company_uuid);
                }
            }
            return;
        }

        $table = $model->getTable();
        $cacheKey = "{$table}.tenant_uuid";
        if (!isset(static::$columnCache[$cacheKey])) {
            static::$columnCache[$cacheKey] = Schema::hasColumn($table, 'tenant_uuid');
        }

        if (static::$columnCache[$cacheKey]) {
            if (config('cityos.scoping.ancestry_visibility', true)) {
                $tenantUuids = $this->getVisibleTenantUuids($tenant);
                $builder->whereIn($model->qualifyColumn('tenant_uuid'), $tenantUuids);
            } else {
                $builder->where($model->qualifyColumn('tenant_uuid'), $tenant->uuid);
            }
        }
    }

    protected function getVisibleTenantUuids($tenant): array
    {
        $uuids = [$tenant->uuid];
        $visited = [$tenant->uuid => true];

        $this->collectDescendantUuids($tenant, $uuids, $visited);

        return $uuids;
    }

    protected function collectDescendantUuids($tenant, array &$uuids, array &$visited, int $depth = 0): void
    {
        if ($depth > 5) {
            return;
        }

        $children = $tenant->childTenants()->get(['uuid']);

        foreach ($children as $child) {
            if (isset($visited[$child->uuid])) {
                continue;
            }

            $visited[$child->uuid] = true;
            $uuids[] = $child->uuid;
            $this->collectDescendantUuids($child, $uuids, $visited, $depth + 1);
        }
    }
}
