<?php

namespace App\Providers;

use Illuminate\Database\Events\MigrationsStarted;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     *
     * @return void
     */
    public function register()
    {
        //
    }

    /**
     * Bootstrap any application services.
     *
     * @return void
     */
    public function boot()
    {
        Event::listen(MigrationsStarted::class, function () {
            $required = ['postgis', 'postgis_topology'];

            foreach ($required as $ext) {
                try {
                    DB::statement("CREATE EXTENSION IF NOT EXISTS \"{$ext}\"");
                } catch (\Exception $e) {
                    Log::error("Required PostgreSQL extension '{$ext}' could not be installed: " . $e->getMessage());
                }
            }
        });
    }
}
