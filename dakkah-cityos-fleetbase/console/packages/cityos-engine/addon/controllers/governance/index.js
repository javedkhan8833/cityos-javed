import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class GovernanceIndexController extends Controller {
    @service('cityos') cityosService;
    @tracked tenantHandle = '';
    @tracked countryCode = '';
    @tracked chainResult = null;
    @tracked tenantTree = null;
    @tracked nodeTree = null;
    @tracked isLoadingChain = false;
    @tracked isLoadingTenantTree = false;
    @tracked isLoadingNodeTree = false;
    @tracked chainError = null;

    constructor() {
        super(...arguments);
        this.loadTenantTree();
        this.loadNodeTree();
    }

    @action
    async resolveChain() {
        if (!this.tenantHandle && !this.countryCode) return;
        this.isLoadingChain = true;
        this.chainError = null;
        try {
            const params = {};
            if (this.tenantHandle) params.tenant = this.tenantHandle;
            if (this.countryCode) params.country = this.countryCode;
            const result = await this.cityosService.resolveGovernanceChain(params);
            this.chainResult = result?.data || result;
        } catch (e) {
            this.chainError = e.message;
        }
        this.isLoadingChain = false;
    }

    @action
    async loadTenantTree() {
        this.isLoadingTenantTree = true;
        try {
            const result = await this.cityosService.getTenantHierarchy({});
            this.tenantTree = result?.data || result;
        } catch (e) {
            this.tenantTree = null;
        }
        this.isLoadingTenantTree = false;
    }

    @action
    async loadNodeTree() {
        this.isLoadingNodeTree = true;
        try {
            const result = await this.cityosService.getNodeTree({});
            this.nodeTree = result?.data || result;
        } catch (e) {
            this.nodeTree = null;
        }
        this.isLoadingNodeTree = false;
    }

    @action
    async refreshAll() {
        await Promise.all([this.loadTenantTree(), this.loadNodeTree()]);
    }

    @action
    updateTenantHandle(event) {
        this.tenantHandle = event.target.value;
    }

    @action
    updateCountryCode(event) {
        this.countryCode = event.target.value;
    }
}
