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
        Schema::create('custom_field_values', function (Blueprint $table) {
            $table->increments('id');
            $table->string('uuid', 191)->unique();
            $table->string('company_uuid', 191)->nullable()->index()->references('uuid')->on('companies');
            $table->string('custom_field_uuid', 191)->nullable()->index()->references('uuid')->on('custom_fields');
            $table->string('subject_uuid', 191);
            $table->string('subject_type');
            $table->text('value');
            $table->string('value_type');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('custom_field_values');
    }
};
