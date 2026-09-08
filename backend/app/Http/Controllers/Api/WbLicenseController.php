<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WbLicense;
use App\Services\YookassaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class WbLicenseController extends Controller
{
    public function __construct(protected YookassaService $yookassaService) {}

    public function create(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'nullable|email|max:255',
            'amount' => 'nullable|numeric|min:1|max:10000',
        ]);

        $amount = $validated['amount'] ?? 590;
        $licenseKey = 'WB-' . strtoupper(Str::random(12));

        try {
            $payment = $this->yookassaService->createPayment(
                (float) $amount,
                'WB Analyzer PRO',
                $licenseKey
            );

            WbLicense::create([
                'license_key' => $licenseKey,
                'payment_id' => $payment['id'],
                'email' => $validated['email'] ?? null,
                'amount' => $amount,
                'status' => $payment['status'],
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'license_key' => $licenseKey,
                    'payment_id' => $payment['id'],
                    'confirmation_url' => $payment['confirmation_url'],
                    'amount' => $payment['amount'],
                ],
            ], 201);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    public function check(Request $request): JsonResponse
    {
        $validated = $request->validate(['license_key' => 'required|string']);

        $license = WbLicense::where('license_key', $validated['license_key'])->first();

        if (!$license) {
            return response()->json(['success' => false, 'error' => 'License not found'], 404);
        }

        if ($license->status !== 'succeeded' && $license->payment_id) {
            try {
                $payment = $this->yookassaService->getPayment($license->payment_id);
                if ($payment && $payment['status'] === 'succeeded') {
                    $license->update(['status' => 'succeeded', 'paid_at' => now()]);
                } elseif ($payment) {
                    $license->update(['status' => $payment['status']]);
                }
            } catch (\Exception $e) {}
        }

        return response()->json([
            'success' => true,
            'data' => [
                'license_key' => $license->license_key,
                'status' => $license->status,
                'is_valid' => $license->status === 'succeeded',
                'paid_at' => $license->paid_at,
            ],
        ]);
    }

    public function webhook(Request $request): JsonResponse
    {
        $payload = $request->all();
        if (empty($payload['type']) || empty($payload['object'])) {
            return response()->json(['success' => false], 400);
        }

        try {
            $object = $payload['object'];
            $paymentId = $object['id'] ?? null;
            $licenseKey = $object['metadata']['order_id'] ?? null;

            if ($paymentId && $licenseKey) {
                $license = WbLicense::where('license_key', $licenseKey)->orWhere('payment_id', $paymentId)->first();
                if ($license) {
                    if ($payload['type'] === 'payment.succeeded') {
                        $license->update(['status' => 'succeeded', 'paid_at' => now(), 'payment_id' => $paymentId]);
                    } elseif ($payload['type'] === 'payment.canceled') {
                        $license->update(['status' => 'canceled']);
                    }
                }
            }
            return response()->json(['success' => true]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }
}
