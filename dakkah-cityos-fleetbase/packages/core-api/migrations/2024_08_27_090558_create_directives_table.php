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
        Schema::create('directives', function (Blueprint $table) {
            $table->increments('id');
            $table->string('uuid', 191)->nullable()->unique();
            $table->string('company_uuid', 191)->nullable()->index()->references('uuid')->on('companies');
            $table->string('permission_uuid', 191)->nullable()->index()->references('id')->on('permissions');
            $table->string('subject_type')->nullable();
            $table->string('subject_uuid', 191)->nullable();
            $table->index(['subject_type', 'subject_uuid']);
            $table->mediumText('key')->nullable();
            $table->json('rules')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('directives');
    }
};
