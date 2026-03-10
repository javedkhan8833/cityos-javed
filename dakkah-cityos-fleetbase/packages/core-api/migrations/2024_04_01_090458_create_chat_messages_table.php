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
        Schema::create('chat_messages', function (Blueprint $table) {
            $table->increments('id');
            $table->string('uuid', 191)->nullable()->unique();
            $table->string('public_id')->nullables()->index();
            $table->string('company_uuid', 191)->nullable()->index()->references('uuid')->on('companies');
            $table->string('sender_uuid', 191)->nullable()->index()->references('uuid')->on('chat_participants');
            $table->string('chat_channel_uuid', 191)->nullable()->index()->references('uuid')->on('chat_channels');
            $table->mediumText('content')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chat_messages');
    }
};
