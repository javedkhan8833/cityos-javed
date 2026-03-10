import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class IntegrationsLogsController extends Controller {
    @service('cityos') cityosService;
    @tracked logs = [];
    @tracked isLoading = true;
    @tracked filterIntegration = '';
    @tracked filterStatus = '';

    constructor() {
        super(...arguments);
        this.loadLogs();
    }

    @action async loadLogs() {
        this.isLoading = true;
        try {
            const params = {};
            if (this.filterIntegration) params.integration = this.filterIntegration;
            if (this.filterStatus) params.status = this.filterStatus;
            this.logs = await this.cityosService.getIntegrationLogs(params);
        } catch (e) { this.logs = []; }
        this.isLoading = false;
    }

    @action updateFilterIntegration(event) { this.filterIntegration = event.target.value; this.loadLogs(); }
    @action updateFilterStatus(event) { this.filterStatus = event.target.value; this.loadLogs(); }
}
