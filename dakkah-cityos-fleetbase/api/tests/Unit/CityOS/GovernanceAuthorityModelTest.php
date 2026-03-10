<?php

namespace Tests\Unit\CityOS;

use Tests\TestCase;
use Fleetbase\CityOS\Models\GovernanceAuthority;
use Fleetbase\CityOS\Models\Country;

class GovernanceAuthorityModelTest extends TestCase
{
    public function test_can_create_authority()
    {
        $country = Country::where('code', 'SA')->first();
        $auth = GovernanceAuthority::create(['code' => 'TEST-AUTH', 'name' => 'Test Authority', 'country_uuid' => $country->uuid, 'type' => 'regulatory']);
        $this->assertNotNull($auth->uuid);
        $this->assertEquals('regulatory', $auth->type);
        $auth->forceDelete();
    }

    public function test_authority_has_country_relationship()
    {
        $country = Country::where('code', 'SA')->first();
        $auth = GovernanceAuthority::create(['code' => 'TEST-AUTH2', 'name' => 'Test Authority 2', 'country_uuid' => $country->uuid]);
        $this->assertEquals('SA', $auth->country->code);
        $auth->forceDelete();
    }

    public function test_authority_ancestry_chain()
    {
        $parent = GovernanceAuthority::create(['code' => 'TEST-PARENT', 'name' => 'Parent Authority']);
        $child = GovernanceAuthority::create(['code' => 'TEST-CHILD', 'name' => 'Child Authority', 'parent_authority_uuid' => $parent->uuid]);
        $chain = $child->getAncestryChain();
        $this->assertCount(2, $chain);
        $this->assertEquals('TEST-PARENT', $chain[0]['code']);
        $this->assertEquals('TEST-CHILD', $chain[1]['code']);
        $child->forceDelete();
        $parent->forceDelete();
    }

    public function test_authority_mandates_cast()
    {
        $auth = GovernanceAuthority::create([
            'code' => 'TEST-CAST', 'name' => 'Cast Test',
            'mandates' => ['PDPL', 'NCA-ECC'],
            'jurisdiction' => ['scope' => 'national', 'domain' => 'data'],
        ]);
        $this->assertIsArray($auth->mandates);
        $this->assertContains('PDPL', $auth->mandates);
        $this->assertEquals('national', $auth->jurisdiction['scope']);
        $auth->forceDelete();
    }
}
