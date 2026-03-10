import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export default class CityosChannelModel extends Model {
    @attr('string') name;
    @attr('string') name_ar;
    @attr('string') slug;
    @attr('string') tenant_uuid;
    @attr('string') type;
    @attr('string') status;
    @attr('string') medusa_sales_channel_id;
    @attr() config;
    @attr('string') image_url;
    @attr() meta;
    @attr('date') created_at;
    @attr('date') updated_at;
    @belongsTo('cityos-tenant', { async: true, inverse: null }) tenant;
    @hasMany('cityos-surface', { async: true, inverse: null }) surfaces;
}
