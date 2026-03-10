<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cityos_stores', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('public_id', 128)->nullable()->unique();
            $table->string('cms_store_id')->nullable()->index();
            $table->uuid('tenant_uuid')->nullable()->index();
            $table->uuid('portal_uuid')->nullable()->index();
            $table->uuid('country_uuid')->nullable()->index();
            $table->string('slug')->nullable()->index();
            $table->string('name');
            $table->string('name_ar')->nullable();
            $table->string('type')->default('retail');
            $table->string('domain')->nullable();
            $table->string('subdomain')->nullable();
            $table->string('timezone')->nullable();
            $table->string('locale')->nullable();
            $table->string('currency')->default('SAR');
            $table->string('status')->default('active');
            $table->json('branding')->nullable();
            $table->json('settings')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cityos_stores');
    }
};
