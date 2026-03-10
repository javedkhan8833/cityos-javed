import { Ability } from 'ember-can';
import { inject as service } from '@ember/service';

export default class RegistryTokenAbility extends Ability {
    @service currentUser;

    get can() {
        return true;
    }
}
