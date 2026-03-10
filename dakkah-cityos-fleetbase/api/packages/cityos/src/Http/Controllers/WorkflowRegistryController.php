<?php

namespace Fleetbase\CityOS\Http\Controllers;

use Fleetbase\CityOS\Services\QueueSystemMapService;
use Fleetbase\CityOS\Services\WorkflowRegistryService;
use Fleetbase\CityOS\Services\TemporalCliBridge;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class WorkflowRegistryController extends Controller
{
    protected WorkflowRegistryService $registryService;
    protected QueueSystemMapService $queueMapService;

    public function __construct()
    {
        $this->registryService = new WorkflowRegistryService();
        $this->queueMapService = new QueueSystemMapService();
    }

    public function index(Request $request)
    {
        $filters = $request->only([
            'system', 'domainPack', 'source', 'tags', 'search', 'queue', 'isActive',
        ]);

        $results = $this->registryService->query($filters);

        return response()->json($results, 200, [
            'Cache-Control' => 'public, max-age=30, s-maxage=60',
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'workflowType' => 'required|string|max:255',
            'displayName' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'domainPack' => 'nullable|string|max:100',
            'sourceSystem' => 'nullable|string|max:100',
            'taskQueues' => 'nullable|array',
            'taskQueues.*' => 'string|max:255',
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:100',
            'inputSchema' => 'nullable|array',
            'outputSchema' => 'nullable|array',
            'retryPolicy' => 'nullable|array',
        ]);

        $entry = $this->registryService->register($validated);

        return response()->json($entry, 201);
    }

    public function queueSystemMap()
    {
        $map = $this->queueMapService->getFullMap();

        return response()->json($map, 200, [
            'Cache-Control' => 'public, max-age=300, s-maxage=600',
        ]);
    }

    public function definitions(Request $request)
    {
        $filters = $request->only([
            'system', 'domainPack', 'tags', 'search',
        ]);

        $results = $this->registryService->getDefinitions($filters);

        return response()->json($results, 200, [
            'Cache-Control' => 'public, max-age=30, s-maxage=60',
        ]);
    }

    public function sync()
    {
        if (!extension_loaded('grpc')) {
            $bridge = new TemporalCliBridge(60);
            $result = $bridge->syncRegistry();
            return response()->json($result, ($result['success'] ?? false) ? 200 : 502);
        }

        $result = $this->registryService->syncFromTemporal();

        return response()->json($result);
    }
}
