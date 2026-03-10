import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class CrossEngineFleetopsController extends Controller {
    @service('node-context') nodeContext;
    @service('cityos') cityosService;
    @tracked scopingRules = null;
    @tracked isLoading = false;

    get hasContext() {
        return this.nodeContext.hasContext;
    }

    get contextHeaders() {
        return this.nodeContext.contextHeaders;
    }

    get operationScopes() {
        return [
            { entity: 'Orders', scope: 'Filtered by tenant + country', icon: 'clipboard-list', fields: ['tenant_id', 'country_code', 'city_id'], description: 'Orders are scoped to the active tenant and country. Cross-tenant orders require elevated permissions.' },
            { entity: 'Drivers', scope: 'Filtered by tenant assignment', icon: 'id-card', fields: ['assigned_tenant_id', 'operating_country'], description: 'Drivers belong to a specific tenant and operate within assigned countries/cities.' },
            { entity: 'Vehicles', scope: 'Filtered by tenant fleet', icon: 'truck', fields: ['fleet_tenant_id', 'registration_country'], description: 'Vehicles are registered under tenant fleets and linked to country-specific regulations.' },
            { entity: 'Service Areas', scope: 'Linked to CityOS nodes', icon: 'map', fields: ['node_id', 'city_id', 'sector_id'], description: 'Service areas map directly to CityOS node hierarchy (city → sector → category).' },
            { entity: 'Service Rates', scope: 'Governance-based currency', icon: 'money-bill', fields: ['currency', 'tax_authority_id'], description: 'Service rates inherit currency and tax rules from governance chain policies.' },
            { entity: 'Routes', scope: 'City-scoped routing', icon: 'route', fields: ['origin_city_id', 'destination_city_id'], description: 'Routes operate within or between cities, respecting cross-border governance rules.' },
        ];
    }

    constructor() {
        super(...arguments);
        this.loadScopingRules();
    }

    @action
    async loadScopingRules() {
        this.isLoading = true;
        try {
            const response = await this.cityosService.resolveContext(this.nodeContext.activeFilters);
            this.scopingRules = response;
        } catch (e) {}
        this.isLoading = false;
    }
}
