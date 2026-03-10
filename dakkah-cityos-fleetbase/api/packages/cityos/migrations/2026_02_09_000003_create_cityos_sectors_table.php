<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('cityos_sectors', function (Blueprint $table) {
            $table->increments('id');
            $table->string('uuid', 36)->nullable()->unique();
            $table->string('public_id')->nullable()->unique();
            $table->string('city_uuid', 36)->nullable()->index();
            $table->string('slug')->nullable()->index();
            $table->string('name');
            $table->string('name_ar')->nullable();
            $table->string('description')->nullable();
            $table->string('status')->default('active');
            $table->json('meta')->nullable();
            $table->timestamp('created_at')->nullable()->index();
            $table->timestamp('updated_at')->nullable();
            $table->softDeletes();

            $table->foreign('city_uuid')->references('uuid')->on('cityos_cities');
        });
    }

    public function down()
    {
        Schema::dropIfExists('cityos_sectors');
    }
};
