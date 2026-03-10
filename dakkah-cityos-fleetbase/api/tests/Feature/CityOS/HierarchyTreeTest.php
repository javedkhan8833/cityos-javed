<?php

namespace Tests\Feature\CityOS;

use Tests\TestCase;

class HierarchyTreeTest extends TestCase
{
    public function test_hierarchy_tree_returns_countries()
    {
        $response = $this->getJson('/cityos/v1/hierarchy/tree');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'hierarchy' => [
                '*' => [
                    'uuid',
                    'type',
                    'code',
                    'name',
                    'name_ar',
                    'children',
                ],
            ],
        ]);
    }

    public function test_hierarchy_tree_contains_two_countries()
    {
        $response = $this->getJson('/cityos/v1/hierarchy/tree');

        $response->assertStatus(200);
        $data = $response->json('hierarchy');
        $this->assertCount(2, $data);
    }

    public function test_hierarchy_tree_contains_sa_and_ae()
    {
        $response = $this->getJson('/cityos/v1/hierarchy/tree');

        $response->assertStatus(200);
        $data = $response->json('hierarchy');
        $codes = collect($data)->pluck('code')->sort()->values()->toArray();
        $this->assertEquals(['AE', 'SA'], $codes);
    }

    public function test_hierarchy_tree_countries_have_cities()
    {
        $response = $this->getJson('/cityos/v1/hierarchy/tree');

        $response->assertStatus(200);
        $data = $response->json('hierarchy');

        foreach ($data as $country) {
            $this->assertArrayHasKey('children', $country);
            $this->assertIsArray($country['children']);
            $this->assertNotEmpty($country['children']);
        }
    }

    public function test_hierarchy_tree_cities_have_correct_type()
    {
        $response = $this->getJson('/cityos/v1/hierarchy/tree');

        $response->assertStatus(200);
        $data = $response->json('hierarchy');

        foreach ($data as $country) {
            $this->assertEquals('country', $country['type']);
            foreach ($country['children'] as $city) {
                $this->assertEquals('city', $city['type']);
                $this->assertArrayHasKey('slug', $city);
                $this->assertArrayHasKey('name', $city);
            }
        }
    }

    public function test_hierarchy_tree_sa_has_riyadh()
    {
        $response = $this->getJson('/cityos/v1/hierarchy/tree');

        $response->assertStatus(200);
        $data = $response->json('hierarchy');
        $sa = collect($data)->firstWhere('code', 'SA');
        $this->assertNotNull($sa);

        $citySlugs = collect($sa['children'])->pluck('slug')->toArray();
        $this->assertContains('riyadh', $citySlugs);
    }

    public function test_hierarchy_tree_cities_have_sectors_nested()
    {
        $response = $this->getJson('/cityos/v1/hierarchy/tree');

        $response->assertStatus(200);
        $data = $response->json('hierarchy');

        foreach ($data as $country) {
            foreach ($country['children'] as $city) {
                $this->assertArrayHasKey('children', $city);
                $this->assertIsArray($city['children']);
            }
        }
    }

    public function test_hierarchy_resolve_with_country_and_city()
    {
        $response = $this->getJson('/cityos/v1/hierarchy/resolve', [
            'X-CityOS-Country' => 'SA',
            'X-CityOS-City' => 'riyadh',
        ]);

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'node_context',
            'valid',
        ]);

        $nodeContext = $response->json('node_context');
        $this->assertEquals('SA', $nodeContext['country']);
        $this->assertEquals('riyadh', $nodeContext['cityOrTheme']);
    }

    public function test_hierarchy_resolve_returns_node_context_fields()
    {
        $response = $this->getJson('/cityos/v1/hierarchy/resolve');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'node_context' => [
                'country',
                'cityOrTheme',
                'sector',
                'category',
                'channel',
                'surface',
                'locale',
                'processingRegion',
                'residencyClass',
                'version',
            ],
        ]);
    }

    public function test_hierarchy_resolve_with_headers()
    {
        $response = $this->getJson('/cityos/v1/hierarchy/resolve', [
            'X-CityOS-Country' => 'SA',
            'X-CityOS-City' => 'riyadh',
        ]);

        $response->assertStatus(200);
        $nodeContext = $response->json('node_context');
        $this->assertEquals('SA', $nodeContext['country']);
        $this->assertEquals('riyadh', $nodeContext['cityOrTheme']);
    }
}
