<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up() {
        Schema::create('cityos_policies', function (Blueprint $table) {
            $table->increments('id');
            $table->string('uuid', 36)->nullable()->unique();
            $table->string('public_id')->nullable()->unique();
            $table->string('authority_uuid', 36)->nullable()->index();
            $table->string('region_uuid', 36)->nullable()->index();
            $table->string('country_uuid', 36)->nullable()->index();
            $table->string('tenant_uuid', 36)->nullable()->index();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('type', 30);
            $table->string('scope', 30)->default('global');
            $table->integer('priority')->default(0);
            $table->json('policy_data')->nullable();
            $table->boolean('enforced')->default(false);
            $table->string('status')->default('active');
            $table->json('meta')->nullable();
            $table->timestamp('created_at')->nullable()->index();
            $table->timestamp('updated_at')->nullable();
            $table->softDeletes();

            $table->foreign('authority_uuid')->references('uuid')->on('cityos_governance_authorities');
            $table->foreign('region_uuid')->references('uuid')->on('cityos_regions');
            $table->foreign('country_uuid')->references('uuid')->on('cityos_countries');
            $table->foreign('tenant_uuid')->references('uuid')->on('cityos_tenants');
        });
    }
    public function down() { Schema::dropIfExists('cityos_policies'); }
};
