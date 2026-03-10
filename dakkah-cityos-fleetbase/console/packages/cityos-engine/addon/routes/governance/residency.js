import Route from '@ember/routing/route';

export default class GovernanceResidencyRoute extends Route {
    model() {
        return {
            sovereign: [
                'Personal Identifiable Information (PII)',
                'Financial transaction records',
                'Government-issued identifiers',
                'Authentication credentials',
                'Health and medical data',
            ],
            regional: [
                'Business operational data',
                'Tenant configurations',
                'Order and inventory records',
                'Customer communication logs',
                'Employee records',
            ],
            global: [
                'Aggregated analytics',
                'Public product catalogs',
                'Published content pages',
                'System health metrics',
                'Documentation and guides',
            ],
            regions: [
                { name: 'me-central-1', location: 'Saudi Arabia (Riyadh)', primary: true },
                { name: 'me-south-1', location: 'UAE (Dubai)', primary: false },
                { name: 'eu-west-1', location: 'Europe (Ireland)', primary: false },
                { name: 'ap-southeast-1', location: 'Asia Pacific (Singapore)', primary: false },
            ],
        };
    }
}
