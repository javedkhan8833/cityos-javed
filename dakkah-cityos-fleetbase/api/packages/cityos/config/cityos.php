<?php

return [
    'api' => [
        'routing' => [
            'prefix' => 'cityos',
            'internal_prefix' => 'int',
        ],
    ],
    'node_context' => [
        'header_prefix' => 'X-CityOS-',
        'cookie_prefix' => 'cityos_',
        'required_fields' => ['country', 'tenant'],
        'default_locale' => 'ar-SA',
        'default_processing_region' => 'me-central-1',
        'default_residency_class' => 'sovereign',
    ],
    'temporal' => [
        'address' => env('TEMPORAL_ADDRESS', ''),
        'namespace' => env('TEMPORAL_NAMESPACE', ''),
        'api_key' => env('TEMPORAL_API_KEY', ''),
        'task_queue' => env('TEMPORAL_TASK_QUEUE', 'cityos-default'),
    ],
    'cms' => [
        'base_url' => env('CITYOS_CMS_BASE_URL', ''),
        'api_key' => env('CITYOS_CMS_API_KEY', ''),
        'sync_interval' => env('CITYOS_CMS_SYNC_INTERVAL', 'everyFifteenMinutes'),
    ],
    'erpnext' => [
        'base_url' => env('ERPNEXT_BASE_URL', ''),
        'api_key' => env('ERPNEXT_API_KEY', ''),
        'api_secret' => env('ERPNEXT_API_SECRET', ''),
    ],

    'scoping' => [
        'enabled' => env('CITYOS_SCOPING_ENABLED', true),
        'ancestry_visibility' => true,
    ],

    'feature_gates' => [
        'enabled' => env('CITYOS_FEATURE_GATES_ENABLED', false),
    ],

    'event_bridge' => [
        'enabled' => env('CITYOS_EVENT_BRIDGE_ENABLED', false),
    ],
];
