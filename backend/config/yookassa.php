<?php

return [
    'shop_id' => env('YOOKASSA_SHOP_ID'),
    'secret_key' => env('YOOKASSA_SECRET_KEY'),
    'currency' => env('YOOKASSA_CURRENCY', 'RUB'),
    'capture' => env('YOOKASSA_CAPTURE', true),
];
