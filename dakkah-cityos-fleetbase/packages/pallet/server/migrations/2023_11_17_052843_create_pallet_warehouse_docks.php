<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreatePalletWarehouseDocks extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('pallet_warehouse_docks', function (Blueprint $table) {
            $table->increments('id');
            $table->string('uuid', 191)->nullable()->unique();
            $table->string('public_id', 191)->nullable()->unique();
            $table->string('company_uuid', 191)->nullable()->index();
            $table->string('created_by_uuid', 191)->nullable()->index();
            $table->string('warehouse_uuid', 191)->nullable()->index();
            $table->string('dock_number')->nullable();
            $table->string('direction')->nullable();
            $table->string('capacity')->nullable();
            $table->string('status')->nullable();
            $table->string('type')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('pallet_warehouse_docks');
    }
}
