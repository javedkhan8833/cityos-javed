import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export default class CityosTenantModel extends Model {
    @attr('string') name;
    @attr('string') name_ar;
    @attr('string') handle;
    @attr('string') status;
    @attr('string') tenant_tier;
    @attr('string') parent_tenant_uuid;
    @attr('string') category_uuid;
    @attr('string') company_uuid;
    @attr('string') region_uuid;
    @attr('string') residency_zone;
    @attr('string') medusa_tenant_id;
    @attr('string') payload_tenant_id;
    @attr('string') erpnext_company;
    @attr() meta;
    @attr('date') created_at;
    @attr('date') updated_at;
    @belongsTo('cityos-tenant', { async: true, inverse: 'childTenants' }) parentTenant;
    @hasMany('cityos-tenant', { async: true, inverse: 'parentTenant' }) childTenants;
    @hasMany('cityos-channel', { async: true, inverse: null }) channels;
}
