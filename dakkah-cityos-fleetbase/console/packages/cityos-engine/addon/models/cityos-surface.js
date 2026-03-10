import Model, { attr, hasMany } from '@ember-data/model';

export default class CityosSurfaceModel extends Model {
    @attr('string') name;
    @attr('string') name_ar;
    @attr('string') slug;
    @attr('string') channel_uuid;
    @attr('string') status;
    @attr('string') medusa_store_id;
    @attr('string') payload_store_id;
    @attr('string') image_url;
    @attr('string') meta;
    @attr('date') created_at;
    @attr('date') updated_at;
    @hasMany('cityos-portal', { async: true, inverse: null }) portals;
}
