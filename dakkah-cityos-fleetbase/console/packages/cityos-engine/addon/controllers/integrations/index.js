import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class IntegrationsIndexController extends Controller {
    @service('cityos') cityosService;
    @tracked integrations = null;
    @tracked isLoading = true;

    constructor() {
        super(...arguments);
        this.loadStatus();
    }

    @action async loadStatus() {
        this.isLoading = true;
        try { this.integrations = await this.cityosService.loadIntegrationStatus(); } catch (e) {}
        this.isLoading = false;
    }
}
