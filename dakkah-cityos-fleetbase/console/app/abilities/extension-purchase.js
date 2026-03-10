import { Ability } from 'ember-can';
import { inject as service } from '@ember/service';

export default class ExtensionPurchaseAbility extends Ability {
    @service currentUser;

    get can() {
        return true;
    }
}
