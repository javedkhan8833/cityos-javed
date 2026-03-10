import Route from '@ember/routing/route';

export default class GovernancePoliciesRoute extends Route {
    model() {
        return {
            tenant_isolation: [
                { name: 'Database Row-Level Security', description: 'All database queries are automatically scoped by tenant_uuid using PostgreSQL RLS policies' },
                { name: 'API Scope Enforcement', description: 'Every API request must carry a valid NodeContext; requests without tenant scope are rejected' },
                { name: 'Storage Namespace Isolation', description: 'File uploads and media assets are namespaced by tenant_uuid and surface_uuid' },
                { name: 'Cache Key Partitioning', description: 'All cache entries are prefixed with tenant_uuid to prevent cross-tenant data leaks' },
                { name: 'Workflow Isolation', description: 'Temporal workflows are tagged with tenant context and cannot access cross-tenant data' },
            ],
            data_classification: [
                { level: 'Confidential', color: 'bg-red-500', description: 'PII, financial records, authentication credentials' },
                { level: 'Internal', color: 'bg-yellow-500', description: 'Business operations data, tenant configurations' },
                { level: 'Public', color: 'bg-green-500', description: 'Published content, public API responses, aggregated analytics' },
            ],
            rate_limits: [
                { scope: 'Per Tenant', limit: '1000 req/min', window: '1 minute' },
                { scope: 'Per Surface', limit: '500 req/min', window: '1 minute' },
                { scope: 'Per Portal', limit: '200 req/min', window: '1 minute' },
                { scope: 'Admin API', limit: '100 req/min', window: '1 minute' },
                { scope: 'Webhook Outbox', limit: '50 req/min', window: '1 minute' },
            ],
            audit_requirements: [
                { name: 'Authentication Events', description: 'All login, logout, and token refresh events must be logged with IP and user agent' },
                { name: 'Data Mutations', description: 'All create, update, and delete operations must be recorded with before/after state' },
                { name: 'Admin Actions', description: 'Configuration changes, tenant provisioning, and hierarchy modifications are audit-logged' },
                { name: 'Integration Events', description: 'External API calls, webhook deliveries, and sync operations are tracked' },
                { name: 'Access Control', description: 'Permission checks, role assignments, and scope violations are recorded' },
            ],
        };
    }
}
