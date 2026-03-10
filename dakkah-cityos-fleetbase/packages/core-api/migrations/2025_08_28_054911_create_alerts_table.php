<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('alerts', function (Blueprint $table) {
            $table->increments('id');
            $table->string('uuid', 191)->unique();
            $table->string('_key')->nullable()->index();
            $table->string('company_uuid', 191)->constrained('companies', 'uuid')->cascadeOnDelete();
            $table->string('category_uuid', 191)->nullable()->constrained('categories', 'uuid')->nullOnDelete();
            $table->string('acknowledged_by_uuid', 191)->nullable()->constrained('users', 'uuid')->nullOnDelete();
            $table->string('resolved_by_uuid', 191)->nullable()->constrained('users', 'uuid')->nullOnDelete();

            $table->string('type')->index();           // geofence_breach, harsh_event, temp_out_of_range, offline, etc.
            $table->string('severity')->index();       // info, warning, critical
            $table->string('status')->default('open')->index(); // open, acknowledged, resolved

            // Origin of alert / subject ie: device, sensor, asset, driver, place, etc.
            $table->string('subject_type')->nullable();
            $table->string('subject_uuid', 191)->nullable();
            $table->index(['subject_type', 'subject_uuid']);

            $table->text('message')->nullable();
            $table->json('rule')->nullable();          // serialized rule that triggered this
            $table->json('context')->nullable();       // snapshot at trigger time
            $table->json('meta')->nullable();

            $table->timestamp('triggered_at')->nullable()->index();
            $table->timestamp('acknowledged_at')->nullable()->index();
            $table->timestamp('resolved_at')->nullable()->index();

            $table->softDeletes();
            $table->timestamps();

            $table->index(['company_uuid', 'type', 'severity']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('alerts');
    }
};
