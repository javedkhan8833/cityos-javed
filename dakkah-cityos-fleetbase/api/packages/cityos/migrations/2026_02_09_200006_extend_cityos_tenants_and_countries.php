<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up() {
        Schema::table('cityos_tenants', function (Blueprint $table) {
            $table->string('parent_tenant_uuid', 36)->nullable()->index()->after('category_uuid');
            $table->string('tenant_tier', 20)->default('CITY')->after('parent_tenant_uuid');
            $table->string('region_uuid', 36)->nullable()->index()->after('tenant_tier');
            $table->string('governance_authority_uuid', 36)->nullable()->index()->after('region_uuid');
            $table->string('residency_zone', 20)->nullable()->after('governance_authority_uuid');
            $table->string('data_classification_default', 20)->default('INTERNAL')->after('residency_zone');
            $table->string('cms_tenant_id')->nullable()->index()->after('payload_tenant_id');
            $table->json('feature_flags')->nullable()->after('meta');

            $table->foreign('region_uuid')->references('uuid')->on('cityos_regions');
            $table->foreign('governance_authority_uuid')->references('uuid')->on('cityos_governance_authorities');
        });

        Schema::table('cityos_countries', function (Blueprint $table) {
            $table->string('region_uuid', 36)->nullable()->index()->after('code');
            $table->json('policies')->nullable()->after('residency_class');
            $table->json('settings')->nullable()->after('policies');
            $table->string('cms_country_id')->nullable()->index()->after('settings');

            $table->foreign('region_uuid')->references('uuid')->on('cityos_regions');
        });
    }
    public function down() {
        Schema::table('cityos_tenants', function (Blueprint $table) {
            $table->dropForeign(['region_uuid']);
            $table->dropForeign(['governance_authority_uuid']);
            $table->dropColumn(['parent_tenant_uuid', 'tenant_tier', 'region_uuid', 'governance_authority_uuid', 'residency_zone', 'data_classification_default', 'cms_tenant_id', 'feature_flags']);
        });
        Schema::table('cityos_countries', function (Blueprint $table) {
            $table->dropForeign(['region_uuid']);
            $table->dropColumn(['region_uuid', 'policies', 'settings', 'cms_country_id']);
        });
    }
};
