import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export default class CityosCityModel extends Model {
    @attr('string') name;
    @attr('string') name_ar;
    @attr('string') slug;
    @attr('string') status;
    @attr('string') country_uuid;
    @attr('string') theme;
    @attr('string') timezone;
    @attr() geo_boundary;
    @attr('string') image_url;
    @attr() meta;
    @attr('date') created_at;
    @attr('date') updated_at;
    @belongsTo('cityos-country', { async: true, inverse: 'cities' }) country;
    @hasMany('cityos-sector', { async: true, inverse: null }) sectors;
}
