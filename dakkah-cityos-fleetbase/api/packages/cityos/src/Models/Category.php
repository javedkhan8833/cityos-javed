<?php

namespace Fleetbase\CityOS\Models;

use Fleetbase\Models\Model;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasPublicId;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Casts\Json;

class Category extends Model
{
    use HasUuid, HasPublicId, HasApiModelBehavior;

    protected $table = 'cityos_categories';
    protected $payloadKey = 'category';
    protected $publicIdType = 'category';

    protected $fillable = [
        'uuid',
        'cms_category_id',
        'sector_uuid',
        'parent_uuid',
        'slug',
        'name',
        'name_ar',
        'description',
        'level',
        'icon',
        'sort_order',
        'status',
        'meta',
    ];

    protected $casts = [
        'meta' => Json::class,
        'level' => 'integer',
        'sort_order' => 'integer',
    ];

    protected $searchableColumns = ['name', 'name_ar', 'slug'];

    protected $filterParams = ['sector_uuid', 'parent_uuid', 'level', 'status'];

    public function sector()
    {
        return $this->belongsTo(Sector::class, 'sector_uuid', 'uuid');
    }

    public function parent()
    {
        return $this->belongsTo(Category::class, 'parent_uuid', 'uuid');
    }

    public function children()
    {
        return $this->hasMany(Category::class, 'parent_uuid', 'uuid');
    }

    public function tenants()
    {
        return $this->hasMany(Tenant::class, 'category_uuid', 'uuid');
    }

    public function scopeTopLevel($query)
    {
        return $query->whereNull('parent_uuid');
    }

    public function scopeSubcategories($query)
    {
        return $query->whereNotNull('parent_uuid');
    }
}
