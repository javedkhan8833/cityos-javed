<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $tables = ['stores', 'products', 'checkouts', 'carts', 'catalogs'];

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
        $tables = ['stores', 'products', 'checkouts', 'carts', 'catalogs'];
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
