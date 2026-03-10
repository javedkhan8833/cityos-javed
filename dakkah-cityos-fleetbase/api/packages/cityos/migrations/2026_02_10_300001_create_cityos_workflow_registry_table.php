<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('cityos_workflow_registry', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('workflow_type', 255)->unique();
            $table->string('display_name', 255)->nullable();
            $table->text('description')->nullable();
            $table->string('domain_pack', 100)->nullable();
            $table->string('source', 50)->default('discovered');
            $table->string('source_system', 100)->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('execution_count')->default(0);
            $table->jsonb('task_queues')->nullable();
            $table->jsonb('tags')->nullable();
            $table->jsonb('status_counts')->nullable();
            $table->jsonb('input_schema')->nullable();
            $table->jsonb('output_schema')->nullable();
            $table->jsonb('retry_policy')->nullable();
            $table->timestamp('first_seen_at')->nullable();
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamps();

            $table->index('source_system', 'idx_wfreg_source_system');
            $table->index('domain_pack', 'idx_wfreg_domain_pack');
            $table->index('source', 'idx_wfreg_source');
            $table->index('is_active', 'idx_wfreg_active');
        });
    }

    public function down()
    {
        Schema::dropIfExists('cityos_workflow_registry');
    }
};
