import Route from '@ember/routing/route';

export default class GovernanceIndexRoute extends Route {
    model() {
        return {
            fields: [
                { name: 'country_uuid', source: 'URL / JWT', description: 'Identifies the country scope for the current request' },
                { name: 'city_uuid', source: 'URL / JWT', description: 'Identifies the city within the country hierarchy' },
                { name: 'sector_uuid', source: 'URL / DB lookup', description: 'Sector classification for the current context' },
                { name: 'category_uuid', source: 'URL / DB lookup', description: 'Category within the sector hierarchy' },
                { name: 'tenant_uuid', source: 'JWT / DB lookup', description: 'The active tenant for multi-tenancy isolation' },
                { name: 'channel_uuid', source: 'URL / DB lookup', description: 'Distribution channel for the tenant' },
                { name: 'surface_uuid', source: 'URL / DB lookup', description: 'Storefront surface within the channel' },
                { name: 'portal_uuid', source: 'URL / DB lookup', description: 'Portal entry point for the surface' },
                { name: 'locale', source: 'Header / JWT', description: 'Language and regional preference (e.g., ar-SA, en-US)' },
                { name: 'currency', source: 'DB lookup', description: 'Currency code derived from country/tenant settings' },
            ],
            residency_rules: [
                { classification: 'Sovereign', color: 'bg-red-500', description: 'PII and financial data must remain within country borders' },
                { classification: 'Regional', color: 'bg-yellow-500', description: 'Operational data restricted to MENA region' },
                { classification: 'Global', color: 'bg-green-500', description: 'Aggregated analytics and public content can be processed globally' },
            ],
            isolation_policies: [
                { name: 'Database Row-Level Security', description: 'All queries are scoped by tenant_uuid using RLS policies' },
                { name: 'API Scope Enforcement', description: 'Every API request must include valid NodeContext with tenant scope' },
                { name: 'Storage Isolation', description: 'File uploads are namespaced by tenant and surface' },
                { name: 'Cache Partitioning', description: 'Cache keys are prefixed with tenant_uuid to prevent cross-tenant leaks' },
            ],
        };
    }
}
