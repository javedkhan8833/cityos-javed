import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class PortalsDetailsRoute extends Route {
    @service store;

    model(params) {
        return this.store.findRecord('cityos-portal', params.public_id);
    }
}
