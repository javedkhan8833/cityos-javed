<?php

namespace Fleetbase\CityOS\Http\Controllers;

use Fleetbase\CityOS\Models\OutboxEvent;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class OutboxEventController extends Controller
{
    public function index(Request $request)
    {
        $query = OutboxEvent::orderBy('created_at', 'desc');

        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->has('event_type')) {
            $query->where('event_type', $request->input('event_type'));
        }

        if ($request->has('tenant_id')) {
            $query->where('tenant_id', $request->input('tenant_id'));
        }

        if ($request->has('date_from')) {
            $query->where('created_at', '>=', $request->input('date_from'));
        }

        if ($request->has('date_to')) {
            $query->where('created_at', '<=', $request->input('date_to'));
        }

        $perPage = $request->input('per_page', 25);
        $results = $query->paginate($perPage);

        return response()->json($results);
    }

    public function show(string $id)
    {
        $event = OutboxEvent::findOrFail($id);

        return response()->json(['outbox_event' => $event]);
    }

    public function retry(string $id)
    {
        $event = OutboxEvent::findOrFail($id);

        $event->update([
            'status' => 'pending',
            'retry_count' => $event->retry_count + 1,
            'error_message' => null,
            'next_retry_at' => null,
        ]);

        return response()->json(['success' => true, 'outbox_event' => $event->fresh()]);
    }

    public function retryAllFailed()
    {
        $count = OutboxEvent::where('status', 'failed')
            ->update([
                'status' => 'pending',
                'error_message' => null,
                'next_retry_at' => null,
            ]);

        OutboxEvent::where('status', 'pending')
            ->whereNotNull('retry_count')
            ->increment('retry_count');

        return response()->json([
            'success' => true,
            'retried_count' => $count,
        ]);
    }

    public function deadLetter(string $id)
    {
        $event = OutboxEvent::findOrFail($id);

        $event->update([
            'status' => 'dead_letter',
            'next_retry_at' => null,
        ]);

        return response()->json(['success' => true, 'outbox_event' => $event->fresh()]);
    }

    public function stats()
    {
        $counts = OutboxEvent::selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        return response()->json([
            'stats' => [
                'pending' => $counts->get('pending', 0),
                'published' => $counts->get('published', 0),
                'failed' => $counts->get('failed', 0),
                'dead_letter' => $counts->get('dead_letter', 0),
                'total' => $counts->sum(),
            ],
        ]);
    }

    public function destroy(string $id)
    {
        $event = OutboxEvent::findOrFail($id);
        $event->delete();

        return response()->json(['success' => true, 'message' => 'Outbox event deleted.']);
    }
}
