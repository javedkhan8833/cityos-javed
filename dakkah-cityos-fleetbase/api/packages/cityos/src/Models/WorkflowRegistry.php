<?php

namespace Fleetbase\CityOS\Models;

use Illuminate\Database\Eloquent\Model;

class WorkflowRegistry extends Model
{
    protected $table = 'cityos_workflow_registry';

    protected $fillable = [
        'workflow_type',
        'display_name',
        'description',
        'domain_pack',
        'source',
        'source_system',
        'is_active',
        'execution_count',
        'task_queues',
        'tags',
        'status_counts',
        'input_schema',
        'output_schema',
        'retry_policy',
        'first_seen_at',
        'last_seen_at',
    ];

    protected $casts = [
        'task_queues' => 'array',
        'tags' => 'array',
        'status_counts' => 'array',
        'input_schema' => 'array',
        'output_schema' => 'array',
        'retry_policy' => 'array',
        'is_active' => 'boolean',
        'first_seen_at' => 'datetime',
        'last_seen_at' => 'datetime',
    ];
}
