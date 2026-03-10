<?php

namespace Tests\Unit\CityOS;

use Tests\TestCase;
use Fleetbase\CityOS\Support\PolicyMerger;

class PolicyMergerTest extends TestCase
{
    public function test_merge_data_residency_intersects_allowed_regions()
    {
        $base = ['allowedRegions' => ['me-central-1', 'me-south-1', 'eu-west-1'], 'zone' => 'GCC'];
        $override = ['allowedRegions' => ['me-central-1', 'eu-west-1'], 'zone' => 'MENA'];
        $result = PolicyMerger::mergeDataResidency($base, $override);
        $this->assertEquals(['me-central-1', 'eu-west-1'], $result['allowedRegions']);
        $this->assertEquals('MENA', $result['zone']);
    }

    public function test_merge_data_residency_wildcard_base()
    {
        $base = ['allowedRegions' => ['*']];
        $override = ['allowedRegions' => ['me-central-1']];
        $result = PolicyMerger::mergeDataResidency($base, $override);
        $this->assertEquals(['me-central-1'], $result['allowedRegions']);
    }

    public function test_merge_data_residency_wildcard_override()
    {
        $base = ['allowedRegions' => ['me-central-1']];
        $override = ['allowedRegions' => ['*']];
        $result = PolicyMerger::mergeDataResidency($base, $override);
        $this->assertEquals(['me-central-1'], $result['allowedRegions']);
    }

    public function test_merge_data_residency_cross_border_restrictive()
    {
        $base = ['crossBorderTransfer' => true];
        $override = ['crossBorderTransfer' => false];
        $result = PolicyMerger::mergeDataResidency($base, $override);
        $this->assertFalse($result['crossBorderTransfer']);
    }

    public function test_merge_data_residency_encryption_additive()
    {
        $base = ['encryptionRequired' => false];
        $override = ['encryptionRequired' => true];
        $result = PolicyMerger::mergeDataResidency($base, $override);
        $this->assertTrue($result['encryptionRequired']);
    }

    public function test_merge_compliance_union_frameworks()
    {
        $base = ['frameworks' => ['PDPL', 'NCA-ECC']];
        $override = ['frameworks' => ['PDPL', 'ISO27001']];
        $result = PolicyMerger::mergeCompliance($base, $override);
        $this->assertCount(3, $result['frameworks']);
        $this->assertContains('PDPL', $result['frameworks']);
        $this->assertContains('ISO27001', $result['frameworks']);
    }

    public function test_merge_compliance_audit_additive()
    {
        $base = ['auditRequired' => false];
        $override = ['auditRequired' => true];
        $result = PolicyMerger::mergeCompliance($base, $override);
        $this->assertTrue($result['auditRequired']);
    }

    public function test_merge_compliance_stricter_retention()
    {
        $base = ['retentionPeriod' => '3y'];
        $override = ['retentionPeriod' => '7y'];
        $result = PolicyMerger::mergeCompliance($base, $override);
        $this->assertEquals('7y', $result['retentionPeriod']);
    }

    public function test_merge_classification_stricter_default_level()
    {
        $base = ['defaultLevel' => 'INTERNAL'];
        $override = ['defaultLevel' => 'CONFIDENTIAL'];
        $result = PolicyMerger::mergeClassification($base, $override);
        $this->assertEquals('CONFIDENTIAL', $result['defaultLevel']);
    }

    public function test_merge_classification_lower_override_ignored()
    {
        $base = ['defaultLevel' => 'RESTRICTED'];
        $override = ['defaultLevel' => 'PUBLIC'];
        $result = PolicyMerger::mergeClassification($base, $override);
        $this->assertEquals('RESTRICTED', $result['defaultLevel']);
    }

    public function test_merge_classification_union_levels()
    {
        $base = ['levels' => ['PUBLIC', 'INTERNAL']];
        $override = ['levels' => ['INTERNAL', 'CONFIDENTIAL']];
        $result = PolicyMerger::mergeClassification($base, $override);
        $this->assertCount(3, $result['levels']);
    }

    public function test_merge_operational_min_rate_limit()
    {
        $base = ['rateLimitPerMinute' => 100];
        $override = ['rateLimitPerMinute' => 50];
        $result = PolicyMerger::mergeOperational($base, $override);
        $this->assertEquals(50, $result['rateLimitPerMinute']);
    }

    public function test_merge_operational_min_concurrent()
    {
        $base = ['maxConcurrentRequests' => 20];
        $override = ['maxConcurrentRequests' => 10];
        $result = PolicyMerger::mergeOperational($base, $override);
        $this->assertEquals(10, $result['maxConcurrentRequests']);
    }

    public function test_merge_operational_sla_takes_minimum()
    {
        $base = ['sla' => ['response_time_ms' => 500, 'uptime' => 99.9]];
        $override = ['sla' => ['response_time_ms' => 200, 'uptime' => 99.95]];
        $result = PolicyMerger::mergeOperational($base, $override);
        $this->assertEquals(200, $result['sla']['response_time_ms']);
        $this->assertEquals(99.9, $result['sla']['uptime']);
    }

    public function test_merge_all_produces_trace()
    {
        $stack = [
            ['name' => 'Region GCC', 'scope' => 'regional', 'policy_data' => ['dataResidency' => ['zone' => 'GCC', 'allowedRegions' => ['me-central-1']]]],
            ['name' => 'Country SA', 'scope' => 'national', 'policy_data' => ['compliance' => ['frameworks' => ['PDPL']]]],
        ];
        $result = PolicyMerger::mergeAll($stack);
        $this->assertArrayHasKey('effective', $result);
        $this->assertArrayHasKey('trace', $result);
        $this->assertEquals(2, $result['policyCount']);
        $this->assertCount(2, $result['trace']);
    }

    public function test_merge_all_empty_stack()
    {
        $result = PolicyMerger::mergeAll([]);
        $this->assertEmpty($result['effective']['dataResidency']);
        $this->assertEquals(0, $result['policyCount']);
    }
}
