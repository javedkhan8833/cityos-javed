import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class HierarchyNodesDetailsRoute extends Route {
    @service store;

    model(params) {
        return this.store.findRecord('cityos-node', params.public_id);
    }
}
