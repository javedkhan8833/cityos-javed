import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class HierarchyCountriesDetailsRoute extends Route {
    @service store;

    model(params) {
        return this.store.findRecord('cityos-country', params.public_id);
    }
}
