import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class HierarchyCategoriesDetailsRoute extends Route {
    @service store;

    model(params) {
        return this.store.findRecord('cityos-category', params.public_id);
    }
}
