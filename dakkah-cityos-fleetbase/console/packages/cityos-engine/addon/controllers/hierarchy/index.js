import Controller from '@ember/controller';
import { action } from '@ember/object';

export default class HierarchyIndexController extends Controller {
    @action
    refreshTree() {
        this.send('refreshModel');
    }
}
