import Service from '@ember/service';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

const STORAGE_KEY = 'cityos:node-context';

export default class NodeContextService extends Service {
    @service fetch;

    @tracked selectedCountry = null;
    @tracked selectedCity = null;
    @tracked selectedTenant = null;
    @tracked selectedChannel = null;
    @tracked selectedSurface = null;
    @tracked selectedPortal = null;
    @tracked countries = [];
    @tracked cities = [];
    @tracked tenants = [];
    @tracked channels = [];
    @tracked surfaces = [];
    @tracked portals = [];
    @tracked isLoading = false;
    @tracked isInitialized = false;
    @tracked contextMetadata = null;
    @tracked _contextHeadersInstalled = false;

    get hasContext() {
        return !!(this.selectedCountry || this.selectedTenant);
    }

    get contextSummary() {
        const parts = [];
        if (this.selectedCountry) parts.push(this.selectedCountry.name || this.selectedCountry.iso2);
        if (this.selectedCity) parts.push(this.selectedCity.name);
        if (this.selectedTenant) parts.push(this.selectedTenant.name || this.selectedTenant.public_id);
        if (this.selectedChannel) parts.push(this.selectedChannel.name);
        return parts.join(' > ') || 'No context set';
    }

    get contextBreadcrumb() {
        const items = [];
        if (this.selectedCountry) items.push({ level: 'Country', name: this.selectedCountry.name, icon: 'globe' });
        if (this.selectedCity) items.push({ level: 'City', name: this.selectedCity.name, icon: 'city' });
        if (this.selectedTenant) items.push({ level: 'Tenant', name: this.selectedTenant.name, icon: 'building' });
        if (this.selectedChannel) items.push({ level: 'Channel', name: this.selectedChannel.name, icon: 'broadcast-tower' });
        if (this.selectedSurface) items.push({ level: 'Surface', name: this.selectedSurface.name, icon: 'layer-group' });
        if (this.selectedPortal) items.push({ level: 'Portal', name: this.selectedPortal.name, icon: 'door-open' });
        return items;
    }

    get contextHeaders() {
        const headers = {};
        if (this.selectedCountry?.iso2) headers['X-CityOS-Country'] = this.selectedCountry.iso2;
        if (this.selectedCountry?.id) headers['X-CityOS-Country-ID'] = this.selectedCountry.id;
        if (this.selectedCity?.id) headers['X-CityOS-City'] = this.selectedCity.id;
        if (this.selectedTenant?.handle) headers['X-CityOS-Tenant'] = this.selectedTenant.handle;
        if (this.selectedTenant?.id) headers['X-CityOS-Tenant-ID'] = this.selectedTenant.id;
        if (this.selectedChannel?.id) headers['X-CityOS-Channel'] = this.selectedChannel.id;
        if (this.selectedSurface?.id) headers['X-CityOS-Surface'] = this.selectedSurface.id;
        if (this.selectedPortal?.id) headers['X-CityOS-Portal'] = this.selectedPortal.id;
        return headers;
    }

    @action
    async initialize() {
        if (this.isInitialized) return;
        this.isLoading = true;
        try {
            this.restoreFromStorage();
            await this.loadCountries();

            if (!this.selectedCountry && this.countries.length > 0) {
                this.selectedCountry = this.countries[0];
                await this.loadCities(this.selectedCountry.id);
            } else if (this.selectedCountry) {
                await this.loadCities(this.selectedCountry.id);
            }

            if (this.selectedCity || this.selectedCountry) {
                await this.loadTenants();
            }

            if (!this.selectedTenant && this.tenants.length > 0) {
                this.selectedTenant = this.tenants[0];
                if (this.selectedTenant?.id) {
                    await this.loadChannels(this.selectedTenant.id);
                }
            }

            if (this.hasContext) {
                this.saveToStorage();
                this.installContextHeaders();
            }

            this.isInitialized = true;
        } catch (e) {
            // silent init failure
        }
        this.isLoading = false;
    }

    installContextHeaders() {
        if (this._contextHeadersInstalled) return;
        try {
            const fetchService = this.fetch;
            const nodeCtx = this;
            const originalGetHeaders = fetchService.getHeaders?.bind(fetchService);
            if (originalGetHeaders) {
                fetchService.getHeaders = function (...args) {
                    const headers = originalGetHeaders(...args);
                    try {
                        const ctx = nodeCtx.contextHeaders;
                        if (ctx && typeof ctx === 'object') {
                            Object.assign(headers, ctx);
                        }
                    } catch (e) {
                        // context not available yet
                    }
                    return headers;
                };
            }
            this._contextHeadersInstalled = true;
        } catch (e) {
            // silent
        }
    }

    _cityosGet(path, query = {}) {
        return this.fetch.get(path, query, { namespace: 'cityos/int/v1' });
    }

    @action
    async loadCountries() {
        try {
            const response = await this._cityosGet('countries');
            this.countries = response?.data || response?.countries || [];
        } catch (e) {
            this.countries = [];
        }
    }

    @action
    async loadCities(countryId) {
        if (!countryId) {
            this.cities = [];
            return;
        }
        try {
            const response = await this._cityosGet('cities', { country_id: countryId });
            this.cities = response?.data || response?.cities || [];
        } catch (e) {
            this.cities = [];
        }
    }

    @action
    async loadTenants() {
        try {
            const query = {};
            if (this.selectedCountry?.id) query.country_id = this.selectedCountry.id;
            if (this.selectedCity?.id) query.city_id = this.selectedCity.id;
            const response = await this._cityosGet('tenants', query);
            this.tenants = response?.data || response?.tenants || [];
        } catch (e) {
            this.tenants = [];
        }
    }

    @action
    async loadChannels(tenantId) {
        if (!tenantId) {
            this.channels = [];
            return;
        }
        try {
            const response = await this._cityosGet('channels', { tenant_id: tenantId });
            this.channels = response?.data || response?.channels || [];
        } catch (e) {
            this.channels = [];
        }
    }

    @action
    async setCountry(country) {
        this.selectedCountry = country;
        this.selectedCity = null;
        this.selectedTenant = null;
        this.selectedChannel = null;
        this.selectedSurface = null;
        this.selectedPortal = null;
        this.cities = [];
        this.tenants = [];
        this.channels = [];
        this.surfaces = [];
        this.portals = [];
        this.saveToStorage();

        if (country?.id) {
            await this.loadCities(country.id);
            await this.loadTenants();
        }
    }

    @action
    async setCity(city) {
        this.selectedCity = city;
        this.selectedTenant = null;
        this.selectedChannel = null;
        this.selectedSurface = null;
        this.selectedPortal = null;
        this.tenants = [];
        this.channels = [];
        this.saveToStorage();

        if (city?.id || this.selectedCountry?.id) {
            await this.loadTenants();
        }
    }

    @action
    async setTenant(tenant) {
        this.selectedTenant = tenant;
        this.selectedChannel = null;
        this.selectedSurface = null;
        this.selectedPortal = null;
        this.channels = [];
        this.surfaces = [];
        this.portals = [];
        this.saveToStorage();

        if (tenant?.id) {
            await this.loadChannels(tenant.id);
        }
    }

    @action
    setChannel(channel) {
        this.selectedChannel = channel;
        this.selectedSurface = null;
        this.selectedPortal = null;
        this.saveToStorage();
    }

    @action
    clearContext() {
        this.selectedCountry = null;
        this.selectedCity = null;
        this.selectedTenant = null;
        this.selectedChannel = null;
        this.selectedSurface = null;
        this.selectedPortal = null;
        this.cities = [];
        this.tenants = [];
        this.channels = [];
        this.surfaces = [];
        this.portals = [];
        this.saveToStorage();
    }

    saveToStorage() {
        try {
            const data = {
                country: this.selectedCountry,
                city: this.selectedCity,
                tenant: this.selectedTenant,
                channel: this.selectedChannel,
                surface: this.selectedSurface,
                portal: this.selectedPortal,
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            // silent storage failure
        }
    }

    restoreFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const data = JSON.parse(raw);
            if (data.country) this.selectedCountry = data.country;
            if (data.city) this.selectedCity = data.city;
            if (data.tenant) this.selectedTenant = data.tenant;
            if (data.channel) this.selectedChannel = data.channel;
            if (data.surface) this.selectedSurface = data.surface;
            if (data.portal) this.selectedPortal = data.portal;
        } catch (e) {
            // silent restore failure
        }
    }
}
