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
        Schema::create('policies', function (Blueprint $table) {
            $table->string('id', 191)->primary();
            $table->string('_key')->nullable();
            $table->string('company_uuid', 191)->nullable()->index();
            $table->string('name')->nullable();
            $table->string('guard_name')->nullable();
            $table->string('description')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('model_has_policies', function (Blueprint $table) {
            $table->string('policy_id', 191)->index();

            $table->string('model_type');
            $table->string('model_uuid', 191);
            $table->index(['model_uuid', 'model_type'], 'model_has_policies_model_uuid_model_type_index');

            $table
                ->foreign('policy_id')
                ->references('id')
                ->on('policies')
                ->onDelete('cascade');

            $table->primary(['policy_id', 'model_uuid', 'model_type'], 'model_has_policies_policy_model_type_primary');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('policies');
        Schema::dropIfExists('model_has_policies');
        Schema::enableForeignKeyConstraints();
    }
};
