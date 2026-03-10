import CityosAdapter from './cityos';

export default class CityosFeatureFlagAdapter extends CityosAdapter {
    pathForType() {
        return 'feature-flags';
    }
}
