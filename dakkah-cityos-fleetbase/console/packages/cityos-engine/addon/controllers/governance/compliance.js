import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class GovernanceComplianceController extends Controller {
    @service('cityos') cityosService;
    @tracked tenantHandle = '';
    @tracked operation = 'read';
    @tracked result = null;
    @tracked isLoading = false;
    @tracked error = null;

    get operations() {
        return ['read', 'write', 'export', 'delete'];
    }

    get hasViolations() {
        return this.result?.violations?.length > 0;
    }

    get violationCount() {
        return this.result?.violations?.length || 0;
    }

    @action
    async checkCompliance() {
        if (!this.tenantHandle) return;
        this.isLoading = true;
        this.error = null;
        try {
            const response = await this.cityosService.checkCompliance(this.tenantHandle, this.operation);
            this.result = response?.data || response;
        } catch (e) {
            this.error = e.message;
            this.result = null;
        }
        this.isLoading = false;
    }

    @action
    updateTenantHandle(event) {
        this.tenantHandle = event.target.value;
    }

    @action
    updateOperation(event) {
        this.operation = event.target.value;
    }
}
