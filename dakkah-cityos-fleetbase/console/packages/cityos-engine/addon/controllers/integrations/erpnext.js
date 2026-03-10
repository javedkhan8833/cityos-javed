import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class IntegrationsErpnextController extends Controller {
    @service('cityos') cityosService;
    @tracked status = null;
    @tracked isLoading = true;
    @tracked settlementResult = null;
    @tracked isProcessing = false;

    constructor() {
        super(...arguments);
        this.loadStatus();
    }

    @action async loadStatus() {
        this.isLoading = true;
        try { this.status = await this.cityosService.getERPNextStatus(); } catch (e) {}
        this.isLoading = false;
    }

    @action async triggerSettlement() {
        this.isProcessing = true;
        try { this.settlementResult = await this.cityosService.triggerSettlement(); } catch (e) { this.settlementResult = { error: e.message }; }
        this.isProcessing = false;
    }
}
