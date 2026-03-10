<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('cityos_countries', function (Blueprint $table) {
            $table->increments('id');
            $table->string('uuid', 36)->nullable()->unique();
            $table->string('public_id')->nullable()->unique();
            $table->string('code', 2)->unique();
            $table->string('name');
            $table->string('name_ar')->nullable();
            $table->string('currency_code', 3)->nullable();
            $table->string('default_locale', 10)->default('ar-SA');
            $table->string('processing_region')->default('me-central-1');
            $table->string('residency_class')->default('sovereign');
            $table->string('status')->default('active');
            $table->json('meta')->nullable();
            $table->timestamp('created_at')->nullable()->index();
            $table->timestamp('updated_at')->nullable();
            $table->softDeletes();
        });
    }

    public function down()
    {
        Schema::dropIfExists('cityos_countries');
    }
};
