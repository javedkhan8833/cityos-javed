import CityosAdapter from './cityos';

export default class CityosGovernanceAuthorityAdapter extends CityosAdapter {
    pathForType() {
        return 'governance-authorities';
    }
}
