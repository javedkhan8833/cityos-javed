<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('cityos_channels', function (Blueprint $table) {
            $table->increments('id');
            $table->string('uuid', 36)->nullable()->unique();
            $table->string('public_id')->nullable()->unique();
            $table->string('tenant_uuid', 36)->nullable()->index();
            $table->string('slug')->nullable()->index();
            $table->string('name');
            $table->string('type')->default('web');
            $table->string('status')->default('active');
            $table->string('medusa_sales_channel_id')->nullable()->index();
            $table->json('config')->nullable();
            $table->json('meta')->nullable();
            $table->timestamp('created_at')->nullable()->index();
            $table->timestamp('updated_at')->nullable();
            $table->softDeletes();

            $table->foreign('tenant_uuid')->references('uuid')->on('cityos_tenants');
        });
    }

    public function down()
    {
        Schema::dropIfExists('cityos_channels');
    }
};
