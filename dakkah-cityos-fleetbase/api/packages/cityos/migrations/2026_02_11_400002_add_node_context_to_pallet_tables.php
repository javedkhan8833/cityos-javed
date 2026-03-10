<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $tables = ['pallet_inventories', 'pallet_stock_transactions', 'pallet_stock_adjustment', 'pallet_purchase_orders', 'pallet_sales_orders', 'pallet_batches'];

        foreach ($tables as $table) {
            if (Schema::hasTable($table)) {
                Schema::table($table, function (Blueprint $t) use ($table) {
                    if (!Schema::hasColumn($table, 'tenant_uuid')) {
                        $t->string('tenant_uuid', 191)->nullable()->index('idx_' . $table . '_tenant_uuid');
                    }
                    if (!Schema::hasColumn($table, 'country_code')) {
                        $t->string('country_code', 2)->nullable();
                    }
                    if (!Schema::hasColumn($table, 'city_uuid')) {
                        $t->string('city_uuid', 191)->nullable();
                    }
                    if (!Schema::hasColumn($table, 'sector_uuid')) {
                        $t->string('sector_uuid', 191)->nullable();
                    }
                });
            }
        }
    }

    public function down(): void
    {
        $tables = ['pallet_inventories', 'pallet_stock_transactions', 'pallet_stock_adjustment', 'pallet_purchase_orders', 'pallet_sales_orders', 'pallet_batches'];
        $columns = ['tenant_uuid', 'country_code', 'city_uuid', 'sector_uuid'];

        foreach ($tables as $table) {
            if (Schema::hasTable($table)) {
                Schema::table($table, function (Blueprint $t) use ($table, $columns) {
                    foreach ($columns as $col) {
                        if (Schema::hasColumn($table, $col)) {
                            $t->dropColumn($col);
                        }
                    }
                });
            }
        }
    }
};
