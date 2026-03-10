import Model, { attr } from '@ember-data/model';

export default class CityosPortalModel extends Model {
    @attr('string') name;
    @attr('string') name_ar;
    @attr('string') slug;
    @attr('string') surface_uuid;
    @attr('string') status;
    @attr('string') url;
    @attr('string') meta;
    @attr('date') created_at;
    @attr('date') updated_at;
}
