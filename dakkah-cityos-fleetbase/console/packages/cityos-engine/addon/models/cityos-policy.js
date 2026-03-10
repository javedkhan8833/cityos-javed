import Model, { attr, belongsTo } from '@ember-data/model';

export default class CityosPolicyModel extends Model {
    @attr('string') name;
    @attr('string') slug;
    @attr('string') type;
    @attr('string') scope;
    @attr('number') priority;
    @attr('string') authority_uuid;
    @attr('string') region_uuid;
    @attr('string') country_uuid;
    @attr('string') tenant_uuid;
    @attr() policy_data;
    @attr('boolean') enforced;
    @attr('string') status;
    @attr() meta;
    @attr('date') created_at;
    @attr('date') updated_at;
    @belongsTo('cityos-governance-authority', { async: true, inverse: null }) authority;
    @belongsTo('cityos-region', { async: true, inverse: null }) region;
    @belongsTo('cityos-country', { async: true, inverse: null }) country;
    @belongsTo('cityos-tenant', { async: true, inverse: null }) tenant;
}
