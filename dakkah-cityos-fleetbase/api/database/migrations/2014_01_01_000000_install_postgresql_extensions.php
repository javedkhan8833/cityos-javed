<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Log;

return new class extends Migration
{
    public $withinTransaction = false;

    public function up(): void
    {
        $extensions = [
            'postgis',
            'postgis_topology',
            'pg_trgm',
            'btree_gist',
            'unaccent',
            'ltree',
            'citext',
            'bloom',
            'cube',
            'earthdistance',
            'uuid-ossp',
        ];

        // Install all extensions in a single psql subprocess to avoid
        // leaving PHP's PDO connection in an aborted-transaction state.
        // Each CREATE EXTENSION runs in its own transaction via psql's
        // default autocommit mode, so a failure on one does not block the rest.
        $databaseUrl = env('DATABASE_URL');
        $sqlStatements = '';
        foreach ($extensions as $ext) {
            $sqlStatements .= "CREATE EXTENSION IF NOT EXISTS \"{$ext}\"; ";
        }

        $cmd = "psql " . escapeshellarg($databaseUrl) . " -c " . escapeshellarg($sqlStatements) . " 2>&1";
        $output = shell_exec($cmd);

        if ($output !== null && str_contains(strtolower($output), 'error')) {
            Log::warning("PostgreSQL extension install may have issues: {$output}");
        }
    }

    public function down(): void
    {
        $extensions = [
            'earthdistance',
            'cube',
            'bloom',
            'uuid-ossp',
            'citext',
            'ltree',
            'unaccent',
            'btree_gist',
            'pg_trgm',
            'postgis_topology',
            'postgis',
        ];

        $databaseUrl = env('DATABASE_URL');

        foreach ($extensions as $ext) {
            $cmd = "psql " . escapeshellarg($databaseUrl) . " -c " . escapeshellarg("DROP EXTENSION IF EXISTS \"{$ext}\" CASCADE;") . " 2>&1";
            $output = shell_exec($cmd);

            if ($output !== null && str_contains(strtolower($output), 'error')) {
                Log::warning("Could not drop extension '{$ext}': {$output}");
            }
        }
    }
};
