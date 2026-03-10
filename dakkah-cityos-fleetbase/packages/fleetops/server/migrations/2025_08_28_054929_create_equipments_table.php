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
        Schema::create('equipments', function (Blueprint $table) {
            $table->increments('id');
            $table->string('uuid', 191)->unique();
            $table->string('_key')->nullable()->index();
            $table->string('company_uuid', 191)->constrained('companies', 'uuid')->cascadeOnDelete();
            $table->string('category_uuid', 191)->nullable()->constrained('categories', 'uuid')->nullOnDelete();

            $table->string('name')->index();
            $table->string('code')->nullable()->index();
            $table->string('type')->nullable()->index();     // ppe, tool, accessory, fridge unit, etc.
            $table->string('status')->default('active')->index();
            $table->string('slug')->nullable()->index();
            $table->string('serial_number')->nullable()->index();
            $table->string('manufacturer')->nullable();
            $table->string('model')->nullable();

            // Can be assigned to an asset, device, driver, or facility
            $table->string('equipable_type')->nullable();
            $table->string('equipable_uuid', 191)->nullable();
            $table->index(['equipable_type', 'equipable_uuid']);

            $table->date('purchased_at')->nullable();
            $table->integer('purchase_price')->nullable();
            $table->string('currency')->nullable();

            $table->string('warranty_uuid', 191)->nullable()->constrained('warranties', 'uuid')->nullOnDelete();

            $table->json('meta')->nullable();
            $table->string('created_by_uuid', 191)->nullable()->constrained('users', 'uuid')->nullOnDelete();
            $table->string('updated_by_uuid', 191)->nullable()->constrained('users', 'uuid')->nullOnDelete();

            $table->softDeletes();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('equipments');
        Schema::enableForeignKeyConstraints();
    }
};
