<?php

namespace Tests\Feature\CityOS;

use Tests\TestCase;

class HierarchyApiTest extends TestCase
{
    public function test_countries_list_requires_authentication()
    {
        $response = $this->getJson('/cityos/int/v1/countries');
        $this->assertTrue(in_array($response->status(), [400, 401, 403]), "Expected 400/401/403 but got {$response->status()}");
    }

    public function test_cities_list_requires_authentication()
    {
        $response = $this->getJson('/cityos/int/v1/cities');
        $this->assertTrue(in_array($response->status(), [400, 401, 403]), "Expected 400/401/403 but got {$response->status()}");
    }

    public function test_sectors_list_requires_authentication()
    {
        $response = $this->getJson('/cityos/int/v1/sectors');
        $this->assertTrue(in_array($response->status(), [400, 401, 403]), "Expected 400/401/403 but got {$response->status()}");
    }

    public function test_categories_list_requires_authentication()
    {
        $response = $this->getJson('/cityos/int/v1/categories');
        $this->assertTrue(in_array($response->status(), [400, 401, 403]), "Expected 400/401/403 but got {$response->status()}");
    }

    public function test_tenants_list_requires_authentication()
    {
        $response = $this->getJson('/cityos/int/v1/tenants');
        $this->assertTrue(in_array($response->status(), [400, 401, 403]), "Expected 400/401/403 but got {$response->status()}");
    }

    public function test_channels_list_requires_authentication()
    {
        $response = $this->getJson('/cityos/int/v1/channels');
        $this->assertTrue(in_array($response->status(), [400, 401, 403]), "Expected 400/401/403 but got {$response->status()}");
    }

    public function test_surfaces_list_requires_authentication()
    {
        $response = $this->getJson('/cityos/int/v1/surfaces');
        $this->assertTrue(in_array($response->status(), [400, 401, 403]), "Expected 400/401/403 but got {$response->status()}");
    }

    public function test_portals_list_requires_authentication()
    {
        $response = $this->getJson('/cityos/int/v1/portals');
        $this->assertTrue(in_array($response->status(), [400, 401, 403]), "Expected 400/401/403 but got {$response->status()}");
    }

    public function test_create_country_requires_authentication()
    {
        $response = $this->postJson('/cityos/int/v1/countries', [
            'code' => 'XX',
            'name' => 'Test Country',
        ]);
        $this->assertTrue(in_array($response->status(), [400, 401, 403]), "Expected 400/401/403 but got {$response->status()}");
    }

    public function test_create_city_requires_authentication()
    {
        $response = $this->postJson('/cityos/int/v1/cities', [
            'name' => 'Test City',
            'slug' => 'test-city',
        ]);
        $this->assertTrue(in_array($response->status(), [400, 401, 403]), "Expected 400/401/403 but got {$response->status()}");
    }

    public function test_create_sector_requires_authentication()
    {
        $response = $this->postJson('/cityos/int/v1/sectors', [
            'name' => 'Test Sector',
            'slug' => 'test-sector',
        ]);
        $this->assertTrue(in_array($response->status(), [400, 401, 403]), "Expected 400/401/403 but got {$response->status()}");
    }

    public function test_create_category_requires_authentication()
    {
        $response = $this->postJson('/cityos/int/v1/categories', [
            'name' => 'Test Category',
            'slug' => 'test-category',
        ]);
        $this->assertTrue(in_array($response->status(), [400, 401, 403]), "Expected 400/401/403 but got {$response->status()}");
    }

    public function test_update_country_requires_authentication()
    {
        $response = $this->putJson('/cityos/int/v1/countries/fake-uuid', [
            'name' => 'Updated',
        ]);
        $this->assertTrue(in_array($response->status(), [400, 401, 403]), "Expected 400/401/403 but got {$response->status()}");
    }

    public function test_update_city_requires_authentication()
    {
        $response = $this->putJson('/cityos/int/v1/cities/fake-uuid', [
            'name' => 'Updated',
        ]);
        $this->assertTrue(in_array($response->status(), [400, 401, 403]), "Expected 400/401/403 but got {$response->status()}");
    }

    public function test_internal_hierarchy_tree_requires_authentication()
    {
        $response = $this->getJson('/cityos/int/v1/hierarchy/tree');
        $this->assertTrue(in_array($response->status(), [400, 401, 403]), "Expected 400/401/403 but got {$response->status()}");
    }

    public function test_internal_hierarchy_resolve_requires_authentication()
    {
        $response = $this->getJson('/cityos/int/v1/hierarchy/resolve');
        $this->assertTrue(in_array($response->status(), [400, 401, 403]), "Expected 400/401/403 but got {$response->status()}");
    }

    public function test_internal_hierarchy_stats_requires_authentication()
    {
        $response = $this->getJson('/cityos/int/v1/hierarchy/stats');
        $this->assertTrue(in_array($response->status(), [400, 401, 403]), "Expected 400/401/403 but got {$response->status()}");
    }
}
