<?php

namespace App\Services;

use YooKassa\Model\PaymentMethodType;
use YooKassa\Model\PaymentStatus;
use YooKassa\Request\Payments\CreatePaymentRequest;
use YooKassa\Request\Payments\Payment\CreatePaymentRequestBuilder;
use YooKassa\Request\Payments\ConfirmationAttributes\ConfirmationAttributesRedirect;
use YooKassa\Client;

class YookassaService
{
    protected ?Client $client = null;
    protected bool $isConfigured = false;

    public function __construct()
    {
        $shopId = config('yookassa.shop_id');
        $secretKey = config('yookassa.secret_key');

        if ($shopId && $secretKey && $shopId !== 'your_shop_id' && $secretKey !== 'your_secret_key' && is_numeric($shopId)) {
            $this->client = new Client();
            $this->client->setAuth((int) $shopId, $secretKey);
            $this->isConfigured = true;
        }
    }

    public function isConfigured(): bool
    {
        return $this->isConfigured;
    }

    public function createPayment(float $amount, string $description, ?string $metadata = null): array
    {
        if (!$this->isConfigured || !$this->client) {
            throw new \RuntimeException('YooKassa not configured - set YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY in .env');
        }

        $builder = CreatePaymentRequest::builder()
            ->setAmount([
                'value' => $amount,
                'currency' => config('yookassa.currency', 'RUB'),
            ])
            ->setCapture(config('yookassa.capture', true))
            ->setDescription($description);

        if ($metadata) {
            $builder->setMetadata(['order_id' => $metadata]);
        }

        $confirmation = new ConfirmationAttributesRedirect();
        $confirmation->setReturnUrl(config('app.url', 'https://wb-analazuer.ru'));
        $builder->setConfirmation($confirmation);

        $request = $builder->build();

        $response = $this->client->createPayment($request, uniqid('', true));

        return [
            'id' => $response->getId(),
            'status' => $response->getStatus(),
            'confirmation_url' => $response->getConfirmation()?->getConfirmationUrl(),
            'amount' => $response->getAmount()->getValue(),
        ];
    }

    public function getPayment(string $paymentId): ?array
    {
        if (!$this->isConfigured || !$this->client) {
            return null;
        }
        $payment = $this->client->getPaymentInfo($paymentId);

        if (!$payment) {
            return null;
        }

        return [
            'id' => $payment->getId(),
            'status' => $payment->getStatus(),
            'amount' => $payment->getAmount()->getValue(),
            'description' => $payment->getDescription(),
            'metadata' => $payment->getMetadata()?->toArray(),
        ];
    }

    public function checkPaymentStatus(string $paymentId): ?string
    {
        if (!$this->isConfigured || !$this->client) {
            return null;
        }
        $payment = $this->client->getPaymentInfo($paymentId);
        return $payment?->getStatus();
    }

    public function isPaymentSucceeded(string $paymentId): bool
    {
        return $this->checkPaymentStatus($paymentId) === PaymentStatus::SUCCEEDED;
    }

    public function getAvailablePaymentMethods(): array
    {
        return [
            PaymentMethodType::BANK_CARD,
            PaymentMethodType::SBP,
            PaymentMethodType::YOO_MONEY,
            PaymentMethodType::SBERBANK,
            PaymentMethodType::TINKOFF_BANK,
        ];
    }
}
