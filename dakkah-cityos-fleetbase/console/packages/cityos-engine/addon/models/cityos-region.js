import Model, { attr, hasMany } from '@ember-data/model';

export default class CityosRegionModel extends Model {
    @attr('string') code;
    @attr('string') name;
    @attr('string') name_ar;
    @attr('string') residency_zone;
    @attr() data_residency_policy;
    @attr() compliance_policy;
    @attr() classification_policy;
    @attr('string') status;
    @attr() meta;
    @attr('date') created_at;
    @attr('date') updated_at;
    @hasMany('cityos-country', { async: true, inverse: null }) countries;
    @hasMany('cityos-policy', { async: true, inverse: null }) policies;
}
