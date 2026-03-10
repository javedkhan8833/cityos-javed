<?php

namespace App\Providers;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Schema\ColumnDefinition;
use Illuminate\Support\ServiceProvider;

class PostgresCompatServiceProvider extends ServiceProvider
{
    public function register()
    {
        $driver = config('database.default', 'pgsql');
        $isPostgres = in_array($driver, ['pgsql', 'pgsql-test']);

        if (!$isPostgres) {
            Blueprint::macro('uuid', function ($column = 'uuid') {
                return $this->char($column, 36);
            });

            Blueprint::macro('foreignUuid', function ($column) {
                return $this->addColumnDefinition(new ColumnDefinition([
                    'type' => 'char',
                    'name' => $column,
                    'length' => 36,
                ]));
            });
        }
    }

    public function boot()
    {
        $this->registerDoctrineTypes();
    }

    protected function registerDoctrineTypes()
    {
        try {
            $connection = $this->app['db']->connection();
            $doctrineConnection = $connection->getDoctrineConnection();
            $platform = $doctrineConnection->getDatabasePlatform();
            $platform->registerDoctrineTypeMapping('geography', 'text');
            $platform->registerDoctrineTypeMapping('geometry', 'text');
            $platform->registerDoctrineTypeMapping('point', 'text');
            $platform->registerDoctrineTypeMapping('polygon', 'text');
            $platform->registerDoctrineTypeMapping('linestring', 'text');
            $platform->registerDoctrineTypeMapping('multipoint', 'text');
            $platform->registerDoctrineTypeMapping('multipolygon', 'text');
            $platform->registerDoctrineTypeMapping('multilinestring', 'text');
            $platform->registerDoctrineTypeMapping('geometrycollection', 'text');
            $platform->registerDoctrineTypeMapping('_text', 'text');
            $platform->registerDoctrineTypeMapping('_int4', 'text');
            $platform->registerDoctrineTypeMapping('_varchar', 'text');
        } catch (\Exception $e) {
        }
    }
}
