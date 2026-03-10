<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateAuditsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('pallet_audits', function (Blueprint $table) {
            $table->increments('id');
            $table->string('uuid', 191)->nullable()->unique();
            $table->string('public_id', 191)->nullable()->unique();
            $table->string('company_uuid', 191)->nullable()->index();
            $table->string('created_by_uuid', 191)->nullable()->index();
            $table->string('performed_by_uuid', 191)->nullable()->index();
            $table->string('auditable_uuid', 191)->nullable()->index();
            $table->string('auditable_type')->nullable();
            $table->mediumText('reason')->nullable();
            $table->mediumText('comments')->nullable();
            $table->string('action')->nullable();
            $table->string('type')->nullable();
            $table->json('meta')->nullable();
            $table->json('new_values')->nullable();
            $table->json('old_values')->nullable();
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('created_at')->nullable()->index();
            $table->timestamp('updated_at')->nullable();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('pallet_audits');
    }
}
