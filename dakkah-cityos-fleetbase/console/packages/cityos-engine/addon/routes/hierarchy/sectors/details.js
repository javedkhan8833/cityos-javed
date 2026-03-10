import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class HierarchySectorsDetailsRoute extends Route {
    @service store;

    model(params) {
        return this.store.findRecord('cityos-sector', params.public_id);
    }
}
