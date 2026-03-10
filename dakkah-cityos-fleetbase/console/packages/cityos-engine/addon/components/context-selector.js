import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class ContextSelectorComponent extends Component {
    @service('node-context') nodeContext;
    @tracked isExpanded = false;

    get hasContext() {
        return this.nodeContext.hasContext;
    }

    get contextSummary() {
        return this.nodeContext.contextSummary;
    }

    get breadcrumb() {
        return this.nodeContext.contextBreadcrumb;
    }

    get countries() {
        return this.nodeContext.countries;
    }

    get cities() {
        return this.nodeContext.cities;
    }

    get tenants() {
        return this.nodeContext.tenants;
    }

    get channels() {
        return this.nodeContext.channels;
    }

    get selectedCountry() {
        return this.nodeContext.selectedCountry;
    }

    get selectedCity() {
        return this.nodeContext.selectedCity;
    }

    get selectedTenant() {
        return this.nodeContext.selectedTenant;
    }

    get selectedChannel() {
        return this.nodeContext.selectedChannel;
    }

    @action
    toggleExpanded() {
        if (!this.nodeContext.isInitialized) {
            this.nodeContext.initialize();
        }
        this.isExpanded = !this.isExpanded;
    }

    @action
    close() {
        this.isExpanded = false;
    }

    @action
    selectCountry(event) {
        const id = event.target.value;
        if (!id) {
            this.nodeContext.setCountry(null);
            return;
        }
        const country = this.countries.find(c => String(c.id) === String(id));
        this.nodeContext.setCountry(country);
    }

    @action
    selectCity(event) {
        const id = event.target.value;
        if (!id) {
            this.nodeContext.setCity(null);
            return;
        }
        const city = this.cities.find(c => String(c.id) === String(id));
        this.nodeContext.setCity(city);
    }

    @action
    selectTenant(event) {
        const id = event.target.value;
        if (!id) {
            this.nodeContext.setTenant(null);
            return;
        }
        const tenant = this.tenants.find(t => String(t.id) === String(id));
        this.nodeContext.setTenant(tenant);
    }

    @action
    selectChannel(event) {
        const id = event.target.value;
        if (!id) {
            this.nodeContext.setChannel(null);
            return;
        }
        const channel = this.channels.find(c => String(c.id) === String(id));
        this.nodeContext.setChannel(channel);
    }

    @action
    clearContext() {
        this.nodeContext.clearContext();
    }
}
