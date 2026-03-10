<?php

use Illuminate\Support\Str;

$redis_host = env('REDIS_HOST', '127.0.0.1');
$redis_database = env('REDIS_DATABASE', '0');
$redis_password = env('REDIS_PASSWORD', null);

if ($cacheUrl = getenv('CACHE_URL')) {
    $url = parse_url($cacheUrl);

    $redis_host = $url['host'];
    if (isset($url['pass'])) {
        $redis_password = $url['pass'];
    }
    $redis_database = isset($url['path']) ? substr($url['path'], 1) : 'cache';
}


$databaseUrl = env('DATABASE_URL', getenv('DATABASE_URL') ?: null);
$dbHost = env('DB_HOST', getenv('PGHOST') ?: '127.0.0.1');
$dbPort = env('DB_PORT', getenv('PGPORT') ?: '5432');
$dbDatabase = env('DB_DATABASE', getenv('PGDATABASE') ?: 'forge');
$dbUsername = env('DB_USERNAME', getenv('PGUSER') ?: 'forge');
$dbPassword = env('DB_PASSWORD', getenv('PGPASSWORD') ?: '');

if ($databaseUrl) {
    $parsedDb = parse_url($databaseUrl);
    $dbHost = $parsedDb['host'] ?? $dbHost;
    $dbPort = $parsedDb['port'] ?? $dbPort;
    $dbDatabase = ltrim($parsedDb['path'] ?? '/' . $dbDatabase, '/');
    $dbUsername = $parsedDb['user'] ?? $dbUsername;
    $dbPassword = $parsedDb['pass'] ?? $dbPassword;
}

$dbHostDirect = str_replace('-pooler', '', $dbHost);

return [

    'default' => env('DB_CONNECTION', 'pgsql'),

    'connections' => [
        'pgsql' => [
            'driver' => 'pgsql',
            'host' => $dbHost,
            'port' => $dbPort,
            'database' => $dbDatabase,
            'username' => $dbUsername,
            'password' => $dbPassword,
            'charset' => 'utf8',
            'prefix' => '',
            'prefix_indexes' => true,
            'search_path' => 'public',
            'sslmode' => 'require',
            'options' => [
                // Neon uses PgBouncer in transaction mode which does not support
                // server-side prepared statements (extended query protocol).
                // Emulated prepares force PHP to use the simple query protocol,
                // which is compatible with PgBouncer and lets DDL work inside
                // transactions without aborting on the index-creation step.
                PDO::ATTR_EMULATE_PREPARES => true,
            ],
        ],

        'pgsql_direct' => [
            'driver' => 'pgsql',
            'host' => $dbHostDirect,
            'port' => $dbPort,
            'database' => $dbDatabase,
            'username' => $dbUsername,
            'password' => $dbPassword,
            'charset' => 'utf8',
            'prefix' => '',
            'prefix_indexes' => true,
            'search_path' => 'public',
            'sslmode' => 'require',
        ],

        'mysql' => [
            'driver' => 'pgsql',
            'host' => $dbHost,
            'port' => $dbPort,
            'database' => $dbDatabase,
            'username' => $dbUsername,
            'password' => $dbPassword,
            'charset' => 'utf8',
            'prefix' => '',
            'prefix_indexes' => true,
            'search_path' => 'public',
            'sslmode' => 'require',
            'options' => [
                PDO::ATTR_EMULATE_PREPARES => true,
            ],
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Migration Repository Table
    |--------------------------------------------------------------------------
    |
    | This table keeps track of all the migrations that have already run for
    | your application. Using this information, we can determine which of
    | the migrations on disk haven't actually been run in the database.
    |
    */

    'migrations' => 'migrations',

    /*
    |--------------------------------------------------------------------------
    | Redis Databases
    |--------------------------------------------------------------------------
    |
    | Redis is an open source, fast, and advanced key-value store that also
    | provides a richer body of commands than a typical key-value system
    | such as APC or Memcached. Laravel makes it easy to dig right in.
    |
    */

    'redis' => [
        'client' => env('REDIS_CLIENT', 'phpredis'),

        'options' => [
            'cluster' => env('REDIS_CLUSTER', 'redis'),
            'prefix' => env('REDIS_PREFIX', Str::slug(env('APP_NAME', 'fleetbase'), '_') . '_database_'),
        ],

        'default' => [
            'host' => $redis_host,
            'password' => $redis_password,
            'port' => env('REDIS_PORT', 6379),
            'database' => $redis_database,
        ],

        'sql' => [
            'host' => $redis_host,
            'password' => $redis_password,
            'port' => env('REDIS_PORT', 6379),
            'database' => $redis_database . '_sql_cache',
        ],

        'cache' => [
            'host' => $redis_host,
            'password' => $redis_password,
            'port' => env('REDIS_PORT', 6379),
            'database' => $redis_database . '_cache',
        ],

        'geocode-cache' => [
            'host' => $redis_host,
            'password' => $redis_password,
            'port' => env('REDIS_PORT', 6379),
            'database' => $redis_database . '_geocode_cache',
        ],
    ],

];
