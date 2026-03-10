<?php

namespace Fleetbase\CityOS\Http\Controllers;

use Fleetbase\CityOS\Services\TemporalService;
use Fleetbase\CityOS\Services\TemporalCliBridge;
use Fleetbase\CityOS\Services\PayloadCMSService;
use Fleetbase\CityOS\Services\ERPNextService;
use Fleetbase\CityOS\Services\CityBusService;
use Fleetbase\CityOS\Models\IntegrationLog;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class IntegrationController extends Controller
{
    protected function getCliBridge(): TemporalCliBridge
    {
        return new TemporalCliBridge();
    }

    protected function needsCliBridge(): bool
    {
        return !TemporalCliBridge::isGrpcAvailable();
    }

    public function status()
    {
        if ($this->needsCliBridge()) {
            $temporalInfo = $this->getCliBridge()->health();
        } else {
            $temporal = app(TemporalService::class);
            $temporalInfo = $temporal->getConnectionInfo();
        }

        $cms = app(PayloadCMSService::class);
        $erpnext = app(ERPNextService::class);
        $citybus = app(CityBusService::class);

        return response()->json([
            'integrations' => [
                'temporal' => $temporalInfo,
                'payload_cms' => $cms->getStorageInfo(),
                'erpnext' => $erpnext->getStatus(),
                'citybus' => [
                    'outbox' => $citybus->getOutboxStats(),
                ],
            ],
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    public function temporalConnection()
    {
        if ($this->needsCliBridge()) {
            return response()->json($this->getCliBridge()->health());
        }

        $temporal = app(TemporalService::class);
        return response()->json($temporal->getConnectionInfo());
    }

    public function temporalWorkflows(Request $request)
    {
        if ($this->needsCliBridge()) {
            return response()->json($this->getCliBridge()->listWorkflows(
                $request->input('page_size', 20),
                $request->input('query', '')
            ));
        }

        $temporal = app(TemporalService::class);
        return response()->json($temporal->listWorkflows(
            $request->input('page_size', 20),
            $request->input('query', '')
        ));
    }

    public function temporalStartWorkflow(Request $request)
    {
        $request->validate([
            'workflow_type' => 'required|string',
            'workflow_id' => 'required|string',
            'input' => 'array',
            'task_queue' => 'string',
        ]);

        if ($this->needsCliBridge()) {
            return response()->json($this->getCliBridge()->startWorkflow(
                $request->input('workflow_type'),
                $request->input('workflow_id'),
                $request->input('input', []),
                $request->input('task_queue', 'cityos-workflow-queue')
            ));
        }

        $temporal = app(TemporalService::class);
        return response()->json($temporal->startWorkflow(
            $request->input('workflow_type'),
            $request->input('workflow_id'),
            $request->input('input', []),
            $request->input('task_queue', 'cityos-workflow-queue')
        ));
    }

    public function temporalQueryWorkflow(Request $request, string $workflowId)
    {
        if ($this->needsCliBridge()) {
            return response()->json($this->getCliBridge()->describeWorkflow(
                $workflowId,
                $request->input('run_id')
            ));
        }

        $temporal = app(TemporalService::class);
        return response()->json($temporal->queryWorkflow($workflowId, $request->input('run_id')));
    }

    public function temporalSignalWorkflow(Request $request, string $workflowId)
    {
        $request->validate([
            'signal_name' => 'required|string',
            'payload' => 'array',
        ]);

        if ($this->needsCliBridge()) {
            return response()->json($this->getCliBridge()->signalWorkflow(
                $workflowId,
                $request->input('signal_name'),
                $request->input('payload', []),
                $request->input('run_id')
            ));
        }

        $temporal = app(TemporalService::class);
        return response()->json($temporal->signalWorkflow(
            $workflowId,
            $request->input('signal_name'),
            $request->input('payload', []),
            $request->input('run_id')
        ));
    }

    public function temporalTerminateWorkflow(Request $request, string $workflowId)
    {
        if ($this->needsCliBridge()) {
            return response()->json($this->getCliBridge()->terminateWorkflow(
                $workflowId,
                $request->input('reason', ''),
                $request->input('run_id')
            ));
        }

        $temporal = app(TemporalService::class);
        return response()->json($temporal->terminateWorkflow(
            $workflowId,
            $request->input('reason', ''),
            $request->input('run_id')
        ));
    }

    public function temporalSyncTrigger(Request $request)
    {
        if ($this->needsCliBridge()) {
            return response()->json($this->getCliBridge()->syncRegistry());
        }

        $temporal = app(TemporalService::class);
        return response()->json($temporal->triggerCMSSync($request->input('limit', 100)));
    }

    public function temporalSyncStatus()
    {
        $temporal = app(TemporalService::class);
        return response()->json($temporal->getSyncStatus());
    }

    public function temporalWorkflowRegistry(Request $request)
    {
        $temporal = app(TemporalService::class);
        return response()->json($temporal->getWorkflowRegistry($request->input('domain')));
    }

    public function temporalWorkflowRegistryStats()
    {
        $temporal = app(TemporalService::class);
        return response()->json($temporal->getWorkflowRegistryStats());
    }

    public function cmsHealth()
    {
        $cms = app(PayloadCMSService::class);
        return response()->json($cms->getHealth());
    }

    public function cmsNodes(Request $request)
    {
        $cms = app(PayloadCMSService::class);
        return response()->json($cms->getNodes($request->all()));
    }

    public function cmsTenants(Request $request)
    {
        $cms = app(PayloadCMSService::class);
        return response()->json($cms->getTenants($request->all()));
    }

    public function cmsPOIs(Request $request)
    {
        $cms = app(PayloadCMSService::class);
        return response()->json($cms->getPOIs($request->all()));
    }

    public function cmsCollections(Request $request)
    {
        $cms = app(PayloadCMSService::class);
        return response()->json($cms->getCollections($request->all()));
    }

    public function cmsGovernance(Request $request)
    {
        $cms = app(PayloadCMSService::class);
        return response()->json($cms->getGovernance($request->all()));
    }

    public function cmsStorage(Request $request)
    {
        $cms = app(PayloadCMSService::class);
        $bucket = $request->input('bucket', 'cityos-media');
        return response()->json($cms->listObjects($bucket, $request->input('prefix', ''), $request->input('max_keys', 100)));
    }

    public function cmsStorageInfo()
    {
        $cms = app(PayloadCMSService::class);
        return response()->json($cms->getStorageInfo());
    }

    public function cmsSync(Request $request)
    {
        $collection = $request->input('collection');

        try {
            $result = \Fleetbase\CityOS\Console\Commands\SyncPayloadCmsCommand::runSync($collection);
            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function erpnextStatus()
    {
        $erpnext = app(ERPNextService::class);
        return response()->json($erpnext->getStatus());
    }

    public function erpnextSettlement(Request $request)
    {
        $erpnext = app(ERPNextService::class);
        return response()->json($erpnext->postDeliverySettlement($request->all()));
    }

    public function outboxStats()
    {
        $citybus = app(CityBusService::class);
        return response()->json($citybus->getOutboxStats());
    }

    public function outboxDispatch(Request $request)
    {
        $citybus = app(CityBusService::class);
        return response()->json($citybus->dispatchPending($request->input('batch_size', 50)));
    }

    public function outboxPublish(Request $request)
    {
        $request->validate([
            'event_type' => 'required|string',
            'payload' => 'required|array',
        ]);

        $citybus = app(CityBusService::class);
        $event = $citybus->publish(
            $request->input('event_type'),
            $request->input('payload'),
            $request->input('node_context', []),
            $request->input('tenant_id')
        );

        return response()->json(['success' => true, 'event' => $event]);
    }

    public function outboxRecent(Request $request)
    {
        $citybus = app(CityBusService::class);
        return response()->json($citybus->getRecentEvents($request->input('limit', 20)));
    }

    public function integrationLogs(Request $request)
    {
        $query = IntegrationLog::orderBy('created_at', 'desc');

        if ($request->has('integration')) {
            $query->where('integration', $request->input('integration'));
        }

        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        return response()->json($query->limit($request->input('limit', 50))->get());
    }
}
