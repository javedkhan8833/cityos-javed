import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class GovernanceFeatureFlagsDetailsRoute extends Route {
    @service store;

    model(params) {
        return this.store.findRecord('cityos-feature-flag', params.public_id);
    }
}
