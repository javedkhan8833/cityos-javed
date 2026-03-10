import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class HierarchyRegionsIndexRoute extends Route {
    @service store;

    model() {
        return this.store.findAll('cityos-region');
    }
}
