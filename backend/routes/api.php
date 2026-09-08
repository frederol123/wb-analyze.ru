<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\WbLicenseController;

// Payments (requires auth)
Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {
    Route::post('/payments', [PaymentController::class, 'create'])->name('payments.create');
    Route::get('/payments/{paymentId}', [PaymentController::class, 'show'])->name('payments.show');
    Route::get('/payments/{paymentId}/status', [PaymentController::class, 'status'])->name('payments.status');
});

// Webhook (no auth - Yookassa will send notifications)
Route::post('/payments/webhook', [PaymentController::class, 'webhook'])
    ->withoutMiddleware(['auth:sanctum'])
    ->name('payments.webhook');

// WB Analyzer — public (for Chrome Extension, self-employed)
Route::prefix('wb')->group(function () {
    Route::post('/licenses', [WbLicenseController::class, 'create'])->middleware('throttle:10,1')->name('wb.licenses.create');
    Route::post('/licenses/check', [WbLicenseController::class, 'check'])->middleware('throttle:30,1')->name('wb.licenses.check');
    Route::post('/licenses/webhook', [WbLicenseController::class, 'webhook'])->name('wb.licenses.webhook');
});

// V1
Route::prefix('v1')->middleware(['auth:sanctum', 'throttle:api'])->group(function () {
    Route::apiResource('notes', \App\Http\Controllers\Api\V1\NoteApiController::class)
        ->except(['store'])
        ->names('v1.notes');
    Route::post('/notes', [\App\Http\Controllers\Api\V1\NoteApiController::class, 'store'])
        ->middleware('throttle:note-creation')
        ->name('v1.notes.store');

    Route::post('/pubsub/publish', [\App\Http\Controllers\Api\V1\RedisPubSubController::class, 'publish'])
        ->name('v1.pubsub.publish');
    Route::get('/pubsub/channels', [\App\Http\Controllers\Api\V1\RedisPubSubController::class, 'channels'])
        ->name('v1.pubsub.channels');
});

// V2 — заглушка (для будущего)
Route::prefix('v2')->middleware(['auth:sanctum', 'throttle:api'])->group(function () {
    Route::apiResource('notes', \App\Http\Controllers\Api\V2\NoteApiController::class)
        ->names('v2.notes');
});

// Обратная совместимость: /api/notes → v1
Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {
    Route::apiResource('notes', \App\Http\Controllers\Api\V1\NoteApiController::class)
        ->except(['store'])
        ->names('legacy.notes');
    Route::post('/notes', [\App\Http\Controllers\Api\V1\NoteApiController::class, 'store'])
        ->middleware('throttle:note-creation')
        ->name('legacy.notes.store');
});