import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class GovernanceAuthoritiesIndexRoute extends Route {
    @service store;

    model() {
        return this.store.findAll('cityos-governance-authority');
    }
}
