<?php

namespace Fleetbase\CityOS\Http\Controllers;

use Fleetbase\CityOS\Models\Tenant;
use Illuminate\Http\Request;

class TenantController extends CityOSResourceController
{
    public $resource = 'tenant';

    public function getNodeContext(string $id)
    {
        $tenant = Tenant::where('uuid', $id)
            ->orWhere('public_id', $id)
            ->orWhere('handle', $id)
            ->firstOrFail();

        return response()->json([
            'node_context' => $tenant->getNodeContext(),
            'tenant' => $tenant->toArray(),
        ]);
    }
}
