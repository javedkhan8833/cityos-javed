<?php

namespace Fleetbase\CityOS\Console\Commands;

use Illuminate\Console\Command;
use Fleetbase\CityOS\Services\PayloadCMSService;
use Fleetbase\CityOS\Services\CmsMappingService;

class SyncPayloadCmsCommand extends Command
{
    protected $signature = 'cityos:sync-cms
        {--collection= : Sync only a specific collection (countries, governance-authorities, scopes, categories, subcategories, tenants, stores, portals)}
        {--dry-run : Show what would be synced without making changes}';

    protected $description = 'Pull all hierarchy data from Payload CMS API and sync into local database every 15 minutes';

    protected array $syncOrder = [
        'countries',
        'governance-authorities',
        'scopes',
        'categories',
        'subcategories',
        'tenants',
        'stores',
        'portals',
    ];

    public function handle(): int
    {
        $dryRun = $this->option('dry-run');
        $collectionFilter = $this->option('collection');

        $cms = app(PayloadCMSService::class);
        $mapper = app(CmsMappingService::class);

        $this->info($dryRun ? '=== DRY RUN: CMS SYNC ===' : '=== SYNCING FROM PAYLOAD CMS ===');
        $this->newLine();

        if (!$cms->isConfigured()) {
            $this->error('Payload CMS is not configured. Set CITYOS_CMS_BASE_URL and CITYOS_CMS_API_KEY environment variables.');
            return 1;
        }

        $health = $cms->getHealth();
        if (!($health['success'] ?? false)) {
            $this->error('Cannot reach Payload CMS at ' . config('cityos.cms.base_url'));
            $this->error('Error: ' . ($health['error'] ?? json_encode($health['data'] ?? 'No response')));
            return 1;
        }
        $this->info('Connected to Payload CMS successfully.');
        $this->newLine();

        $collections = $collectionFilter ? [$collectionFilter] : $this->syncOrder;
        $allStats = [];

        foreach ($collections as $collection) {
            if (!in_array($collection, $this->syncOrder)) {
                $this->warn("Unknown collection: {$collection}, skipping.");
                continue;
            }

            $cmsCollection = $this->getCmsCollectionName($collection);
            $this->info("Fetching '{$collection}' (CMS: {$cmsCollection}) ...");

            $result = $this->fetchCollection($cms, $collection);

            if (!($result['success'] ?? false)) {
                $this->warn("  Failed to fetch '{$collection}': " . ($result['error'] ?? 'Unknown error'));
                $allStats[$collection] = ['error' => $result['error'] ?? 'fetch_failed'];
                continue;
            }

            $data = $result['data']['docs'] ?? $result['data'] ?? [];
            if (!is_array($data)) {
                $this->warn("  No data returned for '{$collection}'.");
                $allStats[$collection] = ['skipped' => true, 'reason' => 'no_data'];
                continue;
            }

            $count = count($data);
            $this->info("  Fetched {$count} records.");

            if ($dryRun) {
                $allStats[$collection] = ['fetched' => $count, 'dry_run' => true];
                $this->line("  [DRY RUN] Would sync {$count} records.");
                continue;
            }

            $stats = $this->syncCollection($mapper, $collection, $data);
            $allStats[$collection] = $stats;

            $this->line("  Created: {$stats['created']}, Updated: {$stats['updated']}, Unchanged: {$stats['unchanged']}");
        }

        $this->newLine();
        $this->info('=== SYNC SUMMARY ===');
        $this->table(
            ['Collection', 'Created', 'Updated', 'Unchanged', 'Status'],
            collect($allStats)->map(function ($stats, $collection) {
                if (isset($stats['error'])) {
                    return [$collection, '-', '-', '-', 'ERROR: ' . $stats['error']];
                }
                if (isset($stats['dry_run'])) {
                    return [$collection, '-', '-', '-', "DRY RUN ({$stats['fetched']} fetched)"];
                }
                return [
                    $collection,
                    $stats['created'] ?? 0,
                    $stats['updated'] ?? 0,
                    $stats['unchanged'] ?? 0,
                    'OK',
                ];
            })->toArray()
        );

        return 0;
    }

    protected function getCmsCollectionName(string $localName): string
    {
        return match ($localName) {
            'scopes' => 'scopes',
            'subcategories' => 'subcategories',
            default => $localName,
        };
    }

    protected function fetchCollection(PayloadCMSService $cms, string $collection): array
    {
        if (!in_array($collection, $this->syncOrder)) {
            return ['success' => false, 'error' => 'unknown_collection'];
        }

        $cmsCollection = $this->getCmsCollectionName($collection);

        return $cms->getAllFromCollection($cmsCollection, ['limit' => 100, 'depth' => 2]);
    }

    protected function syncCollection(CmsMappingService $mapper, string $collection, array $data): array
    {
        return match ($collection) {
            'countries' => $mapper->syncCountries($data),
            'governance-authorities' => $mapper->syncGovernanceAuthorities($data),
            'scopes' => $mapper->syncScopes($data),
            'categories' => $mapper->syncCategories($data),
            'subcategories' => $mapper->syncSubcategories($data),
            'tenants' => $mapper->syncTenants($data),
            'stores' => $mapper->syncStores($data),
            'portals' => $mapper->syncPortals($data),
            default => ['created' => 0, 'updated' => 0, 'unchanged' => 0],
        };
    }

    public static function runSync(?string $collection = null): array
    {
        $cms = app(PayloadCMSService::class);
        $mapper = app(CmsMappingService::class);

        if (!$cms->isConfigured()) {
            return ['success' => false, 'error' => 'Payload CMS is not configured. Set CITYOS_CMS_BASE_URL and CITYOS_CMS_API_KEY.'];
        }

        $health = $cms->getHealth();
        if (!($health['success'] ?? false)) {
            return ['success' => false, 'error' => 'Cannot reach Payload CMS: ' . ($health['error'] ?? 'Unknown')];
        }

        $syncOrder = [
            'countries', 'governance-authorities', 'scopes',
            'categories', 'subcategories', 'tenants', 'stores', 'portals',
        ];

        $collections = $collection ? [$collection] : $syncOrder;
        $instance = new self();
        $allStats = [];

        foreach ($collections as $col) {
            if (!in_array($col, $syncOrder)) {
                $allStats[$col] = ['error' => 'unknown_collection'];
                continue;
            }

            $result = $instance->fetchCollection($cms, $col);
            if (!($result['success'] ?? false)) {
                $allStats[$col] = ['error' => $result['error'] ?? 'fetch_failed'];
                continue;
            }

            $data = $result['data']['docs'] ?? $result['data'] ?? [];
            if (!is_array($data) || empty($data)) {
                $allStats[$col] = ['created' => 0, 'updated' => 0, 'unchanged' => 0, 'fetched' => 0];
                continue;
            }

            $stats = $instance->syncCollection($mapper, $col, $data);
            $stats['fetched'] = count($data);
            $allStats[$col] = $stats;
        }

        return ['success' => true, 'results' => $allStats];
    }
}
