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
        Schema::create('integrated_vendors', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('_key')->nullable();
            $table->string('uuid', 191)->nullable()->unique();
            $table->string('company_uuid', 191)->nullable()->index('integrated_vendors_company_uuid_foreign');
            $table->string('created_by_uuid', 191)->nullable()->index('integrated_vendors_created_by_uuid_foreign');
            $table->string('public_id')->nullable();
            $table->string('host')->nullable();
            $table->string('namespace')->nullable();
            $table->string('webhook_url', 400)->nullable();
            $table->string('provider')->nullable();
            $table->json('credentials')->nullable();
            $table->json('options')->nullable();
            $table->boolean('sandbox')->default(false);
            $table->softDeletes();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('integrated_vendors');
    }
};
