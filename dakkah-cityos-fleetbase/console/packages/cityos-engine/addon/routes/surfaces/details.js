import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class SurfacesDetailsRoute extends Route {
    @service store;

    model(params) {
        return this.store.findRecord('cityos-surface', params.public_id);
    }
}
