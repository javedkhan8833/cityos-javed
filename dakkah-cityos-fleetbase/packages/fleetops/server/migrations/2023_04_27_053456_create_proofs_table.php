<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('proofs', function (Blueprint $table) {
            $table->increments('id');
            $table->string('_key')->nullable();
            $table->string('uuid', 191)->unique();
            $table->string('public_id', 191)->nullable()->unique();
            $table->string('order_uuid', 191)->nullable();
            $table->string('subject_uuid', 191)->nullable()->index();
            $table->string('subject_type')->nullable();
            $table->string('company_uuid', 191)->nullable()->index();
            $table->string('file_uuid', 191)->nullable()->index();
            $table->longText('remarks')->nullable();
            $table->longText('raw_data')->nullable();
            $table->json('data')->nullable();
            $table->softDeletes();
            $table->timestamp('created_at')->nullable()->index();
            $table->timestamp('updated_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('proofs');
    }
};
