<?php

return [
    'base_url' => env('ERPNEXT_BASE_URL', ''),
    'api_key' => env('ERPNEXT_API_KEY', ''),
    'api_secret' => env('ERPNEXT_API_SECRET', ''),
    'default_company' => env('ERPNEXT_DEFAULT_COMPANY', 'CityOS'),
    'default_currency' => env('ERPNEXT_DEFAULT_CURRENCY', 'SAR'),
    'settlement_doctype' => env('ERPNEXT_SETTLEMENT_DOCTYPE', 'Settlement'),
    'payout_doctype' => env('ERPNEXT_PAYOUT_DOCTYPE', 'Payout'),
    'cod' => [
        'auto_reconcile' => env('ERPNEXT_COD_AUTO_RECONCILE', false),
        'reconcile_threshold_hours' => env('ERPNEXT_COD_RECONCILE_THRESHOLD_HOURS', 24),
        'collection_doctype' => env('ERPNEXT_COD_COLLECTION_DOCTYPE', 'COD Collection'),
    ],
    'penalties' => [
        'penalty_doctype' => env('ERPNEXT_PENALTY_DOCTYPE', 'Penalty'),
        'auto_apply' => env('ERPNEXT_PENALTY_AUTO_APPLY', false),
    ],
    'payouts' => [
        'default_period' => env('ERPNEXT_PAYOUT_DEFAULT_PERIOD', 'weekly'),
        'approval_required' => env('ERPNEXT_PAYOUT_APPROVAL_REQUIRED', true),
    ],
];
