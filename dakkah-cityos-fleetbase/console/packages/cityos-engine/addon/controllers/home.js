import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class HomeController extends Controller {
    @service('cityos') cityosService;
    @tracked stats = {};
    @tracked hierarchyTree = [];
    @tracked integrations = {};
    @tracked isLoading = true;

    constructor() {
        super(...arguments);
        this.loadDashboard();
    }

    @action
    async loadDashboard() {
        this.isLoading = true;
        try {
            const [stats, tree, integrations] = await Promise.all([
                this.cityosService.loadStats(),
                this.cityosService.loadHierarchyTree(),
                this.cityosService.loadIntegrationStatus(),
            ]);
            this.stats = stats || {};
            this.hierarchyTree = tree || [];
            this.integrations = integrations || {};
        } catch (e) {
            this.stats = {};
            this.hierarchyTree = [];
            this.integrations = {};
        }
        this.isLoading = false;
    }

    get nodeContextFields() {
        return [
            { label: 'Country', source: 'Header/Path' },
            { label: 'City/Theme', source: 'Header/Path' },
            { label: 'Sector', source: 'Header/Path' },
            { label: 'Category', source: 'Header/Path' },
            { label: 'Tenant', source: 'Header/Cookie' },
            { label: 'Channel', source: 'Header/Cookie' },
            { label: 'Surface', source: 'Header/Cookie' },
            { label: 'Persona', source: 'Header/Cookie' },
            { label: 'Locale', source: 'BCP 47' },
            { label: 'Region', source: 'Header/Cookie' },
            { label: 'Residency', source: 'sovereign/regional' },
            { label: 'Subcategory', source: 'Header/Path' },
        ];
    }

    @action
    async refresh() {
        await this.loadDashboard();
    }
}
