<?php

namespace Tests\Unit\CityOS;

use Tests\TestCase;
use Fleetbase\CityOS\Models\Node;
use Fleetbase\CityOS\Models\Tenant;
use Fleetbase\CityOS\Services\ComplianceCheckService;

class ComplianceServiceTest extends TestCase
{
    private ComplianceCheckService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new ComplianceCheckService();
    }

    public function test_check_tenant_compliance_read()
    {
        $tenant = Tenant::where('handle', 'dakkah-riyadh-logistics')->first();
        $violations = $this->service->checkTenantCompliance($tenant, 'read');
        $this->assertIsArray($violations);
    }

    public function test_check_tenant_compliance_export()
    {
        $tenant = Tenant::where('handle', 'dakkah-riyadh-logistics')->first();
        $violations = $this->service->checkTenantCompliance($tenant, 'export');
        $this->assertIsArray($violations);
    }

    public function test_check_node_compliance_valid_node()
    {
        $node = new Node(['type' => 'CITY', 'stewardship_state' => 'unclaimed']);
        $violations = $this->service->checkNodeCompliance($node);
        $this->assertIsArray($violations);
    }

    public function test_check_node_compliance_invalid_type()
    {
        $node = new Node(['type' => 'INVALID_TYPE']);
        $violations = $this->service->checkNodeCompliance($node);
        $critical = array_filter($violations, fn($v) => $v['severity'] === 'critical');
        $this->assertNotEmpty($critical);
    }

    public function test_check_classification_access()
    {
        $this->assertTrue($this->service->checkClassificationAccess('RESTRICTED', 'CONFIDENTIAL'));
        $this->assertTrue($this->service->checkClassificationAccess('CONFIDENTIAL', 'CONFIDENTIAL'));
        $this->assertFalse($this->service->checkClassificationAccess('PUBLIC', 'CONFIDENTIAL'));
        $this->assertFalse($this->service->checkClassificationAccess('INTERNAL', 'RESTRICTED'));
    }

    public function test_violation_summary()
    {
        $violations = [
            ['rule' => 'r1', 'severity' => 'critical', 'message' => 'm1', 'field' => 'f1'],
            ['rule' => 'r2', 'severity' => 'warning', 'message' => 'm2', 'field' => 'f2'],
            ['rule' => 'r3', 'severity' => 'warning', 'message' => 'm3', 'field' => 'f3'],
        ];
        $summary = $this->service->getViolationSummary($violations);
        $this->assertEquals(3, $summary['total']);
        $this->assertEquals(1, $summary['critical']);
        $this->assertEquals(2, $summary['warnings']);
        $this->assertTrue($summary['blocked']);
    }

    public function test_violation_summary_no_critical()
    {
        $violations = [['rule' => 'r1', 'severity' => 'warning', 'message' => 'm1', 'field' => 'f1']];
        $summary = $this->service->getViolationSummary($violations);
        $this->assertFalse($summary['blocked']);
    }
}
