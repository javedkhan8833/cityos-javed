import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class CrossEnginePalletController extends Controller {
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
            { entity: 'Warehouses', scope: 'Linked to FACILITY nodes', icon: 'warehouse', fields: ['facility_node_id', 'city_id', 'country_code'], description: 'Warehouses map to FACILITY-type nodes in the CityOS hierarchy. Location determines regulatory jurisdiction and tax authority.' },
            { entity: 'Products', scope: 'Data classification badge', icon: 'box', fields: ['classification_level', 'data_residency_zone', 'tenant_id'], description: 'Products inherit data classification from governance chain policies. Restricted products require elevated clearance.' },
            { entity: 'Inventory', scope: 'Residency zone indicator', icon: 'boxes-stacked', fields: ['residency_zone', 'warehouse_node_id', 'country_code'], description: 'Inventory records are bound to data residency zones. Cross-zone transfers require compliance verification.' },
            { entity: 'Batches', scope: 'Country-specific expiry rules', icon: 'layer-group', fields: ['expiry_jurisdiction', 'country_code', 'regulatory_body'], description: 'Batch expiry and recall rules follow country-specific regulations inherited from the governance chain.' },
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
