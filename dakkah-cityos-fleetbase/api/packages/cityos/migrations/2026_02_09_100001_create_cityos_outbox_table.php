<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('cityos_outbox', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('event_id', 36)->unique();
            $table->string('event_type', 100);
            $table->string('tenant_id', 100)->nullable();
            $table->jsonb('payload');
            $table->string('correlation_id', 100)->nullable();
            $table->jsonb('node_context')->nullable();
            $table->string('status', 20)->default('pending');
            $table->integer('retry_count')->default(0);
            $table->integer('max_retries')->default(5);
            $table->text('error_message')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamp('next_retry_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'next_retry_at'], 'idx_outbox_status');
            $table->index('tenant_id', 'idx_outbox_tenant');
            $table->index('event_type', 'idx_outbox_event_type');
        });

        Schema::create('cityos_integration_logs', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('integration', 50);
            $table->string('operation', 100);
            $table->string('direction', 10)->default('outbound');
            $table->string('status', 20)->default('success');
            $table->string('correlation_id', 100)->nullable();
            $table->jsonb('request_data')->nullable();
            $table->jsonb('response_data')->nullable();
            $table->text('error_message')->nullable();
            $table->integer('response_code')->nullable();
            $table->float('duration_ms')->nullable();
            $table->timestamps();

            $table->index('integration');
            $table->index(['integration', 'status']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('cityos_integration_logs');
        Schema::dropIfExists('cityos_outbox');
    }
};
