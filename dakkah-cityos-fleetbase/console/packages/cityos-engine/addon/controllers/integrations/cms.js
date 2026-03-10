import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class IntegrationsCmsController extends Controller {
    @service('cityos') cityosService;
    @tracked health = null;
    @tracked collections = null;
    @tracked storage = null;
    @tracked isLoading = true;

    constructor() {
        super(...arguments);
        this.loadAll();
    }

    @action async loadAll() {
        this.isLoading = true;
        try {
            const [health, collections, storage] = await Promise.all([
                this.cityosService.getCMSHealth(),
                this.cityosService.getCMSCollections(),
                this.cityosService.getCMSStorage(),
            ]);
            this.health = health;
            this.collections = collections;
            this.storage = storage;
        } catch (e) {}
        this.isLoading = false;
    }
}
