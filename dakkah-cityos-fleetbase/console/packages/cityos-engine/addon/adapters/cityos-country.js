import CityosAdapter from './cityos';

export default class CityosCountryAdapter extends CityosAdapter {
    pathForType() {
        return 'countries';
    }
}
