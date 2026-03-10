<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('comments', function (Blueprint $table) {
            $table->increments('id');
            $table->string('uuid', 191)->nullable()->unique();
            $table->string('public_id')->nullable()->unique();
            $table->string('company_uuid', 191)->references('uuid')->on('companies')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->string('author_uuid', 191)->references('uuid')->on('users')->onUpdate('CASCADE')->onDelete('CASCADE');
            // $table->string('parent_comment_uuid', 191)->nullable()->references('uuid')->on('comments')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->string('subject_uuid', 191);
            $table->string('subject_type')->nullable();
            $table->mediumText('content');
            $table->json('tags')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::table('comments', function (Blueprint $table) {
            $table->string('parent_comment_uuid', 191)->nullable()->after('author_uuid')->references('uuid')->on('comments')->onUpdate('CASCADE')->onDelete('CASCADE');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('comments');
    }
};
