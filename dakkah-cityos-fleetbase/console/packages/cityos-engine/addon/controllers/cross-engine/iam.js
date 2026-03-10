import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class CrossEngineIamController extends Controller {
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
            { entity: 'Roles', scope: 'Tenant tier scope', icon: 'user-tag', fields: ['tenant_id', 'tier_level', 'role_scope'], description: 'Roles are scoped to tenant tiers. Higher-tier tenants can define roles that cascade to sub-tenants in the hierarchy.' },
            { entity: 'Users', scope: 'Clearance level + residency zone', icon: 'user-shield', fields: ['clearance_level', 'residency_zone', 'tenant_id'], description: 'Users have clearance levels that determine data access. Residency zone restricts which geographic data they can view or modify.' },
            { entity: 'Permissions', scope: 'Cascading from governance chain', icon: 'key', fields: ['governance_chain_id', 'permission_set', 'cascade_level'], description: 'Permissions cascade through the governance chain. Country-level policies propagate to cities, then to tenants, with each level able to restrict (never expand) access.' },
            { entity: 'Policies', scope: 'Node-attached governance', icon: 'file-shield', fields: ['node_id', 'policy_type', 'enforcement_level'], description: 'Policies attach to nodes in the hierarchy. Enforcement levels determine whether policies are advisory, enforced, or mandatory at each tier.' },
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
