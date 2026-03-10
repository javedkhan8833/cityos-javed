import { Ability } from 'ember-can';
import { inject as service } from '@ember/service';

export default class ExtensionPaymentAbility extends Ability {
    @service currentUser;

    get can() {
        return true;
    }
}
