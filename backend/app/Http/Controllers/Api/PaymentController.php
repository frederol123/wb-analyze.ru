<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\YookassaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use YooKassa\Model\NotificationEventType;

class PaymentController extends Controller
{
    public function __construct(
        protected YookassaService $yookassaService
    ) {}

    public function create(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:1',
            'description' => 'required|string|max:128',
            'metadata' => 'nullable|string',
        ]);

        try {
            $payment = $this->yookassaService->createPayment(
                $validated['amount'],
                $validated['description'],
                $validated['metadata'] ?? null
            );

            return response()->json([
                'success' => true,
                'data' => $payment,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function show(string $paymentId): JsonResponse
    {
        $payment = $this->yookassaService->getPayment($paymentId);

        if (!$payment) {
            return response()->json([
                'success' => false,
                'error' => 'Payment not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $payment,
        ]);
    }

    public function status(string $paymentId): JsonResponse
    {
        $status = $this->yookassaService->checkPaymentStatus($paymentId);

        if (!$status) {
            return response()->json([
                'success' => false,
                'error' => 'Payment not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'payment_id' => $paymentId,
                'status' => $status,
            ],
        ]);
    }

    public function webhook(Request $request): JsonResponse
    {
        $payload = $request->all();
        $headers = $request->headers;

        if (empty($payload['type']) || empty($payload['object'])) {
            return response()->json(['success' => false], 400);
        }

        try {
            switch ($payload['type']) {
                case NotificationEventType::PAYMENT_SUCCEEDED:
                    $this->handlePaymentSucceeded($payload['object']);
                    break;

                case NotificationEventType::PAYMENT_WAITING_FOR_CAPTURE:
                    $this->handlePaymentWaitingForCapture($payload['object']);
                    break;

                case NotificationEventType::PAYMENT_CANCELED:
                    $this->handlePaymentCanceled($payload['object']);
                    break;

                case NotificationEventType::REFUND_SUCCEEDED:
                    $this->handleRefundSucceeded($payload['object']);
                    break;
            }

            return response()->json(['success' => true]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    protected function handlePaymentSucceeded(array $payment): void
    {
        $metadata = $payment['metadata'] ?? [];
        $orderId = $metadata['order_id'] ?? null;

        // Log::info('Payment succeeded', ['payment_id' => $payment['id'], 'order_id' => $orderId]);
    }

    protected function handlePaymentWaitingForCapture(array $payment): void
    {
        // Log::info('Payment waiting for capture', ['payment_id' => $payment['id']]);
    }

    protected function handlePaymentCanceled(array $payment): void
    {
        $metadata = $payment['metadata'] ?? [];
        $orderId = $metadata['order_id'] ?? null;

        // Log::info('Payment canceled', ['payment_id' => $payment['id'], 'order_id' => $orderId]);
    }

    protected function handleRefundSucceeded(array $refund): void
    {
        // Log::info('Refund succeeded', ['refund_id' => $refund['id']]);
    }
}
