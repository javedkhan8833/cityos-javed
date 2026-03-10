<?php

namespace Fleetbase\CityOS\Services;

class SystemsRegistryService
{
    public function getRegistry(): array
    {
        return [
            [
                'id' => 'cms-payload',
                'name' => 'Payload CMS',
                'type' => $this->resolveType('CITYOS_CMS_BASE_URL'),
                'category' => 'cms',
                'status' => $this->resolveStatus('CITYOS_CMS_BASE_URL'),
                'capabilities' => ['content-management', 'media', 'users', 'localization'],
                'hasBaseUrl' => !empty(config('cityos.integrations.cms.base_url')),
            ],
            [
                'id' => 'cms-bff',
                'name' => 'CMS BFF Layer',
                'type' => 'internal',
                'category' => 'cms',
                'status' => 'active',
                'capabilities' => ['content-aggregation', 'navigation', 'catalog', 'tenant-resolution'],
                'hasBaseUrl' => true,
            ],
            [
                'id' => 'commerce-medusa',
                'name' => 'Medusa Commerce',
                'type' => $this->resolveType('MEDUSA_BASE_URL'),
                'category' => 'commerce',
                'status' => $this->resolveStatus('MEDUSA_BASE_URL'),
                'capabilities' => ['product-catalog', 'cart', 'checkout', 'orders', 'inventory'],
                'hasBaseUrl' => !empty(env('MEDUSA_BASE_URL')),
            ],
            [
                'id' => 'identity-auth',
                'name' => 'CityOS Identity',
                'type' => 'internal',
                'category' => 'identity',
                'status' => 'active',
                'capabilities' => ['authentication', 'authorization', 'rbac', 'api-keys', 'sessions'],
                'hasBaseUrl' => true,
            ],
            [
                'id' => 'payments-stripe',
                'name' => 'Stripe Payments',
                'type' => 'stub',
                'category' => 'payments',
                'status' => env('STRIPE_SECRET_KEY') ? 'active' : 'planned',
                'capabilities' => ['payment-processing', 'subscriptions', 'invoicing', 'refunds'],
                'hasBaseUrl' => !empty(env('STRIPE_SECRET_KEY')),
            ],
            [
                'id' => 'analytics-internal',
                'name' => 'CityOS Analytics',
                'type' => 'internal',
                'category' => 'analytics',
                'status' => 'planned',
                'capabilities' => ['event-tracking', 'dashboards', 'reporting', 'real-time-metrics'],
                'hasBaseUrl' => false,
            ],
            [
                'id' => 'communication-email',
                'name' => 'Email Service',
                'type' => 'stub',
                'category' => 'communication',
                'status' => config('mail.default') !== 'log' ? 'active' : 'planned',
                'capabilities' => ['transactional-email', 'templates', 'bulk-email'],
                'hasBaseUrl' => false,
            ],
            [
                'id' => 'communication-sms',
                'name' => 'SMS Gateway',
                'type' => 'stub',
                'category' => 'communication',
                'status' => 'planned',
                'capabilities' => ['sms-delivery', 'otp', 'notifications'],
                'hasBaseUrl' => false,
            ],
            [
                'id' => 'infra-database',
                'name' => 'PostgreSQL',
                'type' => 'internal',
                'category' => 'infrastructure',
                'status' => 'active',
                'capabilities' => ['data-persistence', 'transactions', 'full-text-search', 'json'],
                'hasBaseUrl' => true,
            ],
            [
                'id' => 'infra-cache',
                'name' => 'Redis Cache',
                'type' => 'stub',
                'category' => 'infrastructure',
                'status' => config('cache.default') === 'redis' ? 'active' : 'planned',
                'capabilities' => ['key-value-cache', 'session-store', 'rate-limiting', 'pub-sub'],
                'hasBaseUrl' => false,
            ],
            [
                'id' => 'infra-storage',
                'name' => 'Object Storage',
                'type' => 'internal',
                'category' => 'infrastructure',
                'status' => 'active',
                'capabilities' => ['file-upload', 'media-storage', 'cdn-origin', 'presigned-urls', 's3'],
                'hasBaseUrl' => !empty(env('MINIO_ENDPOINT')),
            ],
            [
                'id' => 'observability-health',
                'name' => 'Health Monitor',
                'type' => 'internal',
                'category' => 'infrastructure',
                'status' => 'active',
                'capabilities' => ['health-checks', 'readiness-probes', 'liveness-probes'],
                'hasBaseUrl' => true,
            ],
            [
                'id' => 'observability-metrics',
                'name' => 'Metrics Collector',
                'type' => 'internal',
                'category' => 'analytics',
                'status' => 'active',
                'capabilities' => ['prometheus-metrics', 'custom-counters', 'latency-tracking'],
                'hasBaseUrl' => false,
            ],
            [
                'id' => 'search-elasticsearch',
                'name' => 'Elasticsearch',
                'type' => 'stub',
                'category' => 'infrastructure',
                'status' => 'planned',
                'capabilities' => ['full-text-search', 'faceted-search', 'autocomplete', 'geo-search'],
                'hasBaseUrl' => false,
            ],
            [
                'id' => 'geo-mapping',
                'name' => 'Mapping Service',
                'type' => 'stub',
                'category' => 'logistics',
                'status' => 'planned',
                'capabilities' => ['geocoding', 'directions', 'poi-mapping', 'geofencing'],
                'hasBaseUrl' => false,
            ],
            [
                'id' => 'ai-recommendations',
                'name' => 'AI Engine',
                'type' => 'stub',
                'category' => 'analytics',
                'status' => 'planned',
                'capabilities' => ['recommendations', 'personalization', 'embeddings', 'similarity'],
                'hasBaseUrl' => false,
            ],
            [
                'id' => 'logistics-delivery',
                'name' => 'Delivery Service',
                'type' => 'stub',
                'category' => 'logistics',
                'status' => 'planned',
                'capabilities' => ['delivery-tracking', 'route-optimization', 'scheduling'],
                'hasBaseUrl' => false,
            ],
            [
                'id' => 'iot-platform',
                'name' => 'IoT Devices',
                'type' => 'stub',
                'category' => 'infrastructure',
                'status' => 'planned',
                'capabilities' => ['device-registration', 'telemetry', 'firmware-updates'],
                'hasBaseUrl' => false,
            ],
            [
                'id' => 'social-platform',
                'name' => 'Social Media',
                'type' => 'stub',
                'category' => 'communication',
                'status' => 'planned',
                'capabilities' => ['post-publishing', 'audience-insights', 'engagement'],
                'hasBaseUrl' => false,
            ],
            [
                'id' => 'workflow-temporal',
                'name' => 'Temporal Workflows',
                'type' => $this->resolveType('TEMPORAL_API_KEY'),
                'category' => 'workflow',
                'status' => $this->resolveStatus('TEMPORAL_API_KEY'),
                'capabilities' => ['workflow-orchestration', 'activities', 'signals', 'queries', 'task-queues'],
                'hasBaseUrl' => !empty(env('TEMPORAL_ADDRESS', env('TEMPORAL_ENDPOINT'))),
            ],
            [
                'id' => 'erp-erpnext',
                'name' => 'ERPNext',
                'type' => $this->resolveType('ERPNEXT_BASE_URL'),
                'category' => 'erp',
                'status' => $this->resolveStatus('ERPNEXT_BASE_URL'),
                'capabilities' => ['accounting', 'invoicing', 'payouts', 'purchase-orders', 'tax'],
                'hasBaseUrl' => !empty(env('ERPNEXT_BASE_URL')),
            ],
            [
                'id' => 'logistics-fleetbase',
                'name' => 'Fleetbase Logistics',
                'type' => 'internal',
                'category' => 'logistics',
                'status' => 'active',
                'capabilities' => ['delivery-tracking', 'fleet-management', 'proof-of-delivery'],
                'hasBaseUrl' => true,
            ],
        ];
    }

    public function getSummary(): array
    {
        $registry = $this->getRegistry();
        $active = collect($registry)->where('status', 'active')->count();
        $external = collect($registry)->where('type', 'external')->count();

        return [
            'total' => count($registry),
            'active' => $active,
            'external' => $external,
            'registry' => $registry,
        ];
    }

    private function resolveType(string $envKey): string
    {
        return env($envKey) ? 'external' : 'stub';
    }

    private function resolveStatus(string $envKey): string
    {
        return env($envKey) ? 'active' : 'planned';
    }
}
