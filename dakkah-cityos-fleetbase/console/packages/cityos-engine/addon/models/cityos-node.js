import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export default class CityosNodeModel extends Model {
    @attr('string') name;
    @attr('string') slug;
    @attr('string') type;
    @attr('string') code;
    @attr('string') parent_uuid;
    @attr('number') depth;
    @attr('string') status;
    @attr('number') coordinates_lat;
    @attr('number') coordinates_lng;
    @attr('string') payload_node_id;
    @attr() metadata;
    @attr('date') created_at;
    @attr('date') updated_at;
    @belongsTo('cityos-node', { async: true, inverse: 'children' }) parent;
    @hasMany('cityos-node', { async: true, inverse: 'parent' }) children;
}
