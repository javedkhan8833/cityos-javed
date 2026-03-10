import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class CrossEngineEventBridgeController extends Controller {
    @service('node-context') nodeContext;
    @service('cityos') cityosService;
    @tracked stats = null;
    @tracked events = [];
    @tracked isLoading = false;
    @tracked isRefreshing = false;
    @tracked selectedModule = 'all';
    @tracked selectedStatus = 'all';
    @tracked autoRefresh = false;
    @tracked refreshTimer = null;

    get hasContext() {
        return this.nodeContext.hasContext;
    }

    get moduleOptions() {
        return ['all', 'fleetops', 'pallet', 'storefront', 'core'];
    }

    get statusOptions() {
        return ['all', 'pending', 'published', 'failed', 'dead_letter'];
    }

    get filteredEvents() {
        let result = this.events || [];
        if (this.selectedModule !== 'all') {
            result = result.filter(e => {
                const module = (e.payload?.source?.module || '').toLowerCase();
                const eventType = (e.event_type || '').toLowerCase();
                const selected = this.selectedModule.toLowerCase();
                return module === selected || eventType.startsWith(selected);
            });
        }
        if (this.selectedStatus !== 'all') {
            result = result.filter(e => e.status === this.selectedStatus);
        }
        return result;
    }

    get pendingCount() { return this.stats?.pending || 0; }
    get publishedCount() { return this.stats?.published || 0; }
    get failedCount() { return this.stats?.failed || 0; }
    get deadLetterCount() { return this.stats?.dead_letter || 0; }

    constructor() {
        super(...arguments);
        this.loadData();
    }

    @action
    async loadData() {
        this.isLoading = true;
        try {
            const [statsResp, eventsResp] = await Promise.all([
                this.cityosService.getEventBridgeStats(),
                this.cityosService.getEventBridgeStream({ limit: 100 }),
            ]);
            this.stats = statsResp?.data || statsResp || {};
            this.events = eventsResp?.data || eventsResp?.events || [];
        } catch (e) {
            this.stats = {};
            this.events = [];
        }
        this.isLoading = false;
    }

    @action
    async refreshEvents() {
        this.isRefreshing = true;
        try {
            const eventsResp = await this.cityosService.getEventBridgeStream({ limit: 100 });
            this.events = eventsResp?.data || eventsResp?.events || [];
            const statsResp = await this.cityosService.getEventBridgeStats();
            this.stats = statsResp?.data || statsResp || {};
        } catch (e) {}
        this.isRefreshing = false;
    }

    @action
    setModuleFilter(event) {
        this.selectedModule = event.target.value;
    }

    @action
    setStatusFilter(event) {
        this.selectedStatus = event.target.value;
    }

    @action
    toggleAutoRefresh() {
        this.autoRefresh = !this.autoRefresh;
        if (this.autoRefresh) {
            this.refreshTimer = setInterval(() => this.refreshEvents(), 10000);
        } else if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    willDestroy() {
        super.willDestroy(...arguments);
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
    }
}
