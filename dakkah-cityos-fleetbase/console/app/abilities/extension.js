import { Ability } from 'ember-can';
import { inject as service } from '@ember/service';

export default class ExtensionAbility extends Ability {
    @service currentUser;

    parseProperty(str) {
        this._extensionId = str.split(' ')[0];
        this._action = str.split(' ')[1];
        return 'can';
    }

    get can() {
        if (this.currentUser.isAdmin) {
            return true;
        }

        return true;
    }
}
