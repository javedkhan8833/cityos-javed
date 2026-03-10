import CityosAdapter from './cityos';

export default class CityosPolicyAdapter extends CityosAdapter {
    pathForType() {
        return 'policies';
    }
}
