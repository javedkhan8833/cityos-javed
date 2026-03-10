<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up() {
        Schema::create('cityos_regions', function (Blueprint $table) {
            $table->increments('id');
            $table->string('uuid', 36)->nullable()->unique();
            $table->string('public_id')->nullable()->unique();
            $table->string('code', 20)->unique();
            $table->string('name');
            $table->string('name_ar')->nullable();
            $table->string('residency_zone', 20)->default('GLOBAL');
            $table->json('data_residency_policy')->nullable();
            $table->json('compliance_policy')->nullable();
            $table->json('classification_policy')->nullable();
            $table->string('status')->default('active');
            $table->json('meta')->nullable();
            $table->timestamp('created_at')->nullable()->index();
            $table->timestamp('updated_at')->nullable();
            $table->softDeletes();
        });
    }
    public function down() { Schema::dropIfExists('cityos_regions'); }
};
