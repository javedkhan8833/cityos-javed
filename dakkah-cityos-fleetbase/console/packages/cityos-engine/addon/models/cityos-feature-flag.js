import Model, { attr } from '@ember-data/model';

export default class CityosFeatureFlagModel extends Model {
    @attr('string') key;
    @attr('string') name;
    @attr('string') description;
    @attr('boolean') enabled;
    @attr() conditions;
    @attr('string') status;
    @attr() meta;
    @attr('date') created_at;
    @attr('date') updated_at;
}
