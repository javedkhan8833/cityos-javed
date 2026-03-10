<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('cityos_categories', function (Blueprint $table) {
            $table->increments('id');
            $table->string('uuid', 36)->nullable()->unique();
            $table->string('public_id')->nullable()->unique();
            $table->string('sector_uuid', 36)->nullable()->index();
            $table->string('parent_uuid', 36)->nullable()->index();
            $table->string('slug')->nullable()->index();
            $table->string('name');
            $table->string('name_ar')->nullable();
            $table->string('description')->nullable();
            $table->integer('level')->default(0);
            $table->string('icon')->nullable();
            $table->integer('sort_order')->default(0);
            $table->string('status')->default('active');
            $table->json('meta')->nullable();
            $table->timestamp('created_at')->nullable()->index();
            $table->timestamp('updated_at')->nullable();
            $table->softDeletes();

            $table->foreign('sector_uuid')->references('uuid')->on('cityos_sectors');
        });

        Schema::table('cityos_categories', function (Blueprint $table) {
            $table->foreign('parent_uuid')->references('uuid')->on('cityos_categories');
        });
    }

    public function down()
    {
        Schema::dropIfExists('cityos_categories');
    }
};
