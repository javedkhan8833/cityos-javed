import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export default class CityosCountryModel extends Model {
    @attr('string') name;
    @attr('string') name_ar;
    @attr('string') code;
    @attr('string') iso2;
    @attr('string') slug;
    @attr('string') status;
    @attr('string') currency_code;
    @attr('string') default_locale;
    @attr('string') processing_region;
    @attr('string') residency_class;
    @attr('string') region_uuid;
    @attr('string') cms_country_id;
    @attr('string') image_url;
    @attr() policies;
    @attr() settings;
    @attr() meta;
    @attr('date') created_at;
    @attr('date') updated_at;
    @belongsTo('cityos-region', { async: true, inverse: null }) region;
    @hasMany('cityos-city', { async: true, inverse: 'country' }) cities;
}
