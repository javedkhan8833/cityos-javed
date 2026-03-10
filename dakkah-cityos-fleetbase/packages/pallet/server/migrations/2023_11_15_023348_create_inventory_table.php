<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateInventoryTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('pallet_inventories', function (Blueprint $table) {
            $table->increments('id');
            $table->string('uuid', 191)->nullable()->unique();
            $table->string('public_id', 191)->nullable()->unique();
            $table->string('status')->nullable();
            $table->string('company_uuid', 191)->nullable()->index();
            $table->string('created_by_uuid', 191)->nullable()->index();
            $table->string('product_uuid', 191)->nullable()->index();
            $table->string('warehouse_uuid', 191)->nullable()->index();
            $table->string('supplier_uuid', 191)->nullable()->index();
            $table->string('batch_uuid', 191)->nullable()->index();
            $table->mediumText('comments')->nullable();
            $table->integer('quantity')->nullable();
            $table->integer('min_quantity')->nullable();
            $table->json('meta')->nullable();
            $table->timestamp('expiry_date_at')->nullable();
            $table->timestamp('created_at')->nullable()->index();
            $table->timestamp('updated_at')->nullable();
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
        Schema::dropIfExists('pallet_inventories');
    }
}
