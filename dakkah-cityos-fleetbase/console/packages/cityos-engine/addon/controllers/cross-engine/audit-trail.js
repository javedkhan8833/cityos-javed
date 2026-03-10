import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class CrossEngineAuditTrailController extends Controller {
    @service('node-context') nodeContext;
    @service('cityos') cityosService;
    @tracked auditEvents = [];
    @tracked isLoading = false;
    @tracked selectedModule = 'all';
    @tracked selectedAction = 'all';
    @tracked correlationSearch = '';
    @tracked expandedEventId = null;

    get hasContext() {
        return this.nodeContext.hasContext;
    }

    get moduleOptions() {
        return ['all', 'fleetops', 'pallet', 'storefront', 'core'];
    }

    get actionOptions() {
        return ['all', 'CREATED', 'UPDATED', 'DELETED'];
    }

    get filteredEvents() {
        let result = this.auditEvents || [];
        if (this.selectedModule !== 'all') {
            result = result.filter(e => {
                const module = e.payload?.source?.module || '';
                return module === this.selectedModule;
            });
        }
        if (this.selectedAction !== 'all') {
            result = result.filter(e => {
                const action = e.payload?.payload?.action || e.event_type?.split('_').pop() || '';
                return action === this.selectedAction;
            });
        }
        if (this.correlationSearch) {
            const search = this.correlationSearch.toLowerCase();
            result = result.filter(e =>
                (e.correlation_id || '').toLowerCase().includes(search) ||
                (e.event_id || '').toLowerCase().includes(search) ||
                (e.event_type || '').toLowerCase().includes(search)
            );
        }
        return result;
    }

    get timelineEvents() {
        return this.filteredEvents.map(event => {
            const module = event.payload?.source?.module || 'unknown';
            const action = event.payload?.payload?.action || event.event_type?.split('_').pop() || 'UNKNOWN';
            const modelType = event.payload?.payload?.model_type?.split('\\').pop() || 'Unknown';
            const timestamp = event.payload?.payload?.timestamp || event.created_at || '';

            const moduleConfig = {
                fleetops: { icon: 'truck', color: 'blue', label: 'FleetOps' },
                pallet: { icon: 'warehouse', color: 'amber', label: 'Pallet WMS' },
                storefront: { icon: 'store', color: 'green', label: 'Storefront' },
                core: { icon: 'cog', color: 'gray', label: 'Core' },
                unknown: { icon: 'question', color: 'gray', label: 'Unknown' },
            };

            const actionConfig = {
                CREATED: { icon: 'plus-circle', class: 'text-green-500' },
                UPDATED: { icon: 'pen', class: 'text-blue-500' },
                DELETED: { icon: 'trash', class: 'text-red-500' },
                UNKNOWN: { icon: 'circle-question', class: 'text-gray-500' },
            };

            const mc = moduleConfig[module] || moduleConfig.unknown;
            const ac = actionConfig[action] || actionConfig.UNKNOWN;

            return {
                ...event,
                module,
                action,
                modelType,
                timestamp,
                moduleIcon: mc.icon,
                moduleColor: mc.color,
                moduleLabel: mc.label,
                actionIcon: ac.icon,
                actionClass: ac.class,
                changedFields: event.payload?.payload?.changed_fields || [],
                nodeContext: event.payload?.node_context || event.node_context || {},
                correlationId: event.correlation_id || '',
                shortCorrelationId: (event.correlation_id || '').substring(0, 8),
            };
        });
    }

    constructor() {
        super(...arguments);
        this.loadAuditTrail();
    }

    @action
    async loadAuditTrail() {
        this.isLoading = true;
        try {
            const response = await this.cityosService.getAuditTrail({});
            this.auditEvents = response?.data || response?.events || [];
        } catch (e) {
            this.auditEvents = [];
        }
        this.isLoading = false;
    }

    @action
    setModuleFilter(event) {
        this.selectedModule = event.target.value;
    }

    @action
    setActionFilter(event) {
        this.selectedAction = event.target.value;
    }

    @action
    setCorrelationSearch(event) {
        this.correlationSearch = event.target.value;
    }

    @action
    toggleEventDetails(eventId) {
        this.expandedEventId = this.expandedEventId === eventId ? null : eventId;
    }

    @action
    refresh() {
        this.loadAuditTrail();
    }
}
