import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export default class CityosCategoryModel extends Model {
    @attr('string') name;
    @attr('string') name_ar;
    @attr('string') slug;
    @attr('string') parent_uuid;
    @attr('string') status;
    @attr('string') image_url;
    @attr('string') meta;
    @attr('date') created_at;
    @attr('date') updated_at;
    @belongsTo('cityos-category', { async: true, inverse: 'subcategories' }) parent;
    @hasMany('cityos-category', { async: true, inverse: 'parent' }) subcategories;
}
