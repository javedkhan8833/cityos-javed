<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    $cred = \Fleetbase\Models\ApiCredential::where('key', 'flb_live_2hYe5d9YsAMZFbJykakI')->with(['company.owner'])->first();
    if ($cred) {
        echo "Cred ID: " . $cred->uuid . "\n";
        echo "Company UUID: " . ($cred->company_uuid ?: 'NULL') . "\n";
        if ($cred->company) {
            echo "Company Name: " . $cred->company->name . "\n";
            echo "Owner UUID: " . ($cred->company->owner_uuid ?: 'NULL') . "\n";
            if ($cred->company->owner) {
                echo "Owner: " . $cred->company->owner->name . " (" . $cred->company->owner->email . ")\n";
            } else {
                echo "Owner relationship is NULL or missing!\n";
            }
        } else {
            echo "Company relationship is NULL!\n";
        }
    } else {
        echo "API key flb_live_2hYe5d9YsAMZFbJykakI not found in database.\n";
    }
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
