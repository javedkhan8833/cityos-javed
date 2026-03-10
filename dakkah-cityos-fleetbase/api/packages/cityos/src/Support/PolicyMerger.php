<?php

namespace Fleetbase\CityOS\Support;

class PolicyMerger
{
    public static function mergeAll(array $policyStack): array
    {
        $merged = [
            'dataResidency' => [],
            'compliance' => [],
            'classification' => [],
            'operational' => [],
        ];

        $trace = [];

        foreach ($policyStack as $policy) {
            $policyData = $policy['policy_data'] ?? $policy['policyData'] ?? [];
            $source = $policy['name'] ?? $policy['slug'] ?? 'unknown';
            $scope = $policy['scope'] ?? 'global';

            if (!empty($policyData['dataResidency'])) {
                $merged['dataResidency'] = self::mergeDataResidency($merged['dataResidency'], $policyData['dataResidency']);
                $trace[] = ['source' => $source, 'scope' => $scope, 'type' => 'dataResidency'];
            }

            if (!empty($policyData['compliance'])) {
                $merged['compliance'] = self::mergeCompliance($merged['compliance'], $policyData['compliance']);
                $trace[] = ['source' => $source, 'scope' => $scope, 'type' => 'compliance'];
            }

            if (!empty($policyData['classification'])) {
                $merged['classification'] = self::mergeClassification($merged['classification'], $policyData['classification']);
                $trace[] = ['source' => $source, 'scope' => $scope, 'type' => 'classification'];
            }

            if (!empty($policyData['operational'])) {
                $merged['operational'] = self::mergeOperational($merged['operational'], $policyData['operational']);
                $trace[] = ['source' => $source, 'scope' => $scope, 'type' => 'operational'];
            }
        }

        return [
            'effective' => $merged,
            'trace' => $trace,
            'policyCount' => count($policyStack),
        ];
    }

    public static function mergeDataResidency(array $base, array $override): array
    {
        $result = array_merge($base, $override);

        if (!empty($base['allowedRegions']) && !empty($override['allowedRegions'])) {
            if ($base['allowedRegions'] !== ['*'] && $override['allowedRegions'] !== ['*']) {
                $result['allowedRegions'] = array_values(array_intersect($base['allowedRegions'], $override['allowedRegions']));
            } elseif ($override['allowedRegions'] !== ['*']) {
                $result['allowedRegions'] = $override['allowedRegions'];
            } elseif ($base['allowedRegions'] !== ['*']) {
                $result['allowedRegions'] = $base['allowedRegions'];
            }
        }

        if (isset($base['crossBorderTransfer']) && isset($override['crossBorderTransfer'])) {
            $result['crossBorderTransfer'] = $base['crossBorderTransfer'] && $override['crossBorderTransfer'];
        }

        if (isset($base['encryptionRequired']) || isset($override['encryptionRequired'])) {
            $result['encryptionRequired'] = ($base['encryptionRequired'] ?? false) || ($override['encryptionRequired'] ?? false);
        }

        return $result;
    }

    public static function mergeCompliance(array $base, array $override): array
    {
        $result = array_merge($base, $override);

        if (!empty($base['frameworks']) && !empty($override['frameworks'])) {
            $result['frameworks'] = array_values(array_unique(array_merge($base['frameworks'], $override['frameworks'])));
        }

        if (isset($base['auditRequired']) || isset($override['auditRequired'])) {
            $result['auditRequired'] = ($base['auditRequired'] ?? false) || ($override['auditRequired'] ?? false);
        }

        if (!empty($base['retentionPeriod']) && !empty($override['retentionPeriod'])) {
            $result['retentionPeriod'] = self::stricterRetention($base['retentionPeriod'], $override['retentionPeriod']);
        }

        return $result;
    }

    public static function mergeClassification(array $base, array $override): array
    {
        $result = array_merge($base, $override);

        $levels = ['PUBLIC' => 0, 'INTERNAL' => 1, 'CONFIDENTIAL' => 2, 'RESTRICTED' => 3, 'TOP_SECRET' => 4];

        if (!empty($base['defaultLevel']) && !empty($override['defaultLevel'])) {
            $baseLevel = $levels[strtoupper($base['defaultLevel'])] ?? 0;
            $overrideLevel = $levels[strtoupper($override['defaultLevel'])] ?? 0;
            $result['defaultLevel'] = $baseLevel >= $overrideLevel ? $base['defaultLevel'] : $override['defaultLevel'];
        }

        if (!empty($base['levels']) && !empty($override['levels'])) {
            $result['levels'] = array_values(array_unique(array_merge($base['levels'], $override['levels'])));
        }

        return $result;
    }

    public static function mergeOperational(array $base, array $override): array
    {
        $result = array_merge($base, $override);

        if (isset($base['rateLimitPerMinute']) && isset($override['rateLimitPerMinute'])) {
            $result['rateLimitPerMinute'] = min($base['rateLimitPerMinute'], $override['rateLimitPerMinute']);
        }

        if (isset($base['maxConcurrentRequests']) && isset($override['maxConcurrentRequests'])) {
            $result['maxConcurrentRequests'] = min($base['maxConcurrentRequests'], $override['maxConcurrentRequests']);
        }

        if (!empty($base['sla']) && !empty($override['sla'])) {
            foreach ($override['sla'] as $key => $val) {
                if (isset($base['sla'][$key]) && is_numeric($val) && is_numeric($base['sla'][$key])) {
                    $result['sla'][$key] = min($base['sla'][$key], $val);
                } else {
                    $result['sla'][$key] = $val;
                }
            }
        }

        return $result;
    }

    private static function stricterRetention(string $a, string $b): string
    {
        $parseYears = function (string $r): int {
            if (preg_match('/(\d+)y/', $r, $m)) return (int)$m[1];
            if (preg_match('/(\d+)d/', $r, $m)) return (int)ceil($m[1] / 365);
            return 0;
        };

        return $parseYears($a) >= $parseYears($b) ? $a : $b;
    }
}
