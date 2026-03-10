import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class GovernanceAuthoritiesDetailsRoute extends Route {
    @service store;

    model(params) {
        return this.store.findRecord('cityos-governance-authority', params.public_id);
    }
}
