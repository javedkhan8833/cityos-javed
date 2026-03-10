<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up() {
        Schema::create('cityos_nodes', function (Blueprint $table) {
            $table->increments('id');
            $table->string('uuid', 36)->nullable()->unique();
            $table->string('public_id')->nullable()->unique();
            $table->string('parent_uuid', 36)->nullable()->index();
            $table->string('cms_node_id')->nullable()->index();
            $table->string('type', 20);
            $table->string('name');
            $table->string('name_ar')->nullable();
            $table->string('slug')->unique();
            $table->string('code', 30)->nullable();
            $table->string('country_uuid', 36)->nullable()->index();
            $table->string('city_uuid', 36)->nullable()->index();
            $table->decimal('coordinates_lat', 10, 7)->nullable();
            $table->decimal('coordinates_lng', 10, 7)->nullable();
            $table->decimal('coordinates_alt', 10, 2)->nullable();
            $table->string('status')->default('active');
            $table->integer('depth')->default(0);
            $table->text('path')->nullable();
            $table->string('stewardship_state', 20)->default('unclaimed');
            $table->string('stewardship_tenant_uuid', 36)->nullable()->index();
            $table->json('meta')->nullable();
            $table->timestamp('created_at')->nullable()->index();
            $table->timestamp('updated_at')->nullable();
            $table->softDeletes();

            $table->foreign('country_uuid')->references('uuid')->on('cityos_countries');
            $table->foreign('city_uuid')->references('uuid')->on('cityos_cities');
        });
    }
    public function down() { Schema::dropIfExists('cityos_nodes'); }
};
