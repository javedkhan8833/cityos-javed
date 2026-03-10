import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class IntegrationsTemporalController extends Controller {
    @service('cityos') cityosService;
    @tracked connection = null;
    @tracked workflows = null;
    @tracked registry = null;
    @tracked registryStats = null;
    @tracked isLoadingConnection = false;
    @tracked isLoadingWorkflows = false;
    @tracked isLoadingRegistry = false;
    @tracked isSyncing = false;
    @tracked selectedWorkflow = null;
    @tracked workflowDetail = null;
    @tracked isLoadingDetail = false;
    @tracked activeTab = 'workflows';
    @tracked error = null;

    constructor() {
        super(...arguments);
        this.loadAll();
    }

    @action async loadAll() {
        await Promise.all([this.loadConnection(), this.loadWorkflows(), this.loadRegistry()]);
    }

    @action async loadConnection() {
        this.isLoadingConnection = true;
        try { this.connection = await this.cityosService.getTemporalConnection(); } catch (e) { this.connection = null; }
        this.isLoadingConnection = false;
    }

    @action async loadWorkflows() {
        this.isLoadingWorkflows = true;
        try { this.workflows = await this.cityosService.getTemporalWorkflows({ page_size: 50 }); } catch (e) { this.workflows = null; }
        this.isLoadingWorkflows = false;
    }

    @action async loadRegistry() {
        this.isLoadingRegistry = true;
        try {
            const [registry, stats] = await Promise.all([
                this.cityosService.getTemporalRegistry(),
                this.cityosService.getTemporalRegistryStats(),
            ]);
            this.registry = registry;
            this.registryStats = stats;
        } catch (e) { this.registry = null; }
        this.isLoadingRegistry = false;
    }

    @action async viewWorkflow(workflowId) {
        this.isLoadingDetail = true;
        this.selectedWorkflow = workflowId;
        try { this.workflowDetail = await this.cityosService.describeTemporalWorkflow(workflowId); } catch (e) { this.workflowDetail = null; }
        this.isLoadingDetail = false;
    }

    @action closeDetail() { this.selectedWorkflow = null; this.workflowDetail = null; }

    @action async terminateWorkflow(workflowId) {
        try { await this.cityosService.terminateTemporalWorkflow(workflowId); await this.loadWorkflows(); } catch (e) { this.error = e.message; }
    }

    @action async triggerSync() {
        this.isSyncing = true;
        try { await this.cityosService.triggerTemporalSync(); await this.loadRegistry(); } catch (e) { this.error = e.message; }
        this.isSyncing = false;
    }

    @action setTab(tab) { this.activeTab = tab; }
}
