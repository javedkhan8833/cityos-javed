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
        Schema::create('reports', function (Blueprint $table) {
            $table->increments('id');
            $table->string('uuid', 191)->unique();
            $table->string('_key')->nullable()->index();
            $table->string('company_uuid', 191)->constrained('companies', 'uuid')->cascadeOnDelete();
            $table->string('category_uuid', 191)->nullable()->constrained('categories', 'uuid')->nullOnDelete();
            $table->string('created_by_uuid', 191)->nullable()->constrained('users', 'uuid')->nullOnDelete();
            $table->string('updated_by_uuid', 191)->nullable()->constrained('users', 'uuid')->nullOnDelete();

            $table->string('type')->index();         // fuel, utilization, safety, location, custom, etc.
            $table->string('title')->nullable()->index();

            // Report subject (asset, device, fleet, driver, vendor, etc.)
            $table->string('subject_type')->nullable();
            $table->string('subject_uuid', 191)->nullable();
            $table->index(['subject_type', 'subject_uuid']);

            // Temporal scope
            $table->timestamp('period_start')->nullable()->index();
            $table->timestamp('period_end')->nullable()->index();

            // Payload
            $table->json('data')->nullable();        // structured results
            $table->text('body')->nullable();        // rendered / markdown text if needed

            $table->softDeletes();
            $table->timestamps();

            $table->index(['company_uuid', 'type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reports');
    }
};
