<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateStockTransactionsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('pallet_stock_transactions', function (Blueprint $table) {
            $table->increments('id');
            $table->string('uuid', 191)->nullable()->unique();
            $table->string('public_id', 191)->nullable()->unique();
            $table->string('company_uuid', 191)->nullable()->index();
            $table->string('created_by_uuid', 191)->nullable()->index();
            $table->string('product_uuid', 191)->nullable()->index();
            $table->string('destination_uuid', 191)->nullable()->index();
            $table->string('batch_uuid', 191)->nullable()->index();
            $table->string('source_uuid', 191)->nullable()->index();
            $table->string('source_type')->nullable();
            $table->json('meta')->nullable();
            $table->string('transaction_type')->nullable();
            $table->integer('quantity')->nullable();
            $table->timestamp('transaction_created_at')->nullable();
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
        Schema::dropIfExists('pallet_stock_transactions');
    }
}
