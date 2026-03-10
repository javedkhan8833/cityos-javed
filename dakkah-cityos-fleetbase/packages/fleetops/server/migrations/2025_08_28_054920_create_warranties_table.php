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
        Schema::create('warranties', function (Blueprint $table) {
            $table->increments('id');
            $table->string('uuid', 191)->unique();
            $table->string('_key')->nullable()->index();
            $table->string('company_uuid', 191)->constrained('companies', 'uuid')->cascadeOnDelete();
            $table->string('vendor_uuid', 191)->nullable()->constrained('vendors', 'uuid')->nullOnDelete();
            $table->string('category_uuid', 191)->nullable()->constrained('categories', 'uuid')->nullOnDelete();
            $table->string('created_by_uuid', 191)->nullable()->constrained('users', 'uuid')->nullOnDelete();
            $table->string('updated_by_uuid', 191)->nullable()->constrained('users', 'uuid')->nullOnDelete();

            // Covered item
            $table->string('subject_type')->nullable();
            $table->string('subject_uuid', 191)->nullable();
            $table->index(['subject_type', 'subject_uuid']);

            $table->string('provider')->nullable()->index();    // manufacturer or third-party
            $table->string('policy_number')->nullable()->index();
            $table->string('type')->nullable()->index();

            $table->date('start_date')->nullable()->index();
            $table->date('end_date')->nullable()->index();

            $table->json('coverage')->nullable();   // { parts: true, labor: false, roadside: true, limits: ... }
            $table->json('terms')->nullable();      // text/structured
            $table->text('policy')->nullable();      // text/structured
            $table->json('meta')->nullable();

            $table->softDeletes();
            $table->timestamps();

            $table->index(['company_uuid', 'end_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('warranties');
        Schema::enableForeignKeyConstraints();
    }
};
