import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class GovernancePoliciesDetailsRoute extends Route {
    @service store;

    model(params) {
        return this.store.findRecord('cityos-policy', params.public_id);
    }
}
