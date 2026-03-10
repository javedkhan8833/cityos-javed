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
        Schema::create('work_orders', function (Blueprint $table) {
            $table->increments('id');
            $table->string('uuid', 191)->unique();
            $table->string('_key')->nullable()->index();
            $table->string('company_uuid', 191)->constrained('companies', 'uuid')->cascadeOnDelete();
            $table->string('category_uuid', 191)->nullable()->constrained('categories', 'uuid')->nullOnDelete();

            $table->string('code')->nullable()->index(); // external WO number
            $table->string('subject')->index();
            $table->string('status')->default('open')->index();     // open, in_progress, blocked, done, canceled
            $table->string('priority')->nullable()->index();        // low, normal, high, critical

            // What the WO is for asset, equipment, device, place, etc.
            $table->string('target_type')->nullable();
            $table->string('target_uuid', 191)->nullable();
            $table->index(['target_type', 'target_uuid']);

            // Who it's assigned to (contact/technician/team/user/vendor)
            $table->string('assignee_type')->nullable();
            $table->string('assignee_uuid', 191)->nullable();
            $table->index(['assignee_type', 'assignee_uuid']);

            $table->timestamp('opened_at')->nullable()->index();
            $table->timestamp('due_at')->nullable()->index();
            $table->timestamp('closed_at')->nullable()->index();

            // -- Resource Planning
            $table->json('required_skills')->nullable(); // -- Skills needed for work
            $table->json('required_certifications')->nullable(); // -- Certs needed
            $table->integer('estimated_duration_hours')->nullable();
            $table->integer('actual_duration_hours')->nullable();
            $table->json('resource_requirements')->nullable(); // -- Tools, parts, etc.

            // -- Scheduling & Dependencies
            $table->timestamp('earliest_start_date')->nullable();
            $table->timestamp('latest_completion_date')->nullable();
            $table->string('scheduling_priority')->default('normal'); // -- low, normal, high, urgent
            $table->boolean('can_be_split')->default(false); // -- Can work be divided

            // -- Cost Management
            $table->integer('estimated_cost')->nullable();
            $table->integer('approved_budget')->nullable();
            $table->integer('actual_cost')->nullable();
            $table->string('currency')->nullable();
            $table->json('cost_breakdown')->nullable(); // -- Labor, parts, overhead
            $table->string('cost_center')->nullable()->index();
            $table->string('budget_code')->nullable()->index();

            $table->text('instructions')->nullable();
            $table->text('completion_notes')->nullable();
            $table->json('checklist')->nullable();  // [{title, required, done_at}, ...]
            $table->json('meta')->nullable();

            $table->string('created_by_uuid', 191)->nullable()->constrained('users', 'uuid')->nullOnDelete();
            $table->string('updated_by_uuid', 191)->nullable()->constrained('users', 'uuid')->nullOnDelete();

            $table->softDeletes();
            $table->timestamps();

            $table->index(['company_uuid', 'status', 'priority']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('work_orders');
        Schema::enableForeignKeyConstraints();
    }
};
