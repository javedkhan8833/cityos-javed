<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('cityos_cities', function (Blueprint $table) {
            $table->increments('id');
            $table->string('uuid', 36)->nullable()->unique();
            $table->string('public_id')->nullable()->unique();
            $table->string('country_uuid', 36)->nullable()->index();
            $table->string('slug')->nullable()->index();
            $table->string('name');
            $table->string('name_ar')->nullable();
            $table->string('theme')->nullable();
            $table->string('timezone')->nullable();
            $table->string('status')->default('active');
            $table->json('geo_boundary')->nullable();
            $table->json('meta')->nullable();
            $table->timestamp('created_at')->nullable()->index();
            $table->timestamp('updated_at')->nullable();
            $table->softDeletes();

            $table->foreign('country_uuid')->references('uuid')->on('cityos_countries');
        });
    }

    public function down()
    {
        Schema::dropIfExists('cityos_cities');
    }
};
