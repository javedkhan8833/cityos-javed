<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreatePurchaseOrdersTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('pallet_purchase_orders', function (Blueprint $table) {
            $table->increments('id');
            $table->string('uuid', 191)->nullable()->unique();
            $table->string('public_id', 191)->nullable()->unique();
            $table->string('company_uuid', 191)->nullable()->index();
            $table->string('created_by_uuid', 191)->nullable()->index();
            $table->string('supplier_uuid', 191)->nullable()->index();
            $table->string('transaction_uuid', 191)->nullable()->index();
            $table->string('assigned_to_uuid', 191)->nullable()->index();
            $table->string('point_of_contact_uuid', 191)->nullable()->index();
            $table->string('reference_code')->nullable();
            $table->string('reference_url')->nullable();
            $table->mediumText('description')->nullable();
            $table->mediumText('comments')->nullable();
            $table->string('currency')->nullable();
            $table->string('status')->nullable();
            $table->json('meta')->nullable();
            $table->timestamp('order_created_at')->nullable();
            $table->timestamp('expected_delivery_at')->nullable();
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
        Schema::dropIfExists('pallet_purchase_orders');
    }
}
