<?php

namespace Fleetbase\CityOS\Services;

class CapabilitiesService
{
    public function getCapabilities(): array
    {
        return [
            'plugins' => $this->getPlugins(),
            'features' => $this->getFeatures(),
            'endpoints' => $this->getEndpoints(),
        ];
    }

    public function getPlugins(): array
    {
        return [
            'official' => [
                'multi-tenant',
                'search',
                'seo',
                'richtext-lexical',
                'form-builder',
                'nested-docs',
                'redirects',
                'mcp',
                'import-export',
                'cloud-storage',
            ],
            'community' => [
                'docs-reorder',
                'fields-select',
                'translator',
                'better-fields',
                'totp-2fa',
            ],
            'custom' => [
                'openapi-generator',
                'rbac-utils',
                'author-fields',
                'localized-slug',
                'event-tracking',
                'tree-list-view',
                'visual-editor',
                'video-processing',
            ],
        ];
    }

    public function getFeatures(): array
    {
        return [
            'twoFactorAuth' => true,
            'rbac' => true,
            'multiTenancy' => true,
            'localization' => [
                'locales' => ['en', 'fr', 'ar'],
                'defaultLocale' => 'en',
            ],
            'objectStorage' => true,
            'videoProcessing' => true,
            'openApiDocs' => true,
            'aiContent' => !empty(env('OPENAI_API_KEY')),
            'analytics' => !empty(env('PLAUSIBLE_API_KEY')),
            'payments' => !empty(env('STRIPE_SECRET_KEY')),
            'errorTracking' => !empty(env('SENTRY_DSN')),
            'workflowOrchestration' => !empty(env('TEMPORAL_API_KEY')),
        ];
    }

    public function getEndpoints(): array
    {
        return [
            'platform' => [
                ['path' => '/api/platform/context', 'method' => 'GET', 'auth' => 'none', 'purpose' => 'Full context resolution'],
                ['path' => '/api/platform/tenants/default', 'method' => 'GET', 'auth' => 'none', 'purpose' => 'Default tenant bootstrap'],
                ['path' => '/api/platform/capabilities', 'method' => 'GET', 'auth' => 'none', 'purpose' => 'Plugin/feature/endpoint discovery'],
            ],
            'health' => [
                ['path' => '/api/health', 'method' => 'GET', 'auth' => 'none', 'purpose' => 'System health'],
            ],
            'hierarchy' => [
                ['path' => '/cityos/v1/hierarchy/tree', 'method' => 'GET', 'auth' => 'none', 'purpose' => 'Node hierarchy tree'],
                ['path' => '/cityos/v1/hierarchy/resolve', 'method' => 'GET', 'auth' => 'none', 'purpose' => 'Context resolution'],
                ['path' => '/cityos/int/v1/hierarchy/tree', 'method' => 'GET', 'auth' => 'bearer', 'purpose' => 'Admin hierarchy tree'],
                ['path' => '/cityos/int/v1/hierarchy/stats', 'method' => 'GET', 'auth' => 'bearer', 'purpose' => 'Hierarchy statistics'],
            ],
            'integrations' => [
                ['path' => '/cityos/int/v1/integrations/status', 'method' => 'GET', 'auth' => 'bearer', 'purpose' => 'Integration status dashboard'],
                ['path' => '/cityos/int/v1/integrations/temporal/*', 'method' => 'GET/POST', 'auth' => 'bearer', 'purpose' => 'Temporal Cloud management'],
                ['path' => '/cityos/int/v1/integrations/cms/*', 'method' => 'GET', 'auth' => 'bearer', 'purpose' => 'Payload CMS operations'],
                ['path' => '/cityos/int/v1/integrations/erpnext/*', 'method' => 'GET/POST', 'auth' => 'bearer', 'purpose' => 'ERPNext operations'],
                ['path' => '/cityos/int/v1/integrations/outbox/*', 'method' => 'GET/POST', 'auth' => 'bearer', 'purpose' => 'CityBus outbox management'],
            ],
            'bff' => [
                ['path' => '/api/bff/integrations', 'method' => 'GET', 'auth' => 'none', 'purpose' => 'Integration dashboard'],
                ['path' => '/api/bff/commerce/products', 'method' => 'GET/POST', 'auth' => 'correlation', 'purpose' => 'Products CRUD'],
                ['path' => '/api/bff/commerce/orders', 'method' => 'GET', 'auth' => 'correlation', 'purpose' => 'List orders'],
                ['path' => '/api/bff/commerce/orders/{id}', 'method' => 'GET', 'auth' => 'correlation', 'purpose' => 'Order detail'],
                ['path' => '/api/bff/commerce/orders/{id}/cancel', 'method' => 'POST', 'auth' => 'correlation', 'purpose' => 'Cancel order'],
                ['path' => '/api/bff/commerce/orders/{id}/fulfill', 'method' => 'POST', 'auth' => 'correlation', 'purpose' => 'Fulfill order'],
                ['path' => '/api/bff/commerce/customers', 'method' => 'GET', 'auth' => 'correlation', 'purpose' => 'List customers'],
                ['path' => '/api/bff/commerce/inventory', 'method' => 'GET', 'auth' => 'correlation', 'purpose' => 'Inventory levels'],
                ['path' => '/api/bff/commerce/analytics', 'method' => 'GET', 'auth' => 'correlation', 'purpose' => 'Commerce analytics'],
            ],
            'webhooks' => [
                ['path' => '/api/bff/integrations/webhooks/commerce', 'method' => 'POST', 'auth' => 'hmac', 'purpose' => 'Commerce webhook receiver'],
                ['path' => '/api/bff/integrations/webhooks/logistics', 'method' => 'POST', 'auth' => 'hmac', 'purpose' => 'Logistics webhook'],
                ['path' => '/api/bff/integrations/webhooks/erp', 'method' => 'POST', 'auth' => 'hmac', 'purpose' => 'ERP webhook'],
            ],
            'storage' => [
                ['path' => '/api/storage', 'method' => 'GET/POST', 'auth' => 'api-key', 'purpose' => 'List/create buckets'],
                ['path' => '/api/storage/{bucket}', 'method' => 'GET/DELETE', 'auth' => 'api-key', 'purpose' => 'Bucket operations'],
                ['path' => '/api/storage/{bucket}/{key}', 'method' => 'GET/PUT/DELETE/HEAD', 'auth' => 'api-key', 'purpose' => 'Object operations'],
                ['path' => '/api/storage/info', 'method' => 'GET', 'auth' => 'none', 'purpose' => 'Storage gateway info'],
            ],
        ];
    }
}
