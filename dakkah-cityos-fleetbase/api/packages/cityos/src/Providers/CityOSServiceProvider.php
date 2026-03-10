<?php

namespace Fleetbase\CityOS\Providers;

use Fleetbase\Providers\CoreServiceProvider;
use Fleetbase\CityOS\Services\TemporalService;
use Fleetbase\CityOS\Services\PayloadCMSService;
use Fleetbase\CityOS\Services\ERPNextService;
use Fleetbase\CityOS\Services\CityBusService;
use Fleetbase\CityOS\Services\CmsMappingService;
use Fleetbase\CityOS\Services\FeatureGateService;
use Fleetbase\CityOS\Services\ComplianceCheckService;
use Fleetbase\CityOS\Services\WaltIdService;
use Fleetbase\CityOS\Services\CmsSyncConflictResolver;
use Fleetbase\CityOS\Console\Commands\TemporalCommand;
use Fleetbase\CityOS\Console\Commands\BackfillNodeContextCommand;
use Fleetbase\CityOS\Console\Commands\SyncPayloadCmsCommand;
use Fleetbase\CityOS\Http\Middleware\ResolveNodeContext;
use Fleetbase\CityOS\Http\Middleware\EnforceFeatureGate;
use Fleetbase\CityOS\Observers\NodeContextStampObserver;
use Fleetbase\CityOS\Observers\OutboxLoggingObserver;
use Fleetbase\CityOS\Scopes\NodeContextScope;
use Fleetbase\CityOS\Listeners\FleetOpsEventBridge;
use Fleetbase\CityOS\Listeners\PalletEventBridge;
use Fleetbase\CityOS\Listeners\StorefrontEventBridge;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\Facades\Event;

if (!class_exists(CoreServiceProvider::class)) {
    throw new \Exception('CityOS cannot be loaded without `fleetbase/core-api` installed!');
}

class CityOSServiceProvider extends CoreServiceProvider
{
    public $observers = [];

    protected array $fleetOpsModels = [
        \Fleetbase\FleetOps\Models\Order::class,
        \Fleetbase\FleetOps\Models\Driver::class,
        \Fleetbase\FleetOps\Models\Vehicle::class,
        \Fleetbase\FleetOps\Models\Fleet::class,
        \Fleetbase\FleetOps\Models\Place::class,
        \Fleetbase\FleetOps\Models\Contact::class,
        \Fleetbase\FleetOps\Models\ServiceArea::class,
        \Fleetbase\FleetOps\Models\Payload::class,
    ];

    protected array $palletModels = [
        \Fleetbase\Pallet\Models\Inventory::class,
        \Fleetbase\Pallet\Models\StockTransaction::class,
        \Fleetbase\Pallet\Models\StockAdjustment::class,
        \Fleetbase\Pallet\Models\PurchaseOrder::class,
        \Fleetbase\Pallet\Models\SalesOrder::class,
        \Fleetbase\Pallet\Models\Batch::class,
    ];

    protected array $storefrontModels = [
        \Fleetbase\Storefront\Models\Store::class,
        \Fleetbase\Storefront\Models\Product::class,
        \Fleetbase\Storefront\Models\Checkout::class,
    ];

    public function register()
    {
        $this->app->register(CoreServiceProvider::class);
        $this->mergeConfigFrom(__DIR__ . '/../../config/cityos.php', 'cityos');
        $this->mergeConfigFrom(__DIR__ . '/../../config/waltid.php', 'waltid');
        $this->mergeConfigFrom(__DIR__ . '/../../config/erpnext.php', 'erpnext');
        $this->mergeConfigFrom(__DIR__ . '/../../config/temporal.php', 'temporal');

        $this->app->singleton(TemporalService::class, fn () => new TemporalService());
        $this->app->singleton(PayloadCMSService::class, fn () => new PayloadCMSService());
        $this->app->singleton(ERPNextService::class, fn () => new ERPNextService());
        $this->app->singleton(CityBusService::class, fn () => new CityBusService());
        $this->app->singleton(CmsMappingService::class, fn () => new CmsMappingService());
        $this->app->singleton(CmsSyncConflictResolver::class, fn () => new CmsSyncConflictResolver());
        $this->app->singleton(FeatureGateService::class, fn () => new FeatureGateService());
        $this->app->singleton(ComplianceCheckService::class, fn () => new ComplianceCheckService());
        $this->app->singleton(WaltIdService::class, fn () => new WaltIdService());
    }

    public function boot()
    {
        $this->registerObservers();
        $this->loadRoutesFrom(__DIR__ . '/../routes.php');
        $this->loadMigrationsFrom(__DIR__ . '/../../migrations');
        $this->publishes([
            __DIR__ . '/../../config/cityos.php' => config_path('cityos.php'),
        ]);

        if ($this->app->runningInConsole()) {
            $this->commands([
                TemporalCommand::class,
                BackfillNodeContextCommand::class,
                SyncPayloadCmsCommand::class,
            ]);
        }

        $this->registerCityOSMiddleware();
        $this->registerModelObservers();
        $this->registerGlobalScopes();
        $this->registerEventBridge();
        $this->registerScheduledTasks();
    }

    protected function registerScheduledTasks(): void
    {
        $this->app->booted(function () {
            $schedule = $this->app->make(Schedule::class);
            $interval = config('cityos.cms.sync_interval', 'everyFiveMinutes');

            $task = $schedule->command('cityos:sync-cms')
                ->withoutOverlapping()
                ->runInBackground()
                ->appendOutputTo(storage_path('logs/cityos-cms-sync.log'));

            match ($interval) {
                'everyMinute' => $task->everyMinute(),
                'everyFiveMinutes' => $task->everyFiveMinutes(),
                'everyTenMinutes' => $task->everyTenMinutes(),
                'everyFifteenMinutes' => $task->everyFifteenMinutes(),
                'everyThirtyMinutes' => $task->everyThirtyMinutes(),
                'hourly' => $task->hourly(),
                'daily' => $task->daily(),
                default => $task->everyFiveMinutes(),
            };
        });
    }

    protected function registerCityOSMiddleware(): void
    {
        $router = $this->app['router'];

        $middlewareGroups = ['fleetbase.protected', 'fleetbase.api'];

        foreach ($middlewareGroups as $group) {
            try {
                $router->pushMiddlewareToGroup($group, ResolveNodeContext::class);
                if (config('cityos.feature_gates.enabled', false)) {
                    $router->pushMiddlewareToGroup($group, EnforceFeatureGate::class);
                }
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::warning("CityOS: Could not register middleware for {$group} group.", [
                    'error' => $e->getMessage(),
                ]);
            }
        }

        try {
            $router->pushMiddlewareToGroup('storefront.api', ResolveNodeContext::class);
            if (config('cityos.feature_gates.enabled', false)) {
                $router->pushMiddlewareToGroup('storefront.api', EnforceFeatureGate::class);
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning('CityOS: Could not register middleware for storefront.api group. Storefront module may not be installed.', [
                'error' => $e->getMessage(),
            ]);
        }
    }

    protected function registerModelObservers(): void
    {
        $stampObserver = NodeContextStampObserver::class;
        $outboxObserver = OutboxLoggingObserver::class;

        $allModels = array_merge(
            $this->getAvailableModels($this->fleetOpsModels),
            $this->getAvailableModels($this->palletModels),
            $this->getAvailableModels($this->storefrontModels)
        );

        foreach ($allModels as $model) {
            try {
                $model::observe($stampObserver);
                if (config('cityos.event_bridge.enabled', false)) {
                    $model::observe($outboxObserver);
                }
            } catch (\Exception $e) {
                report($e);
            }
        }
    }

    protected function registerGlobalScopes(): void
    {
        if (!config('cityos.scoping.enabled', true)) {
            return;
        }

        $scope = new NodeContextScope();

        $scopedModels = array_merge(
            $this->getAvailableModels($this->fleetOpsModels),
            $this->getAvailableModels($this->palletModels),
            $this->getAvailableModels($this->storefrontModels)
        );

        foreach ($scopedModels as $model) {
            try {
                $model::addGlobalScope($scope);
            } catch (\Exception $e) {
                report($e);
            }
        }
    }

    protected function registerEventBridge(): void
    {
        if (!config('cityos.event_bridge.enabled', false)) {
            return;
        }

        $fleetOpsEvents = [
            'Fleetbase\FleetOps\Events\OrderDispatched',
            'Fleetbase\FleetOps\Events\OrderCompleted',
            'Fleetbase\FleetOps\Events\OrderFailed',
            'Fleetbase\FleetOps\Events\OrderCreated',
            'Fleetbase\FleetOps\Events\DriverAssigned',
        ];

        foreach ($fleetOpsEvents as $event) {
            if (class_exists($event)) {
                Event::listen($event, FleetOpsEventBridge::class);
            }
        }

        $palletEvents = [
            'Fleetbase\Pallet\Events\StockMoved',
            'Fleetbase\Pallet\Events\InventoryAdjusted',
            'Fleetbase\Pallet\Events\PurchaseOrderReceived',
        ];

        foreach ($palletEvents as $event) {
            if (class_exists($event)) {
                Event::listen($event, PalletEventBridge::class);
            }
        }

        $storefrontEvents = [
            'Fleetbase\Storefront\Events\OrderPlaced',
            'Fleetbase\Storefront\Events\PaymentCompleted',
            'Fleetbase\Storefront\Events\CheckoutCompleted',
        ];

        foreach ($storefrontEvents as $event) {
            if (class_exists($event)) {
                Event::listen($event, StorefrontEventBridge::class);
            }
        }
    }

    protected function getAvailableModels(array $models): array
    {
        return array_filter($models, fn (string $model) => class_exists($model));
    }
}
