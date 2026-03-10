<?php

namespace Fleetbase\CityOS\Temporal\Workflows;

use Fleetbase\CityOS\Temporal\Activities\ComplianceActivities;

class ComplianceAuditWorkflow extends AbstractWorkflow
{
    public function getWorkflowType(): string
    {
        return 'compliance-audit';
    }

    public function getTaskQueue(): string
    {
        return 'cityos-compliance-queue';
    }

    public function getDescription(): string
    {
        return 'Regulatory compliance audit workflow covering document gathering, credential verification, expiry checks, and violation reporting.';
    }

    public function getSteps(): array
    {
        return [
            ['name' => 'gather_documents', 'description' => 'Gather all required compliance documents for the entity', 'timeout' => 300],
            ['name' => 'verify_credentials', 'description' => 'Verify licenses, certifications, and credentials', 'timeout' => 120],
            ['name' => 'check_expiry', 'description' => 'Check expiration dates on all documents and credentials', 'timeout' => 60],
            ['name' => 'flag_violations', 'description' => 'Identify and flag any compliance violations', 'timeout' => 60],
            ['name' => 'generate_report', 'description' => 'Generate compliance audit report with findings', 'timeout' => 120],
        ];
    }

    public function getDefaultOptions(): array
    {
        return array_merge(parent::getDefaultOptions(), [
            'workflow_execution_timeout' => 7200,
            'retry_policy' => [
                'initial_interval' => 2,
                'backoff_coefficient' => 2.0,
                'maximum_interval' => 120,
                'maximum_attempts' => 3,
            ],
        ]);
    }

    public function execute(array $input): array
    {
        $entityId = $input['entity_id'] ?? null;
        $entityType = $input['entity_type'] ?? 'driver';
        $results = [];
        $activities = new ComplianceActivities();

        $this->logStep('gather_documents', 'started', ['entity_id' => $entityId, 'entity_type' => $entityType]);
        $docResult = $activities->gatherDocuments($input);
        $results[] = $docResult;

        $this->logStep('verify_credentials', 'started', ['entity_id' => $entityId]);
        $credResult = $activities->verifyCredentials(array_merge($input, ['documents' => $docResult['data']['documents'] ?? []]));
        $results[] = $credResult;

        $this->logStep('check_expiry', 'started', ['entity_id' => $entityId]);
        $expiryResult = $activities->checkExpiry(array_merge($input, ['documents' => $docResult['data']['documents'] ?? []]));
        $results[] = $expiryResult;

        $this->logStep('flag_violations', 'started', ['entity_id' => $entityId]);
        $violationResult = $activities->flagViolations(array_merge($input, [
            'credential_results' => $credResult['data'] ?? [],
            'expiry_results' => $expiryResult['data'] ?? [],
        ]));
        $results[] = $violationResult;

        $this->logStep('generate_report', 'started', ['entity_id' => $entityId]);
        $results[] = $activities->generateReport(array_merge($input, [
            'violations' => $violationResult['data']['violations'] ?? [],
            'documents' => $docResult['data']['documents'] ?? [],
        ]));

        $this->logStep('workflow_complete', 'completed', ['entity_id' => $entityId]);

        return [
            'workflow_type' => $this->getWorkflowType(),
            'entity_id' => $entityId,
            'entity_type' => $entityType,
            'status' => 'completed',
            'steps' => $results,
        ];
    }
}
