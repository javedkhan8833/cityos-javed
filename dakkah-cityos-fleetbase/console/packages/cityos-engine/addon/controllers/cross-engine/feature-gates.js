import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class CrossEngineFeatureGatesController extends Controller {
    @service('node-context') nodeContext;
    @service('cityos') cityosService;
    @tracked featureFlags = [];
    @tracked isLoading = false;
    @tracked selectedTier = 'all';
    @tracked toggleMessage = null;

    get hasContext() {
        return this.nodeContext.hasContext;
    }

    get tierOptions() {
        return ['all', 'franchisor', 'master', 'regional', 'sub', 'operator'];
    }

    get tierLabels() {
        return {
            franchisor: { label: 'Franchisor', class: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
            master: { label: 'Master', class: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
            regional: { label: 'Regional', class: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
            sub: { label: 'Sub', class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
            operator: { label: 'Operator', class: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
        };
    }

    get filteredFlags() {
        if (this.selectedTier === 'all') return this.featureFlags;
        return this.featureFlags.filter(f =>
            f.allowed_tiers?.includes(this.selectedTier) || !f.allowed_tiers
        );
    }

    get featureGroups() {
        const groups = {};
        (this.featureFlags || []).forEach(flag => {
            const module = flag.key?.split('.')?.[0] || 'general';
            if (!groups[module]) groups[module] = { name: module, flags: [] };
            groups[module].flags.push(flag);
        });
        return Object.values(groups);
    }

    get tiers() {
        return ['franchisor', 'master', 'regional', 'sub', 'operator'];
    }

    get matrixRows() {
        return (this.featureFlags || []).map(flag => {
            const tierStates = {};
            this.tiers.forEach(tier => {
                tierStates[tier] = flag.allowed_tiers?.includes(tier) ?? flag.enabled;
            });
            return { ...flag, tierStates };
        });
    }

    constructor() {
        super(...arguments);
        this.loadFeatureGates();
    }

    @action
    async loadFeatureGates() {
        this.isLoading = true;
        try {
            let response = await this.cityosService.getFeatureGateMatrix({});
            if (!response?.data && !response?.flags && !response?.feature_flags) {
                response = await this.cityosService.evaluateFeatureFlags({});
            }
            this.featureFlags = response?.data || response?.flags || response?.feature_flags || [];
        } catch (e) {
            this.featureFlags = [];
        }
        this.isLoading = false;
    }

    @action
    setTierFilter(event) {
        this.selectedTier = event.target.value;
    }

    @action
    async toggleGate(featureKey, tier) {
        const row = this.matrixRows.find(r => r.key === featureKey);
        if (!row) return;
        const currentState = row.tierStates[tier];
        this.toggleMessage = null;
        try {
            const result = await this.cityosService.toggleFeatureGate(featureKey, tier, !currentState);
            this.toggleMessage = result?.success !== false
                ? `${featureKey} ${!currentState ? 'enabled' : 'disabled'} for ${tier} tier`
                : `Failed: ${result?.error || 'Unknown error'}`;
            await this.loadFeatureGates();
        } catch (e) {
            this.toggleMessage = `Error: ${e.message}`;
        }
    }
}
