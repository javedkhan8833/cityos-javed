<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class InstallPostgresExtensions extends Command
{
    protected $signature = 'db:install-extensions';

    protected $description = 'Install required PostgreSQL extensions (PostGIS, pg_trgm, etc.) before migrations';

    public function handle(): int
    {
        $required = [
            'postgis',
            'postgis_topology',
        ];

        $contrib = [
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

        $optional = [
            'pg_stat_statements',
            'hll',
            'pg_partman',
        ];

        $this->info('Installing required PostgreSQL extensions...');

        foreach ($required as $ext) {
            try {
                DB::statement("CREATE EXTENSION IF NOT EXISTS \"{$ext}\"");
                $this->line("  ✓ {$ext}");
            } catch (\Exception $e) {
                $this->error("  ✗ {$ext} (REQUIRED): " . $e->getMessage());
                return Command::FAILURE;
            }
        }

        $this->info('Installing contrib PostgreSQL extensions...');

        foreach ($contrib as $ext) {
            try {
                DB::statement("CREATE EXTENSION IF NOT EXISTS \"{$ext}\"");
                $this->line("  ✓ {$ext}");
            } catch (\Exception $e) {
                $this->warn("  ⚠ {$ext}: " . $e->getMessage());
            }
        }

        $this->info('Installing optional PostgreSQL extensions...');

        foreach ($optional as $ext) {
            try {
                DB::statement("CREATE EXTENSION IF NOT EXISTS \"{$ext}\"");
                $this->line("  ✓ {$ext}");
            } catch (\Exception $e) {
                $this->line("  - {$ext} (skipped): not available on this provider");
            }
        }

        $this->newLine();
        $this->info('PostgreSQL extensions installation complete.');

        return Command::SUCCESS;
    }
}
