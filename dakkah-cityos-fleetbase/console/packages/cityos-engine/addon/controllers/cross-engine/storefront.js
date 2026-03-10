import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class CrossEngineStorefrontController extends Controller {
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
            { entity: 'Products', scope: 'Filtered by tenant + channel', icon: 'tag', fields: ['tenant_id', 'channel_id', 'surface_id'], description: 'Products are scoped to tenant and filtered through channel assignments. Surface-level visibility controls which storefronts display each product.' },
            { entity: 'Orders', scope: 'Tenant → channel → surface chain', icon: 'shopping-cart', fields: ['tenant_id', 'channel_id', 'surface_id', 'country_code'], description: 'Orders flow through the tenant → channel → surface hierarchy. Currency and tax rules are inherited from the governance chain.' },
            { entity: 'Networks', scope: 'Aligned with CityOS surfaces', icon: 'network-wired', fields: ['surface_node_id', 'network_type', 'coverage_area'], description: 'Storefront networks align with CityOS surface structures. Each network maps to a surface node for geographic coverage.' },
            { entity: 'Catalogs', scope: 'Scoped by country + tenant', icon: 'book', fields: ['country_code', 'tenant_id', 'catalog_type'], description: 'Catalogs are country-specific and tenant-scoped. Product availability and pricing vary by country governance rules.' },
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
