<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up() {
        Schema::create('cityos_governance_authorities', function (Blueprint $table) {
            $table->increments('id');
            $table->string('uuid', 36)->nullable()->unique();
            $table->string('public_id')->nullable()->unique();
            $table->string('country_uuid', 36)->nullable()->index();
            $table->string('parent_authority_uuid', 36)->nullable()->index();
            $table->string('code', 20)->unique();
            $table->string('name');
            $table->string('name_ar')->nullable();
            $table->string('type', 30)->default('regulatory');
            $table->json('jurisdiction')->nullable();
            $table->json('mandates')->nullable();
            $table->json('compliance_requirements')->nullable();
            $table->json('data_handling_rules')->nullable();
            $table->string('status')->default('active');
            $table->json('meta')->nullable();
            $table->timestamp('created_at')->nullable()->index();
            $table->timestamp('updated_at')->nullable();
            $table->softDeletes();

            $table->foreign('country_uuid')->references('uuid')->on('cityos_countries');
        });
    }
    public function down() { Schema::dropIfExists('cityos_governance_authorities'); }
};
