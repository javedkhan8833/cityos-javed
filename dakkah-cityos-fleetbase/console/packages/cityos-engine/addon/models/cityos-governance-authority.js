import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export default class CityosGovernanceAuthorityModel extends Model {
    @attr('string') code;
    @attr('string') name;
    @attr('string') name_ar;
    @attr('string') type;
    @attr('string') country_uuid;
    @attr('string') parent_authority_uuid;
    @attr() jurisdiction;
    @attr() mandates;
    @attr() compliance_requirements;
    @attr() data_handling_rules;
    @attr('string') status;
    @attr() meta;
    @attr('date') created_at;
    @attr('date') updated_at;
    @belongsTo('cityos-country', { async: true, inverse: null }) country;
    @belongsTo('cityos-governance-authority', { async: true, inverse: 'childAuthorities' }) parentAuthority;
    @hasMany('cityos-governance-authority', { async: true, inverse: 'parentAuthority' }) childAuthorities;
    @hasMany('cityos-policy', { async: true, inverse: null }) policies;
}
