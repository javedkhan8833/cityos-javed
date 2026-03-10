<?php

return [
    'address'   => env('TEMPORAL_ADDRESS', ''),
    'namespace' => env('TEMPORAL_NAMESPACE', 'default'),
    'api_key'   => env('TEMPORAL_API_KEY', ''),
    'task_queue' => env('TEMPORAL_TASK_QUEUE', 'fleetbase-workflows'),
];
