<?php

namespace Fleetbase\CityOS\Models;

use Illuminate\Database\Eloquent\Model;

class OutboxEvent extends Model
{
    protected $table = 'cityos_outbox';

    protected $fillable = [
        'event_id',
        'event_type',
        'tenant_id',
        'payload',
        'correlation_id',
        'node_context',
        'status',
        'retry_count',
        'max_retries',
        'error_message',
        'published_at',
        'next_retry_at',
    ];

    protected $casts = [
        'payload' => 'array',
        'node_context' => 'array',
        'published_at' => 'datetime',
        'next_retry_at' => 'datetime',
    ];

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isPublished(): bool
    {
        return $this->status === 'published';
    }

    public function isFailed(): bool
    {
        return $this->status === 'failed';
    }

    public function isDeadLetter(): bool
    {
        return $this->status === 'dead_letter';
    }

    public function markPublished(): void
    {
        $this->update([
            'status' => 'published',
            'published_at' => now(),
        ]);
    }

    public function markFailed(string $error): void
    {
        $retryCount = $this->retry_count + 1;
        $status = $retryCount >= $this->max_retries ? 'dead_letter' : 'failed';
        $nextRetry = $status === 'failed' ? now()->addSeconds(pow(2, $retryCount) * 10) : null;

        $this->update([
            'status' => $status,
            'retry_count' => $retryCount,
            'error_message' => $error,
            'next_retry_at' => $nextRetry,
        ]);
    }
}
