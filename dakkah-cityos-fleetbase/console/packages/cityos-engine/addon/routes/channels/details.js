import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class ChannelsDetailsRoute extends Route {
    @service store;

    model(params) {
        return this.store.findRecord('cityos-channel', params.public_id);
    }
}
