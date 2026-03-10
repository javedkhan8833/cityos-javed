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
        Schema::create('chat_channels', function (Blueprint $table) {
            $table->increments('id');
            $table->string('uuid', 191)->nullable()->unique();
            $table->string('company_uuid', 191)->nullable()->index()->references('uuid')->on('companies');
            $table->string('created_by_uuid', 191)->nullable()->index()->references('uuid')->on('users');
            $table->string('public_id')->nullable()->index();
            $table->string('name')->nullable();
            $table->string('slug')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chat_channels');
    }
};
