import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class HierarchyCitiesDetailsRoute extends Route {
    @service store;

    model(params) {
        return this.store.findRecord('cityos-city', params.public_id);
    }
}
