<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cityos_sectors', function (Blueprint $table) {
            if (!Schema::hasColumn('cityos_sectors', 'cms_scope_id')) {
                $table->string('cms_scope_id')->nullable()->index()->after('uuid');
            }
        });

        Schema::table('cityos_categories', function (Blueprint $table) {
            if (!Schema::hasColumn('cityos_categories', 'cms_category_id')) {
                $table->string('cms_category_id')->nullable()->index()->after('uuid');
            }
        });

        Schema::table('cityos_governance_authorities', function (Blueprint $table) {
            if (!Schema::hasColumn('cityos_governance_authorities', 'cms_authority_id')) {
                $table->string('cms_authority_id')->nullable()->index()->after('uuid');
            }
        });

        Schema::table('cityos_portals', function (Blueprint $table) {
            if (!Schema::hasColumn('cityos_portals', 'cms_portal_id')) {
                $table->string('cms_portal_id')->nullable()->index()->after('uuid');
            }
        });
    }

    public function down(): void
    {
        Schema::table('cityos_sectors', function (Blueprint $table) {
            $table->dropColumn('cms_scope_id');
        });
        Schema::table('cityos_categories', function (Blueprint $table) {
            $table->dropColumn('cms_category_id');
        });
        Schema::table('cityos_governance_authorities', function (Blueprint $table) {
            $table->dropColumn('cms_authority_id');
        });
        Schema::table('cityos_portals', function (Blueprint $table) {
            $table->dropColumn('cms_portal_id');
        });
    }
};
