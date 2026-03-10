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
        Schema::create('chat_attachments', function (Blueprint $table) {
            $table->increments('id');
            $table->string('uuid', 191)->nullable()->unique();
            $table->string('public_id')->nullables()->index();
            $table->string('company_uuid', 191)->nullable()->index()->references('uuid')->on('companies');
            $table->string('sender_uuid', 191)->nullable()->index()->references('uuid')->on('chat_participants');
            $table->string('chat_channel_uuid', 191)->nullable()->index()->references('uuid')->on('chat_channels');
            $table->string('chat_message_uuid', 191)->nullable()->index()->references('uuid')->on('chat_messages');
            $table->string('file_uuid', 191)->nullable()->index()->references('uuid')->on('files');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chat_attachments');
    }
};
