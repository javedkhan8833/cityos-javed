<?php

namespace Fleetbase\CityOS\Services;

use Fleetbase\CityOS\Models\IntegrationLog;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class WaltIdService
{
    protected string $baseUrl;
    protected string $apiKey;
    protected string $defaultDidMethod;
    protected array $supportedAlgorithms;

    public function __construct()
    {
        $this->baseUrl = config('waltid.base_url', env('WALTID_BASE_URL', ''));
        $this->apiKey = config('waltid.api_key', env('WALTID_API_KEY', ''));
        $this->defaultDidMethod = config('waltid.default_did_method', 'key');
        $this->supportedAlgorithms = config('waltid.supported_algorithms', ['Ed25519', 'Secp256k1', 'Secp256r1', 'RSA']);
    }

    public function isConfigured(): bool
    {
        return !empty($this->baseUrl);
    }

    protected function headers(): array
    {
        $headers = [
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        ];

        if (!empty($this->apiKey)) {
            $headers['Authorization'] = 'Bearer ' . $this->apiKey;
        }

        return $headers;
    }

    public function createDid(string $method = null, array $options = []): array
    {
        $correlationId = (string) Str::uuid();
        $method = $method ?? $this->defaultDidMethod;

        if (!$this->isConfigured()) {
            $mockDid = 'did:' . $method . ':' . Str::random(32);
            $result = [
                'success' => true,
                'mode' => 'stub',
                'did' => $mockDid,
                'method' => $method,
                'created_at' => now()->toIso8601String(),
                'correlation_id' => $correlationId,
                'message' => 'DID created in stub mode (walt.id not configured)',
            ];

            IntegrationLog::logRequest('waltid', 'create_did', [
                'correlation_id' => $correlationId,
                'request_data' => ['method' => $method, 'options' => $options],
                'response_data' => $result,
                'status' => 'stub',
            ]);

            return $result;
        }

        try {
            $response = Http::withHeaders($this->headers())
                ->timeout(30)
                ->post("{$this->baseUrl}/v1/did/create", [
                    'method' => $method,
                    'options' => $options,
                ]);

            $result = [
                'success' => $response->successful(),
                'mode' => 'live',
                'data' => $response->json(),
                'correlation_id' => $correlationId,
            ];

            IntegrationLog::logRequest('waltid', 'create_did', [
                'correlation_id' => $correlationId,
                'request_data' => ['method' => $method, 'options' => $options],
                'response_data' => $result,
                'response_code' => $response->status(),
                'status' => $response->successful() ? 'success' : 'error',
            ]);

            return $result;
        } catch (\Exception $e) {
            IntegrationLog::logRequest('waltid', 'create_did', [
                'correlation_id' => $correlationId,
                'request_data' => ['method' => $method, 'options' => $options],
                'error_message' => $e->getMessage(),
                'status' => 'error',
            ]);

            return ['success' => false, 'error' => $e->getMessage(), 'correlation_id' => $correlationId];
        }
    }

    public function resolveDid(string $did): array
    {
        $correlationId = (string) Str::uuid();

        if (!$this->isConfigured()) {
            $result = [
                'success' => true,
                'mode' => 'stub',
                'did' => $did,
                'document' => [
                    '@context' => ['https://www.w3.org/ns/did/v1'],
                    'id' => $did,
                    'verificationMethod' => [
                        [
                            'id' => $did . '#key-1',
                            'type' => 'JsonWebKey2020',
                            'controller' => $did,
                        ],
                    ],
                    'authentication' => [$did . '#key-1'],
                    'assertionMethod' => [$did . '#key-1'],
                ],
                'correlation_id' => $correlationId,
                'message' => 'DID resolved in stub mode (walt.id not configured)',
            ];

            IntegrationLog::logRequest('waltid', 'resolve_did', [
                'correlation_id' => $correlationId,
                'request_data' => ['did' => $did],
                'response_data' => $result,
                'status' => 'stub',
            ]);

            return $result;
        }

        try {
            $response = Http::withHeaders($this->headers())
                ->timeout(30)
                ->post("{$this->baseUrl}/v1/did/resolve", [
                    'did' => $did,
                ]);

            $result = [
                'success' => $response->successful(),
                'mode' => 'live',
                'did' => $did,
                'document' => $response->json(),
                'correlation_id' => $correlationId,
            ];

            IntegrationLog::logRequest('waltid', 'resolve_did', [
                'correlation_id' => $correlationId,
                'request_data' => ['did' => $did],
                'response_data' => $result,
                'response_code' => $response->status(),
                'status' => $response->successful() ? 'success' : 'error',
            ]);

            return $result;
        } catch (\Exception $e) {
            IntegrationLog::logRequest('waltid', 'resolve_did', [
                'correlation_id' => $correlationId,
                'request_data' => ['did' => $did],
                'error_message' => $e->getMessage(),
                'status' => 'error',
            ]);

            return ['success' => false, 'error' => $e->getMessage(), 'correlation_id' => $correlationId];
        }
    }

    public function listDids(): array
    {
        $correlationId = (string) Str::uuid();

        if (!$this->isConfigured()) {
            $result = [
                'success' => true,
                'mode' => 'stub',
                'dids' => [
                    ['did' => 'did:key:stub-' . Str::random(16), 'method' => 'key', 'created_at' => now()->subDays(5)->toIso8601String()],
                    ['did' => 'did:web:stub-' . Str::random(16), 'method' => 'web', 'created_at' => now()->subDays(2)->toIso8601String()],
                ],
                'correlation_id' => $correlationId,
                'message' => 'DIDs listed in stub mode (walt.id not configured)',
            ];

            IntegrationLog::logRequest('waltid', 'list_dids', [
                'correlation_id' => $correlationId,
                'response_data' => $result,
                'status' => 'stub',
            ]);

            return $result;
        }

        try {
            $response = Http::withHeaders($this->headers())
                ->timeout(30)
                ->get("{$this->baseUrl}/v1/did/list");

            $result = [
                'success' => $response->successful(),
                'mode' => 'live',
                'dids' => $response->json(),
                'correlation_id' => $correlationId,
            ];

            IntegrationLog::logRequest('waltid', 'list_dids', [
                'correlation_id' => $correlationId,
                'response_data' => $result,
                'response_code' => $response->status(),
                'status' => $response->successful() ? 'success' : 'error',
            ]);

            return $result;
        } catch (\Exception $e) {
            IntegrationLog::logRequest('waltid', 'list_dids', [
                'correlation_id' => $correlationId,
                'error_message' => $e->getMessage(),
                'status' => 'error',
            ]);

            return ['success' => false, 'error' => $e->getMessage(), 'correlation_id' => $correlationId];
        }
    }

    public function deactivateDid(string $did): array
    {
        $correlationId = (string) Str::uuid();

        if (!$this->isConfigured()) {
            $result = [
                'success' => true,
                'mode' => 'stub',
                'did' => $did,
                'deactivated' => true,
                'deactivated_at' => now()->toIso8601String(),
                'correlation_id' => $correlationId,
                'message' => 'DID deactivated in stub mode (walt.id not configured)',
            ];

            IntegrationLog::logRequest('waltid', 'deactivate_did', [
                'correlation_id' => $correlationId,
                'request_data' => ['did' => $did],
                'response_data' => $result,
                'status' => 'stub',
            ]);

            return $result;
        }

        try {
            $response = Http::withHeaders($this->headers())
                ->timeout(30)
                ->delete("{$this->baseUrl}/v1/did/{$did}");

            $result = [
                'success' => $response->successful(),
                'mode' => 'live',
                'did' => $did,
                'deactivated' => $response->successful(),
                'correlation_id' => $correlationId,
            ];

            IntegrationLog::logRequest('waltid', 'deactivate_did', [
                'correlation_id' => $correlationId,
                'request_data' => ['did' => $did],
                'response_data' => $result,
                'response_code' => $response->status(),
                'status' => $response->successful() ? 'success' : 'error',
            ]);

            return $result;
        } catch (\Exception $e) {
            IntegrationLog::logRequest('waltid', 'deactivate_did', [
                'correlation_id' => $correlationId,
                'request_data' => ['did' => $did],
                'error_message' => $e->getMessage(),
                'status' => 'error',
            ]);

            return ['success' => false, 'error' => $e->getMessage(), 'correlation_id' => $correlationId];
        }
    }

    public function issueCredential(string $issuerDid, string $subjectDid, string $credentialType, array $claims): array
    {
        $correlationId = (string) Str::uuid();

        if (!$this->isConfigured()) {
            $result = [
                'success' => true,
                'mode' => 'stub',
                'credential' => [
                    '@context' => ['https://www.w3.org/2018/credentials/v1'],
                    'type' => ['VerifiableCredential', $credentialType],
                    'issuer' => $issuerDid,
                    'issuanceDate' => now()->toIso8601String(),
                    'credentialSubject' => array_merge(['id' => $subjectDid], $claims),
                    'proof' => [
                        'type' => 'JsonWebSignature2020',
                        'created' => now()->toIso8601String(),
                        'verificationMethod' => $issuerDid . '#key-1',
                        'jws' => 'stub-signature-' . Str::random(32),
                    ],
                ],
                'correlation_id' => $correlationId,
                'message' => 'Credential issued in stub mode (walt.id not configured)',
            ];

            IntegrationLog::logRequest('waltid', 'issue_credential', [
                'correlation_id' => $correlationId,
                'request_data' => ['issuer_did' => $issuerDid, 'subject_did' => $subjectDid, 'type' => $credentialType],
                'response_data' => $result,
                'status' => 'stub',
            ]);

            return $result;
        }

        try {
            $response = Http::withHeaders($this->headers())
                ->timeout(30)
                ->post("{$this->baseUrl}/v1/credentials/issue", [
                    'issuerDid' => $issuerDid,
                    'subjectDid' => $subjectDid,
                    'credentialType' => $credentialType,
                    'claims' => $claims,
                ]);

            $result = [
                'success' => $response->successful(),
                'mode' => 'live',
                'credential' => $response->json(),
                'correlation_id' => $correlationId,
            ];

            IntegrationLog::logRequest('waltid', 'issue_credential', [
                'correlation_id' => $correlationId,
                'request_data' => ['issuer_did' => $issuerDid, 'subject_did' => $subjectDid, 'type' => $credentialType],
                'response_data' => $result,
                'response_code' => $response->status(),
                'status' => $response->successful() ? 'success' : 'error',
            ]);

            return $result;
        } catch (\Exception $e) {
            IntegrationLog::logRequest('waltid', 'issue_credential', [
                'correlation_id' => $correlationId,
                'request_data' => ['issuer_did' => $issuerDid, 'subject_did' => $subjectDid, 'type' => $credentialType],
                'error_message' => $e->getMessage(),
                'status' => 'error',
            ]);

            return ['success' => false, 'error' => $e->getMessage(), 'correlation_id' => $correlationId];
        }
    }

    public function issueVerifiablePresentation(string $holderDid, array $credentials): array
    {
        $correlationId = (string) Str::uuid();

        if (!$this->isConfigured()) {
            $result = [
                'success' => true,
                'mode' => 'stub',
                'presentation' => [
                    '@context' => ['https://www.w3.org/2018/credentials/v1'],
                    'type' => ['VerifiablePresentation'],
                    'holder' => $holderDid,
                    'verifiableCredential' => $credentials,
                    'proof' => [
                        'type' => 'JsonWebSignature2020',
                        'created' => now()->toIso8601String(),
                        'verificationMethod' => $holderDid . '#key-1',
                        'jws' => 'stub-presentation-sig-' . Str::random(32),
                    ],
                ],
                'correlation_id' => $correlationId,
                'message' => 'Verifiable presentation created in stub mode (walt.id not configured)',
            ];

            IntegrationLog::logRequest('waltid', 'issue_presentation', [
                'correlation_id' => $correlationId,
                'request_data' => ['holder_did' => $holderDid, 'credential_count' => count($credentials)],
                'response_data' => $result,
                'status' => 'stub',
            ]);

            return $result;
        }

        try {
            $response = Http::withHeaders($this->headers())
                ->timeout(30)
                ->post("{$this->baseUrl}/v1/presentations/create", [
                    'holderDid' => $holderDid,
                    'credentials' => $credentials,
                ]);

            $result = [
                'success' => $response->successful(),
                'mode' => 'live',
                'presentation' => $response->json(),
                'correlation_id' => $correlationId,
            ];

            IntegrationLog::logRequest('waltid', 'issue_presentation', [
                'correlation_id' => $correlationId,
                'request_data' => ['holder_did' => $holderDid, 'credential_count' => count($credentials)],
                'response_data' => $result,
                'response_code' => $response->status(),
                'status' => $response->successful() ? 'success' : 'error',
            ]);

            return $result;
        } catch (\Exception $e) {
            IntegrationLog::logRequest('waltid', 'issue_presentation', [
                'correlation_id' => $correlationId,
                'request_data' => ['holder_did' => $holderDid],
                'error_message' => $e->getMessage(),
                'status' => 'error',
            ]);

            return ['success' => false, 'error' => $e->getMessage(), 'correlation_id' => $correlationId];
        }
    }

    public function verifyCredential(array $credential): array
    {
        $correlationId = (string) Str::uuid();

        if (!$this->isConfigured()) {
            $result = [
                'success' => true,
                'mode' => 'stub',
                'verified' => true,
                'checks' => [
                    'signature' => true,
                    'expiration' => true,
                    'not_before' => true,
                    'issuer_did_resolvable' => true,
                    'subject_did_resolvable' => true,
                    'schema_valid' => true,
                ],
                'credential_type' => $credential['type'] ?? ['VerifiableCredential'],
                'issuer' => $credential['issuer'] ?? 'unknown',
                'correlation_id' => $correlationId,
                'message' => 'Credential verified in stub mode (walt.id not configured)',
            ];

            IntegrationLog::logRequest('waltid', 'verify_credential', [
                'correlation_id' => $correlationId,
                'request_data' => ['credential_type' => $credential['type'] ?? 'unknown'],
                'response_data' => $result,
                'status' => 'stub',
            ]);

            return $result;
        }

        try {
            $response = Http::withHeaders($this->headers())
                ->timeout(30)
                ->post("{$this->baseUrl}/v1/credentials/verify", [
                    'credential' => $credential,
                ]);

            $result = [
                'success' => $response->successful(),
                'mode' => 'live',
                'verification' => $response->json(),
                'correlation_id' => $correlationId,
            ];

            IntegrationLog::logRequest('waltid', 'verify_credential', [
                'correlation_id' => $correlationId,
                'request_data' => ['credential_type' => $credential['type'] ?? 'unknown'],
                'response_data' => $result,
                'response_code' => $response->status(),
                'status' => $response->successful() ? 'success' : 'error',
            ]);

            return $result;
        } catch (\Exception $e) {
            IntegrationLog::logRequest('waltid', 'verify_credential', [
                'correlation_id' => $correlationId,
                'error_message' => $e->getMessage(),
                'status' => 'error',
            ]);

            return ['success' => false, 'error' => $e->getMessage(), 'correlation_id' => $correlationId];
        }
    }

    public function verifyPresentation(array $presentation): array
    {
        $correlationId = (string) Str::uuid();

        if (!$this->isConfigured()) {
            $result = [
                'success' => true,
                'mode' => 'stub',
                'verified' => true,
                'checks' => [
                    'presentation_signature' => true,
                    'credentials_valid' => true,
                    'holder_binding' => true,
                ],
                'holder' => $presentation['holder'] ?? 'unknown',
                'credential_count' => count($presentation['verifiableCredential'] ?? []),
                'correlation_id' => $correlationId,
                'message' => 'Presentation verified in stub mode (walt.id not configured)',
            ];

            IntegrationLog::logRequest('waltid', 'verify_presentation', [
                'correlation_id' => $correlationId,
                'request_data' => ['holder' => $presentation['holder'] ?? 'unknown'],
                'response_data' => $result,
                'status' => 'stub',
            ]);

            return $result;
        }

        try {
            $response = Http::withHeaders($this->headers())
                ->timeout(30)
                ->post("{$this->baseUrl}/v1/presentations/verify", [
                    'presentation' => $presentation,
                ]);

            $result = [
                'success' => $response->successful(),
                'mode' => 'live',
                'verification' => $response->json(),
                'correlation_id' => $correlationId,
            ];

            IntegrationLog::logRequest('waltid', 'verify_presentation', [
                'correlation_id' => $correlationId,
                'request_data' => ['holder' => $presentation['holder'] ?? 'unknown'],
                'response_data' => $result,
                'response_code' => $response->status(),
                'status' => $response->successful() ? 'success' : 'error',
            ]);

            return $result;
        } catch (\Exception $e) {
            IntegrationLog::logRequest('waltid', 'verify_presentation', [
                'correlation_id' => $correlationId,
                'error_message' => $e->getMessage(),
                'status' => 'error',
            ]);

            return ['success' => false, 'error' => $e->getMessage(), 'correlation_id' => $correlationId];
        }
    }

    public function listCredentialTemplates(): array
    {
        $correlationId = (string) Str::uuid();

        if (!$this->isConfigured()) {
            $templates = config('waltid.credential_templates', [
                ['id' => 'VerifiableId', 'name' => 'Verifiable ID', 'description' => 'Government-issued verifiable identity credential'],
                ['id' => 'VerifiableDiploma', 'name' => 'Verifiable Diploma', 'description' => 'Educational diploma credential'],
                ['id' => 'ProofOfResidence', 'name' => 'Proof of Residence', 'description' => 'Proof of residence credential'],
                ['id' => 'DriverLicense', 'name' => 'Driver License', 'description' => 'Driver license verifiable credential'],
                ['id' => 'FleetOperatorLicense', 'name' => 'Fleet Operator License', 'description' => 'Fleet operator certification credential'],
            ]);

            $result = [
                'success' => true,
                'mode' => 'stub',
                'templates' => $templates,
                'correlation_id' => $correlationId,
                'message' => 'Templates listed in stub mode (walt.id not configured)',
            ];

            IntegrationLog::logRequest('waltid', 'list_templates', [
                'correlation_id' => $correlationId,
                'response_data' => $result,
                'status' => 'stub',
            ]);

            return $result;
        }

        try {
            $response = Http::withHeaders($this->headers())
                ->timeout(30)
                ->get("{$this->baseUrl}/v1/templates");

            $result = [
                'success' => $response->successful(),
                'mode' => 'live',
                'templates' => $response->json(),
                'correlation_id' => $correlationId,
            ];

            IntegrationLog::logRequest('waltid', 'list_templates', [
                'correlation_id' => $correlationId,
                'response_data' => $result,
                'response_code' => $response->status(),
                'status' => $response->successful() ? 'success' : 'error',
            ]);

            return $result;
        } catch (\Exception $e) {
            IntegrationLog::logRequest('waltid', 'list_templates', [
                'correlation_id' => $correlationId,
                'error_message' => $e->getMessage(),
                'status' => 'error',
            ]);

            return ['success' => false, 'error' => $e->getMessage(), 'correlation_id' => $correlationId];
        }
    }

    public function getCredentialTemplate(string $id): array
    {
        $correlationId = (string) Str::uuid();

        if (!$this->isConfigured()) {
            $result = [
                'success' => true,
                'mode' => 'stub',
                'template' => [
                    'id' => $id,
                    'name' => $id,
                    'schema' => [
                        'type' => 'object',
                        'properties' => [
                            'credentialSubject' => [
                                'type' => 'object',
                                'properties' => [
                                    'id' => ['type' => 'string'],
                                    'name' => ['type' => 'string'],
                                ],
                            ],
                        ],
                    ],
                ],
                'correlation_id' => $correlationId,
                'message' => 'Template retrieved in stub mode (walt.id not configured)',
            ];

            IntegrationLog::logRequest('waltid', 'get_template', [
                'correlation_id' => $correlationId,
                'request_data' => ['template_id' => $id],
                'response_data' => $result,
                'status' => 'stub',
            ]);

            return $result;
        }

        try {
            $response = Http::withHeaders($this->headers())
                ->timeout(30)
                ->get("{$this->baseUrl}/v1/templates/{$id}");

            $result = [
                'success' => $response->successful(),
                'mode' => 'live',
                'template' => $response->json(),
                'correlation_id' => $correlationId,
            ];

            IntegrationLog::logRequest('waltid', 'get_template', [
                'correlation_id' => $correlationId,
                'request_data' => ['template_id' => $id],
                'response_data' => $result,
                'response_code' => $response->status(),
                'status' => $response->successful() ? 'success' : 'error',
            ]);

            return $result;
        } catch (\Exception $e) {
            IntegrationLog::logRequest('waltid', 'get_template', [
                'correlation_id' => $correlationId,
                'request_data' => ['template_id' => $id],
                'error_message' => $e->getMessage(),
                'status' => 'error',
            ]);

            return ['success' => false, 'error' => $e->getMessage(), 'correlation_id' => $correlationId];
        }
    }

    public function generateKey(string $algorithm = 'Ed25519'): array
    {
        $correlationId = (string) Str::uuid();

        if (!in_array($algorithm, $this->supportedAlgorithms)) {
            return [
                'success' => false,
                'error' => "Unsupported algorithm: {$algorithm}. Supported: " . implode(', ', $this->supportedAlgorithms),
                'correlation_id' => $correlationId,
            ];
        }

        if (!$this->isConfigured()) {
            $keyId = 'key-' . Str::random(24);
            $result = [
                'success' => true,
                'mode' => 'stub',
                'key' => [
                    'id' => $keyId,
                    'algorithm' => $algorithm,
                    'type' => 'asymmetric',
                    'created_at' => now()->toIso8601String(),
                    'public_key' => base64_encode(Str::random(32)),
                ],
                'correlation_id' => $correlationId,
                'message' => 'Key generated in stub mode (walt.id not configured)',
            ];

            IntegrationLog::logRequest('waltid', 'generate_key', [
                'correlation_id' => $correlationId,
                'request_data' => ['algorithm' => $algorithm],
                'response_data' => $result,
                'status' => 'stub',
            ]);

            return $result;
        }

        try {
            $response = Http::withHeaders($this->headers())
                ->timeout(30)
                ->post("{$this->baseUrl}/v1/keys/generate", [
                    'algorithm' => $algorithm,
                ]);

            $result = [
                'success' => $response->successful(),
                'mode' => 'live',
                'key' => $response->json(),
                'correlation_id' => $correlationId,
            ];

            IntegrationLog::logRequest('waltid', 'generate_key', [
                'correlation_id' => $correlationId,
                'request_data' => ['algorithm' => $algorithm],
                'response_data' => $result,
                'response_code' => $response->status(),
                'status' => $response->successful() ? 'success' : 'error',
            ]);

            return $result;
        } catch (\Exception $e) {
            IntegrationLog::logRequest('waltid', 'generate_key', [
                'correlation_id' => $correlationId,
                'request_data' => ['algorithm' => $algorithm],
                'error_message' => $e->getMessage(),
                'status' => 'error',
            ]);

            return ['success' => false, 'error' => $e->getMessage(), 'correlation_id' => $correlationId];
        }
    }

    public function importKey(array $keyData): array
    {
        $correlationId = (string) Str::uuid();

        if (!$this->isConfigured()) {
            $keyId = 'imported-key-' . Str::random(16);
            $result = [
                'success' => true,
                'mode' => 'stub',
                'key' => [
                    'id' => $keyId,
                    'imported' => true,
                    'algorithm' => $keyData['algorithm'] ?? 'unknown',
                    'created_at' => now()->toIso8601String(),
                ],
                'correlation_id' => $correlationId,
                'message' => 'Key imported in stub mode (walt.id not configured)',
            ];

            IntegrationLog::logRequest('waltid', 'import_key', [
                'correlation_id' => $correlationId,
                'request_data' => ['algorithm' => $keyData['algorithm'] ?? 'unknown'],
                'response_data' => $result,
                'status' => 'stub',
            ]);

            return $result;
        }

        try {
            $response = Http::withHeaders($this->headers())
                ->timeout(30)
                ->post("{$this->baseUrl}/v1/keys/import", $keyData);

            $result = [
                'success' => $response->successful(),
                'mode' => 'live',
                'key' => $response->json(),
                'correlation_id' => $correlationId,
            ];

            IntegrationLog::logRequest('waltid', 'import_key', [
                'correlation_id' => $correlationId,
                'request_data' => ['algorithm' => $keyData['algorithm'] ?? 'unknown'],
                'response_data' => $result,
                'response_code' => $response->status(),
                'status' => $response->successful() ? 'success' : 'error',
            ]);

            return $result;
        } catch (\Exception $e) {
            IntegrationLog::logRequest('waltid', 'import_key', [
                'correlation_id' => $correlationId,
                'error_message' => $e->getMessage(),
                'status' => 'error',
            ]);

            return ['success' => false, 'error' => $e->getMessage(), 'correlation_id' => $correlationId];
        }
    }

    public function exportKey(string $keyId): array
    {
        $correlationId = (string) Str::uuid();

        if (!$this->isConfigured()) {
            $result = [
                'success' => true,
                'mode' => 'stub',
                'key' => [
                    'id' => $keyId,
                    'algorithm' => 'Ed25519',
                    'public_key' => base64_encode(Str::random(32)),
                    'exported_at' => now()->toIso8601String(),
                ],
                'correlation_id' => $correlationId,
                'message' => 'Key exported in stub mode (walt.id not configured)',
            ];

            IntegrationLog::logRequest('waltid', 'export_key', [
                'correlation_id' => $correlationId,
                'request_data' => ['key_id' => $keyId],
                'response_data' => $result,
                'status' => 'stub',
            ]);

            return $result;
        }

        try {
            $response = Http::withHeaders($this->headers())
                ->timeout(30)
                ->get("{$this->baseUrl}/v1/keys/{$keyId}/export");

            $result = [
                'success' => $response->successful(),
                'mode' => 'live',
                'key' => $response->json(),
                'correlation_id' => $correlationId,
            ];

            IntegrationLog::logRequest('waltid', 'export_key', [
                'correlation_id' => $correlationId,
                'request_data' => ['key_id' => $keyId],
                'response_data' => $result,
                'response_code' => $response->status(),
                'status' => $response->successful() ? 'success' : 'error',
            ]);

            return $result;
        } catch (\Exception $e) {
            IntegrationLog::logRequest('waltid', 'export_key', [
                'correlation_id' => $correlationId,
                'request_data' => ['key_id' => $keyId],
                'error_message' => $e->getMessage(),
                'status' => 'error',
            ]);

            return ['success' => false, 'error' => $e->getMessage(), 'correlation_id' => $correlationId];
        }
    }

    public function getStatus(): array
    {
        return [
            'integration' => 'waltid',
            'configured' => $this->isConfigured(),
            'mode' => $this->isConfigured() ? 'live' : 'stub',
            'base_url' => $this->isConfigured() ? $this->baseUrl : null,
            'default_did_method' => $this->defaultDidMethod,
            'supported_algorithms' => $this->supportedAlgorithms,
            'capabilities' => [
                'did_management' => ['create', 'resolve', 'list', 'deactivate'],
                'credential_issuance' => ['issue_credential', 'issue_presentation'],
                'credential_verification' => ['verify_credential', 'verify_presentation'],
                'credential_templates' => ['list', 'get'],
                'key_management' => ['generate', 'import', 'export'],
            ],
        ];
    }
}
