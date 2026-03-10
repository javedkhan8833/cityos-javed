import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class TenantsDetailsRoute extends Route {
    @service store;

    model(params) {
        return this.store.findRecord('cityos-tenant', params.public_id);
    }
}
