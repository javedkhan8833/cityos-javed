import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class IntegrationsOutboxController extends Controller {
    @service('cityos') cityosService;
    @tracked stats = null;
    @tracked recentEvents = null;
    @tracked isLoading = true;
    @tracked isDispatching = false;
    @tracked dispatchResult = null;

    constructor() {
        super(...arguments);
        this.loadAll();
    }

    @action async loadAll() {
        this.isLoading = true;
        try {
            const [stats, recent] = await Promise.all([
                this.cityosService.getOutboxStats(),
                this.cityosService.getOutboxRecent(30),
            ]);
            this.stats = stats;
            this.recentEvents = recent;
        } catch (e) {}
        this.isLoading = false;
    }

    @action async dispatchPending() {
        this.isDispatching = true;
        try { this.dispatchResult = await this.cityosService.dispatchOutbox(50); } catch (e) { this.dispatchResult = { error: e.message }; }
        this.isDispatching = false;
        await this.loadAll();
    }
}
