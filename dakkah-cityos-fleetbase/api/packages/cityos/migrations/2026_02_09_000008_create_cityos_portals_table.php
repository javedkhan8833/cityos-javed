<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('cityos_portals', function (Blueprint $table) {
            $table->increments('id');
            $table->string('uuid', 36)->nullable()->unique();
            $table->string('public_id')->nullable()->unique();
            $table->string('tenant_uuid', 36)->nullable()->index();
            $table->string('surface_uuid', 36)->nullable()->index();
            $table->string('slug')->nullable()->unique();
            $table->string('name');
            $table->string('type')->default('storefront');
            $table->string('domain')->nullable();
            $table->string('subdomain')->nullable();
            $table->string('path_prefix')->nullable();
            $table->string('status')->default('active');
            $table->string('payload_store_id')->nullable()->index();
            $table->string('medusa_store_id')->nullable()->index();
            $table->json('branding')->nullable();
            $table->json('seo')->nullable();
            $table->json('config')->nullable();
            $table->json('meta')->nullable();
            $table->timestamp('created_at')->nullable()->index();
            $table->timestamp('updated_at')->nullable();
            $table->softDeletes();

            $table->foreign('tenant_uuid')->references('uuid')->on('cityos_tenants');
            $table->foreign('surface_uuid')->references('uuid')->on('cityos_surfaces');
        });
    }

    public function down()
    {
        Schema::dropIfExists('cityos_portals');
    }
};
