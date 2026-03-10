<?php

namespace Fleetbase\CityOS\Services;

class QueueSystemMapService
{
    const QUEUE_SYSTEM_MAP = [
        'cityos-workflow-queue' => ['system' => 'cityos-core', 'domain' => 'core', 'description' => 'Default CityOS workflow queue'],
        'cityos-main' => ['system' => 'cityos-core', 'domain' => 'core', 'description' => 'Main CityOS task queue'],
        'commerce-queue' => ['system' => 'medusa', 'domain' => 'commerce', 'description' => 'Commerce order processing'],
        'commerce-booking-queue' => ['system' => 'medusa', 'domain' => 'commerce', 'description' => 'Commerce booking workflows'],
        'payload-queue' => ['system' => 'payload-cms', 'domain' => 'payload', 'description' => 'Payload CMS content sync'],
        'payload-moderation-queue' => ['system' => 'payload-cms', 'domain' => 'moderation', 'description' => 'Payload content moderation'],
        'payload-notifications-queue' => ['system' => 'payload-cms', 'domain' => 'notifications', 'description' => 'Payload notification dispatch'],
        'xsystem-platform-queue' => ['system' => 'erpnext', 'domain' => 'xsystem', 'description' => 'Cross-system platform operations'],
        'xsystem-content-queue' => ['system' => 'payload-cms', 'domain' => 'xsystem', 'description' => 'Cross-system content sync'],
        'xsystem-logistics-queue' => ['system' => 'fleetbase', 'domain' => 'logistics', 'description' => 'Cross-system logistics coordination'],
        'xsystem-vertical-queue' => ['system' => 'erpnext', 'domain' => 'xsystem', 'description' => 'Cross-system vertical integration'],
        'core-queue' => ['system' => 'cityos-core', 'domain' => 'core', 'description' => 'Core platform operations'],
        'core-maintenance-queue' => ['system' => 'cityos-core', 'domain' => 'core', 'description' => 'Scheduled maintenance tasks'],
        'zes-queue' => ['system' => 'zes-engine', 'domain' => 'zes', 'description' => 'Zone Experience System processing'],
        'zes-analytics-queue' => ['system' => 'zes-engine', 'domain' => 'zes', 'description' => 'ZES analytics aggregation'],
        'storage-queue' => ['system' => 'minio', 'domain' => 'storage', 'description' => 'Object storage operations'],
        'notifications-queue' => ['system' => 'cityos-core', 'domain' => 'notifications', 'description' => 'Notification delivery'],
        'moderation-queue' => ['system' => 'cityos-core', 'domain' => 'moderation', 'description' => 'Content moderation pipeline'],
        'poi-realtime-queue' => ['system' => 'cityos-core', 'domain' => 'poi', 'description' => 'Real-time POI updates'],
        'poi-views-queue' => ['system' => 'cityos-core', 'domain' => 'poi', 'description' => 'POI view tracking'],
    ];

    const SYSTEMS = [
        'payload-cms', 'medusa', 'erpnext', 'fleetbase', 'walt-id',
        'minio', 'temporal', 'cityos-core', 'zes-engine', 'ai-services',
    ];

    const DOMAINS = [
        'core', 'commerce', 'logistics', 'fleet', 'identity',
        'moderation', 'notifications', 'xsystem', 'payload', 'poi',
        'zes', 'storage', 'finance', 'governance',
    ];

    const PREFIX_SYSTEM_MAP = [
        'commerce' => 'medusa',
        'payload' => 'payload-cms',
        'xsystem' => 'erpnext',
        'zes' => 'zes-engine',
        'storage' => 'minio',
        'core' => 'cityos-core',
        'cityos' => 'cityos-core',
        'poi' => 'cityos-core',
        'moderation' => 'cityos-core',
        'notifications' => 'cityos-core',
        'fleet' => 'fleetbase',
        'logistics' => 'fleetbase',
        'walt' => 'walt-id',
        'ai' => 'ai-services',
    ];

    const SEMANTIC_TAG_RULES = [
        'scheduled' => ['scheduled', 'cron'],
        'sync' => ['sync', 'reconcil'],
        'retry' => ['retry', 'failed'],
        'onboarding' => ['onboard'],
        'moderation' => ['moderat'],
        'verification' => ['verif'],
        'analytics' => ['analytic'],
        'notifications' => ['notif', 'dispatch'],
        'fulfillment' => ['order', 'fulfil'],
        'booking' => ['booking', 'reserv'],
    ];

    public function getQueueMap(): array
    {
        return self::QUEUE_SYSTEM_MAP;
    }

    public function getFullMap(): array
    {
        return [
            'queues' => self::QUEUE_SYSTEM_MAP,
            'systems' => self::SYSTEMS,
            'domains' => self::DOMAINS,
        ];
    }

    public function resolveQueue(string $queueName): array
    {
        if (isset(self::QUEUE_SYSTEM_MAP[$queueName])) {
            return self::QUEUE_SYSTEM_MAP[$queueName];
        }

        foreach (self::PREFIX_SYSTEM_MAP as $prefix => $system) {
            if (str_starts_with($queueName, $prefix)) {
                $domain = self::QUEUE_SYSTEM_MAP[$prefix . '-queue']['domain'] ?? $prefix;
                return [
                    'system' => $system,
                    'domain' => $domain,
                    'description' => 'Auto-inferred from prefix: ' . $prefix,
                ];
            }
        }

        return [
            'system' => 'cityos-core',
            'domain' => 'core',
            'description' => 'Unregistered queue (defaulted to cityos-core)',
        ];
    }

    public function inferTags(string $workflowType, array $taskQueues): array
    {
        $tags = [];
        $systems = [];
        $domains = [];

        foreach ($taskQueues as $queue) {
            $resolved = $this->resolveQueue($queue);
            $systems[$resolved['system']] = true;
            $domains[$resolved['domain']] = true;
            $tags['queue:' . $queue] = true;
        }

        foreach (array_keys($systems) as $system) {
            $tags['system:' . $system] = true;
        }

        foreach (array_keys($domains) as $domain) {
            $tags['domain:' . $domain] = true;
        }

        if (count($taskQueues) > 1) {
            $tags['multi-queue'] = true;
        }

        $lowerType = strtolower($workflowType);
        foreach (self::SEMANTIC_TAG_RULES as $tag => $patterns) {
            foreach ($patterns as $pattern) {
                if (str_contains($lowerType, $pattern)) {
                    $tags[$tag] = true;
                    break;
                }
            }
        }

        $result = array_keys($tags);
        sort($result);
        return $result;
    }

    public function inferPrimarySystem(array $taskQueues): string
    {
        if (empty($taskQueues)) {
            return 'cityos-core';
        }

        $resolved = $this->resolveQueue($taskQueues[0]);
        return $resolved['system'];
    }

    public function inferDomain(array $taskQueues): string
    {
        if (empty($taskQueues)) {
            return 'core';
        }

        $resolved = $this->resolveQueue($taskQueues[0]);
        return $resolved['domain'];
    }

    public function getQueuesForSystem(string $systemId): array
    {
        $result = [];
        foreach (self::QUEUE_SYSTEM_MAP as $queue => $info) {
            if ($info['system'] === $systemId) {
                $result[$queue] = $info;
            }
        }
        return $result;
    }
}
