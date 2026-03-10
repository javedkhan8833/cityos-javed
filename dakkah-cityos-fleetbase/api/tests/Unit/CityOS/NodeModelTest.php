<?php

namespace Tests\Unit\CityOS;

use Tests\TestCase;
use Fleetbase\CityOS\Models\Node;

class NodeModelTest extends TestCase
{
    public function test_can_create_node()
    {
        $node = Node::create(['type' => Node::TYPE_GLOBAL, 'name' => 'Test Global', 'slug' => 'test-global-unit', 'status' => 'active', 'depth' => 0]);
        $this->assertNotNull($node->uuid);
        $this->assertEquals('GLOBAL', $node->type);
        $node->forceDelete();
    }

    public function test_valid_parent_type_global_has_no_parent()
    {
        $node = Node::create(['type' => Node::TYPE_GLOBAL, 'name' => 'Root', 'slug' => 'root-unit']);
        $this->assertTrue($node->validateParentType());
        $node->forceDelete();
    }

    public function test_valid_parent_type_continent_under_global()
    {
        $global = Node::create(['type' => 'GLOBAL', 'name' => 'Global VPT', 'slug' => 'global-vpt-unit']);
        $continent = Node::create(['type' => 'CONTINENT', 'name' => 'Middle East VPT', 'slug' => 'me-vpt-unit', 'parent_uuid' => $global->uuid]);
        $this->assertTrue($continent->validateParentType());
        $continent->forceDelete();
        $global->forceDelete();
    }

    public function test_invalid_parent_type()
    {
        $global = Node::create(['type' => 'GLOBAL', 'name' => 'G IPT', 'slug' => 'g-ipt-unit']);
        $city = Node::create(['type' => 'CITY', 'name' => 'City IPT', 'slug' => 'city-ipt-unit', 'parent_uuid' => $global->uuid]);
        $this->assertFalse($city->validateParentType());
        $city->forceDelete();
        $global->forceDelete();
    }

    public function test_stewardship_transitions()
    {
        $node = new Node(['stewardship_state' => 'unclaimed']);
        $this->assertTrue($node->canTransitionStewardship('claim-pending'));
        $this->assertFalse($node->canTransitionStewardship('claimed'));
    }

    public function test_stewardship_claim_pending_transitions()
    {
        $node = new Node(['stewardship_state' => 'claim-pending']);
        $this->assertTrue($node->canTransitionStewardship('claimed'));
        $this->assertTrue($node->canTransitionStewardship('unclaimed'));
        $this->assertFalse($node->canTransitionStewardship('disputed'));
    }

    public function test_stewardship_claimed_transitions()
    {
        $node = new Node(['stewardship_state' => 'claimed']);
        $this->assertTrue($node->canTransitionStewardship('disputed'));
        $this->assertFalse($node->canTransitionStewardship('unclaimed'));
    }

    public function test_stewardship_disputed_transitions()
    {
        $node = new Node(['stewardship_state' => 'disputed']);
        $this->assertTrue($node->canTransitionStewardship('claimed'));
        $this->assertTrue($node->canTransitionStewardship('reverted'));
    }

    public function test_hierarchy_order_constants()
    {
        $this->assertEquals(0, Node::HIERARCHY_ORDER['GLOBAL']);
        $this->assertEquals(4, Node::HIERARCHY_ORDER['CITY']);
        $this->assertEquals(8, Node::HIERARCHY_ORDER['ASSET']);
    }

    public function test_valid_types()
    {
        $this->assertCount(9, Node::VALID_TYPES);
        $this->assertContains('GLOBAL', Node::VALID_TYPES);
        $this->assertContains('ASSET', Node::VALID_TYPES);
    }

    public function test_get_depth_from_root()
    {
        $node = new Node(['type' => 'CITY']);
        $this->assertEquals(4, $node->getDepthFromRoot());
    }

    public function test_build_path()
    {
        $global = Node::create(['type' => 'GLOBAL', 'name' => 'G BP', 'slug' => 'g-bp-unit', 'depth' => 0]);
        $continent = Node::create(['type' => 'CONTINENT', 'name' => 'C BP', 'slug' => 'c-bp-unit', 'depth' => 1, 'parent_uuid' => $global->uuid]);
        $path = $continent->buildPath();
        $this->assertEquals('g-bp-unit/c-bp-unit', $path);
        $continent->forceDelete();
        $global->forceDelete();
    }
}
