<?php

namespace Fleetbase\CityOS\Http\Controllers;

use Fleetbase\CityOS\Services\WaltIdService;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class WaltIdController extends Controller
{
    protected WaltIdService $waltId;

    public function __construct(WaltIdService $waltId)
    {
        $this->waltId = $waltId;
    }

    public function listDids()
    {
        $result = $this->waltId->listDids();

        return response()->json($result);
    }

    public function createDid(Request $request)
    {
        $method = $request->input('method', null);
        $options = $request->input('options', []);

        $result = $this->waltId->createDid($method, $options);

        return response()->json($result, $result['success'] ? 201 : 500);
    }

    public function resolveDid(string $did)
    {
        $result = $this->waltId->resolveDid($did);

        return response()->json($result);
    }

    public function deactivateDid(string $did)
    {
        $result = $this->waltId->deactivateDid($did);

        return response()->json($result);
    }

    public function issueCredential(Request $request)
    {
        $request->validate([
            'issuer_did' => 'required|string',
            'subject_did' => 'required|string',
            'credential_type' => 'required|string',
            'claims' => 'required|array',
        ]);

        $result = $this->waltId->issueCredential(
            $request->input('issuer_did'),
            $request->input('subject_did'),
            $request->input('credential_type'),
            $request->input('claims')
        );

        return response()->json($result, $result['success'] ? 201 : 500);
    }

    public function verifyCredential(Request $request)
    {
        $request->validate([
            'credential' => 'required|array',
        ]);

        $result = $this->waltId->verifyCredential($request->input('credential'));

        return response()->json($result);
    }

    public function createPresentation(Request $request)
    {
        $request->validate([
            'holder_did' => 'required|string',
            'credentials' => 'required|array',
        ]);

        $result = $this->waltId->issueVerifiablePresentation(
            $request->input('holder_did'),
            $request->input('credentials')
        );

        return response()->json($result, $result['success'] ? 201 : 500);
    }

    public function verifyPresentation(Request $request)
    {
        $request->validate([
            'presentation' => 'required|array',
        ]);

        $result = $this->waltId->verifyPresentation($request->input('presentation'));

        return response()->json($result);
    }

    public function listTemplates()
    {
        $result = $this->waltId->listCredentialTemplates();

        return response()->json($result);
    }

    public function status()
    {
        $result = $this->waltId->getStatus();

        return response()->json($result);
    }

    public function generateKey(Request $request)
    {
        $algorithm = $request->input('algorithm', 'Ed25519');

        $result = $this->waltId->generateKey($algorithm);

        return response()->json($result, $result['success'] ? 201 : 400);
    }
}
