import Route from '@ember/routing/route';

export default class IntegrationsErpnextRoute extends Route {
    model() {
        return {
            mode: 'stub',
            status: 'planned',
            description: 'ERPNext integration is in stub mode. The erpnext_company field on tenants is stored but not yet synced.',
            planned_features: [
                'Two-way company sync',
                'Financial reporting bridge',
                'Invoice & billing integration',
                'HR & employee management',
            ],
        };
    }
}
