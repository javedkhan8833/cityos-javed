import Model, { attr, hasMany } from '@ember-data/model';

export default class CityosSectorModel extends Model {
    @attr('string') name;
    @attr('string') name_ar;
    @attr('string') slug;
    @attr('string') status;
    @attr('string') image_url;
    @attr('string') meta;
    @attr('date') created_at;
    @attr('date') updated_at;
    @hasMany('cityos-category', { async: true, inverse: null }) categories;
}
