<?php

namespace Fleetbase\CityOS\Models;

use Illuminate\Database\Eloquent\Model;

class IntegrationLog extends Model
{
    protected $table = 'cityos_integration_logs';

    protected $fillable = [
        'integration',
        'operation',
        'direction',
        'status',
        'correlation_id',
        'request_data',
        'response_data',
        'error_message',
        'response_code',
        'duration_ms',
    ];

    protected $casts = [
        'request_data' => 'array',
        'response_data' => 'array',
    ];

    public static function logRequest(string $integration, string $operation, array $data = []): self
    {
        return static::create(array_merge([
            'integration' => $integration,
            'operation' => $operation,
            'direction' => 'outbound',
            'status' => 'success',
            'correlation_id' => $data['correlation_id'] ?? (string) \Illuminate\Support\Str::uuid(),
        ], $data));
    }
}
