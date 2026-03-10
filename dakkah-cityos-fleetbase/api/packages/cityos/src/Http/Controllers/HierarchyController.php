<?php

namespace Fleetbase\CityOS\Http\Controllers;

use Fleetbase\CityOS\Models\Country;
use Fleetbase\CityOS\Models\City;
use Fleetbase\CityOS\Models\Sector;
use Fleetbase\CityOS\Models\Category;
use Fleetbase\CityOS\Models\Tenant;
use Fleetbase\CityOS\Models\Channel;
use Fleetbase\CityOS\Models\Surface;
use Fleetbase\CityOS\Models\Portal;
use Fleetbase\CityOS\Support\NodeContext;
use Fleetbase\Http\Controllers\Controller;
use Illuminate\Http\Request;

class HierarchyController extends Controller
{
    public function tree(Request $request)
    {
        $countries = Country::with([
            'cities.sectors.categories.children',
        ])->where('status', 'active')->get();

        return response()->json([
            'hierarchy' => $countries->map(function ($country) {
                return [
                    'uuid' => $country->uuid,
                    'type' => 'country',
                    'code' => $country->code,
                    'name' => $country->name,
                    'name_ar' => $country->name_ar,
                    'children' => $country->cities->map(function ($city) {
                        return [
                            'uuid' => $city->uuid,
                            'type' => 'city',
                            'slug' => $city->slug,
                            'name' => $city->name,
                            'name_ar' => $city->name_ar,
                            'children' => $city->sectors->map(function ($sector) {
                                return [
                                    'uuid' => $sector->uuid,
                                    'type' => 'sector',
                                    'slug' => $sector->slug,
                                    'name' => $sector->name,
                                    'name_ar' => $sector->name_ar,
                                    'children' => $sector->categories->where('parent_uuid', null)->map(function ($category) {
                                        return $this->buildCategoryNode($category);
                                    })->values(),
                                ];
                            }),
                        ];
                    }),
                ];
            }),
        ]);
    }

    private function buildCategoryNode($category): array
    {
        return [
            'uuid' => $category->uuid,
            'type' => $category->parent_uuid ? 'subcategory' : 'category',
            'slug' => $category->slug,
            'name' => $category->name,
            'name_ar' => $category->name_ar,
            'level' => $category->level,
            'children' => $category->children->map(function ($child) {
                return $this->buildCategoryNode($child);
            })->values(),
        ];
    }

    public function resolve(Request $request)
    {
        $nodeContext = $request->attributes->get('node_context');
        if (!$nodeContext instanceof NodeContext) {
            $nodeContext = NodeContext::fromRequest($request);
        }

        $tenant = $nodeContext->resolveTenant();

        return response()->json([
            'node_context' => $nodeContext->toArray(),
            'tenant' => $tenant?->toArray(),
            'valid' => $nodeContext->isValid(),
        ]);
    }

    public function stats(Request $request)
    {
        return response()->json([
            'counts' => [
                'countries' => Country::count(),
                'cities' => City::count(),
                'sectors' => Sector::count(),
                'categories' => Category::count(),
                'tenants' => Tenant::count(),
                'channels' => Channel::count(),
                'surfaces' => Surface::count(),
                'portals' => Portal::count(),
            ],
        ]);
    }
}
