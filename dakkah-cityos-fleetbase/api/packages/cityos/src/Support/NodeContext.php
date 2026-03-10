<?php

namespace Fleetbase\CityOS\Support;

use Fleetbase\CityOS\Models\Tenant;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class NodeContext
{
    public string $nodeId;
    public string $correlationId;
    public string $contractVersion;
    public string $country;
    public string $cityOrTheme;
    public string $sector;
    public string $category;
    public string $subcategory;
    public string $tenant;
    public string $channel;
    public string $surface;
    public string $persona;
    public string $brand;
    public string $theme;
    public string $locale;
    public string $processingRegion;
    public string $residencyClass;
    public string $version;

    private ?Tenant $resolvedTenant = null;
    private bool $explicitTenantInvalid = false;

    public function __construct(array $data = [])
    {
        $this->nodeId = $data['nodeId'] ?? (string) Str::uuid();
        $this->correlationId = $data['correlationId'] ?? (string) Str::uuid();
        $this->contractVersion = $data['contractVersion'] ?? '1.0.0';
        $this->country = $data['country'] ?? '';
        $this->cityOrTheme = $data['cityOrTheme'] ?? '';
        $this->sector = $data['sector'] ?? '';
        $this->category = $data['category'] ?? '';
        $this->subcategory = $data['subcategory'] ?? '';
        $this->tenant = $data['tenant'] ?? '';
        $this->channel = $data['channel'] ?? 'api';
        $this->surface = $data['surface'] ?? 'ops-dashboard';
        $this->persona = $data['persona'] ?? 'admin';
        $this->brand = $data['brand'] ?? '';
        $this->theme = $data['theme'] ?? '';
        $this->locale = $data['locale'] ?? config('cityos.node_context.default_locale', 'ar-SA');
        $this->processingRegion = $data['processingRegion'] ?? config('cityos.node_context.default_processing_region', 'me-central-1');
        $this->residencyClass = $data['residencyClass'] ?? config('cityos.node_context.default_residency_class', 'sovereign');
        $this->version = $data['version'] ?? '1';
    }

    public static function fromRequest(Request $request): self
    {
        $prefix = config('cityos.node_context.header_prefix', 'X-CityOS-');
        $cookiePrefix = config('cityos.node_context.cookie_prefix', 'cityos_');

        $resolve = function (string $field) use ($request, $prefix, $cookiePrefix) {
            return $request->header($prefix . ucfirst($field))
                ?? $request->route($field)
                ?? $request->cookie($cookiePrefix . strtolower($field))
                ?? $request->input('node_context.' . $field)
                ?? '';
        };

        return new self([
            'nodeId' => $request->header($prefix . 'Node-Id') ?? (string) Str::uuid(),
            'correlationId' => $request->header($prefix . 'Correlation-Id') ?? (string) Str::uuid(),
            'contractVersion' => $request->header($prefix . 'Contract-Version') ?? '1.0.0',
            'country' => $resolve('Country'),
            'cityOrTheme' => $resolve('City'),
            'sector' => $resolve('Sector'),
            'category' => $resolve('Category'),
            'subcategory' => $resolve('Subcategory'),
            'tenant' => $resolve('Tenant'),
            'channel' => $resolve('Channel'),
            'surface' => $resolve('Surface'),
            'persona' => $resolve('Persona'),
            'brand' => $resolve('Brand'),
            'theme' => $resolve('Theme'),
            'locale' => $resolve('Locale'),
            'processingRegion' => $resolve('ProcessingRegion'),
            'residencyClass' => $resolve('ResidencyClass'),
            'version' => $resolve('Version'),
        ]);
    }

    public function resolveTenant(): ?Tenant
    {
        if ($this->resolvedTenant) {
            return $this->resolvedTenant;
        }

        if (empty($this->tenant)) {
            return null;
        }

        $this->resolvedTenant = Tenant::with(['country', 'city', 'sector', 'category'])
            ->where('handle', $this->tenant)
            ->orWhere('uuid', $this->tenant)
            ->first();

        return $this->resolvedTenant;
    }

    public function setResolvedTenant(?Tenant $tenant): void
    {
        $this->resolvedTenant = $tenant;
        if ($tenant) {
            $ctx = $tenant->getNodeContext();
            $this->country = $this->country ?: $ctx['country'];
            $this->cityOrTheme = $this->cityOrTheme ?: $ctx['cityOrTheme'];
            $this->sector = $this->sector ?: $ctx['sector'];
            $this->category = $this->category ?: $ctx['category'];
            $this->locale = $this->locale ?: $ctx['locale'];
            $this->processingRegion = $this->processingRegion ?: $ctx['processingRegion'];
            $this->residencyClass = $this->residencyClass ?: $ctx['residencyClass'];
        }
    }

    public function toArray(): array
    {
        return [
            'nodeId' => $this->nodeId,
            'correlationId' => $this->correlationId,
            'contractVersion' => $this->contractVersion,
            'country' => $this->country,
            'cityOrTheme' => $this->cityOrTheme,
            'sector' => $this->sector,
            'category' => $this->category,
            'subcategory' => $this->subcategory,
            'tenant' => $this->tenant,
            'channel' => $this->channel,
            'surface' => $this->surface,
            'persona' => $this->persona,
            'brand' => $this->brand,
            'theme' => $this->theme,
            'locale' => $this->locale,
            'processingRegion' => $this->processingRegion,
            'residencyClass' => $this->residencyClass,
            'version' => $this->version,
        ];
    }

    public function isValid(): bool
    {
        $required = config('cityos.node_context.required_fields', ['country', 'tenant']);
        foreach ($required as $field) {
            if (empty($this->{$field})) {
                return false;
            }
        }
        return true;
    }

    public function markExplicitTenantInvalid(): void
    {
        $this->explicitTenantInvalid = true;
    }

    public function isExplicitTenantInvalid(): bool
    {
        return $this->explicitTenantInvalid;
    }
}
