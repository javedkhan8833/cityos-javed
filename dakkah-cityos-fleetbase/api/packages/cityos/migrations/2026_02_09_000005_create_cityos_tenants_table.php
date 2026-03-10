<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('cityos_tenants', function (Blueprint $table) {
            $table->increments('id');
            $table->string('uuid', 36)->nullable()->unique();
            $table->string('public_id')->nullable()->unique();
            $table->string('company_uuid', 36)->nullable()->index();
            $table->string('country_uuid', 36)->nullable()->index();
            $table->string('city_uuid', 36)->nullable()->index();
            $table->string('sector_uuid', 36)->nullable()->index();
            $table->string('category_uuid', 36)->nullable()->index();
            $table->string('handle')->nullable()->unique();
            $table->string('name');
            $table->string('name_ar')->nullable();
            $table->string('type')->default('standard');
            $table->string('subscription_tier')->default('basic');
            $table->string('status')->default('active');
            $table->string('domain')->nullable();
            $table->string('subdomain')->nullable();
            $table->string('medusa_tenant_id')->nullable()->index();
            $table->string('payload_tenant_id')->nullable()->index();
            $table->string('erpnext_company')->nullable();
            $table->json('branding')->nullable();
            $table->json('settings')->nullable();
            $table->json('meta')->nullable();
            $table->timestamp('created_at')->nullable()->index();
            $table->timestamp('updated_at')->nullable();
            $table->softDeletes();

            $table->foreign('company_uuid')->references('uuid')->on('companies');
            $table->foreign('country_uuid')->references('uuid')->on('cityos_countries');
            $table->foreign('city_uuid')->references('uuid')->on('cityos_cities');
            $table->foreign('sector_uuid')->references('uuid')->on('cityos_sectors');
            $table->foreign('category_uuid')->references('uuid')->on('cityos_categories');
        });
    }

    public function down()
    {
        Schema::dropIfExists('cityos_tenants');
    }
};
