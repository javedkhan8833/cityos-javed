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
        Schema::create('routes', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('_key')->nullable();
            $table->string('uuid', 191)->unique();
            $table->string('company_uuid', 191)->nullable()->index();
            $table->string('order_uuid', 191)->nullable()->index();
            $table->json('details')->nullable();
            $table->double('total_distance', 12, 2)->nullable();
            $table->double('total_time', 12, 2)->nullable();
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
        Schema::dropIfExists('routes');
    }
};
