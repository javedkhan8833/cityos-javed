import CityosAdapter from './cityos';

export default class CityosTenantAdapter extends CityosAdapter {
    pathForType() {
        return 'tenants';
    }
}
