<?php
$company = DB::table('companies')->where('name', 'Dakkah Systems')->first();
$user = DB::table('users')->where('email', 'admin@dakkah.io')->first();
$sqids = new \Sqids\Sqids();
$key = 'flb_live_' . $sqids->encode([1, 2, 3, 4]);
\Fleetbase\Models\ApiCredential::create([
    'name' => 'Default',
    'company_uuid' => $company->uuid,
    'user_uuid' => $user->uuid,
    'key' => $key,
    'secret' => 'default_secret',
    'test_mode' => false
]);
echo "Created Key: " . $key . "\n";
