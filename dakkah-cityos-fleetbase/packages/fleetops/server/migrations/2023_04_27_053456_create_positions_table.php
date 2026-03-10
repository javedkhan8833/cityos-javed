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
        Schema::create('positions', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('_key')->nullable();
            $table->string('uuid', 191)->unique();
            $table->string('company_uuid', 191)->nullable()->index();
            $table->string('order_uuid', 191)->nullable()->index();
            $table->string('destination_uuid', 191)->nullable()->index();
            $table->string('subject_uuid', 191)->nullable();
            $table->string('subject_type')->nullable();
            $table->point('coordinates');
            $table->string('heading')->nullable();
            $table->string('bearing')->nullable();
            $table->string('speed')->nullable();
            $table->string('altitude')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->spatialIndex(['coordinates'], 'positions_coordinates_spatial');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('positions');
    }
};
