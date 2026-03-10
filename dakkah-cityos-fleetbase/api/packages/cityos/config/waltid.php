<?php

return [
    'base_url' => env('WALTID_BASE_URL', ''),
    'api_key' => env('WALTID_API_KEY', ''),
    'default_did_method' => env('WALTID_DEFAULT_DID_METHOD', 'key'),
    'supported_algorithms' => ['Ed25519', 'Secp256k1', 'Secp256r1', 'RSA'],
    'credential_templates' => [
        ['id' => 'VerifiableId', 'name' => 'Verifiable ID', 'description' => 'Government-issued verifiable identity credential'],
        ['id' => 'VerifiableDiploma', 'name' => 'Verifiable Diploma', 'description' => 'Educational diploma credential'],
        ['id' => 'ProofOfResidence', 'name' => 'Proof of Residence', 'description' => 'Proof of residence credential'],
        ['id' => 'DriverLicense', 'name' => 'Driver License', 'description' => 'Driver license verifiable credential'],
        ['id' => 'FleetOperatorLicense', 'name' => 'Fleet Operator License', 'description' => 'Fleet operator certification credential'],
    ],
];
