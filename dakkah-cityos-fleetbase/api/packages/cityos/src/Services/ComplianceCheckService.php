<?php

namespace Fleetbase\CityOS\Services;

use Fleetbase\CityOS\Models\Tenant;
use Fleetbase\CityOS\Models\Node;
use Fleetbase\CityOS\Support\GovernanceChainBuilder;

class ComplianceCheckService
{
    const SEVERITY_WARNING = 'warning';
    const SEVERITY_CRITICAL = 'critical';

    const CLASSIFICATION_LEVELS = [
        'PUBLIC' => 0, 'INTERNAL' => 1, 'CONFIDENTIAL' => 2,
        'RESTRICTED' => 3, 'TOP_SECRET' => 4,
    ];

    public function checkTenantCompliance(Tenant $tenant, string $operation = 'read'): array
    {
        $violations = [];
        $chain = GovernanceChainBuilder::build($tenant, $tenant->country);
        $effective = $chain['effectivePolicies'] ?? [];

        if (!empty($effective['dataResidency'])) {
            $residency = $effective['dataResidency'];
            if (($residency['crossBorderTransfer'] ?? true) === false && $operation === 'export') {
                $violations[] = [
                    'rule' => 'data-residency.cross-border',
                    'severity' => self::SEVERITY_CRITICAL,
                    'message' => "Cross-border data transfer is not allowed for zone {$residency['zone']}",
                    'field' => 'data_export',
                ];
            }

            if (($residency['encryptionRequired'] ?? false) === true) {
                $violations[] = [
                    'rule' => 'data-residency.encryption',
                    'severity' => self::SEVERITY_WARNING,
                    'message' => 'Encryption is required for data in this residency zone',
                    'field' => 'encryption',
                ];
            }
        }

        if (!empty($effective['compliance'])) {
            $compliance = $effective['compliance'];
            if (($compliance['auditRequired'] ?? false) && !in_array($operation, ['read'])) {
                $violations[] = [
                    'rule' => 'compliance.audit-required',
                    'severity' => self::SEVERITY_WARNING,
                    'message' => 'This operation requires audit logging',
                    'field' => 'audit',
                ];
            }
        }

        if (!empty($effective['classification'])) {
            $classification = $effective['classification'];
            $defaultLevel = strtoupper($classification['defaultLevel'] ?? 'INTERNAL');
            $tenantLevel = strtoupper($tenant->data_classification_default ?? 'INTERNAL');

            $defaultRank = self::CLASSIFICATION_LEVELS[$defaultLevel] ?? 1;
            $tenantRank = self::CLASSIFICATION_LEVELS[$tenantLevel] ?? 1;

            if ($tenantRank < $defaultRank) {
                $violations[] = [
                    'rule' => 'classification.minimum-level',
                    'severity' => self::SEVERITY_CRITICAL,
                    'message' => "Tenant classification {$tenantLevel} is below required minimum {$defaultLevel}",
                    'field' => 'data_classification_default',
                ];
            }
        }

        return $violations;
    }

    public function checkNodeCompliance(Node $node, string $operation = 'read'): array
    {
        $violations = [];

        if (!in_array($node->type, Node::VALID_TYPES)) {
            $violations[] = [
                'rule' => 'node.invalid-type',
                'severity' => self::SEVERITY_CRITICAL,
                'message' => "Invalid node type: {$node->type}",
                'field' => 'type',
            ];
        }

        if ($node->parent_uuid && !$node->validateParentType()) {
            $violations[] = [
                'rule' => 'node.invalid-parent-type',
                'severity' => self::SEVERITY_CRITICAL,
                'message' => "Node type {$node->type} cannot have parent of type " . ($node->parent?->type ?? 'unknown'),
                'field' => 'parent_uuid',
            ];
        }

        if ($operation === 'update' && $node->stewardship_state === 'claimed' && !$node->stewardship_tenant_uuid) {
            $violations[] = [
                'rule' => 'node.stewardship-missing-tenant',
                'severity' => self::SEVERITY_WARNING,
                'message' => 'Claimed node must have a stewardship tenant',
                'field' => 'stewardship_tenant_uuid',
            ];
        }

        return $violations;
    }

    public function checkClassificationAccess(string $userLevel, string $dataLevel): bool
    {
        $userRank = self::CLASSIFICATION_LEVELS[strtoupper($userLevel)] ?? 0;
        $dataRank = self::CLASSIFICATION_LEVELS[strtoupper($dataLevel)] ?? 0;
        return $userRank >= $dataRank;
    }

    public function getViolationSummary(array $violations): array
    {
        $critical = array_filter($violations, fn($v) => $v['severity'] === self::SEVERITY_CRITICAL);
        $warnings = array_filter($violations, fn($v) => $v['severity'] === self::SEVERITY_WARNING);

        return [
            'total' => count($violations),
            'critical' => count($critical),
            'warnings' => count($warnings),
            'violations' => $violations,
            'blocked' => count($critical) > 0,
        ];
    }
}
