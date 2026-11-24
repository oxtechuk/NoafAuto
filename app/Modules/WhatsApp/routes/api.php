<?php

use App\Modules\WhatsApp\Http\Controllers\AdminWhatsAppController;
use App\Modules\WhatsApp\Http\Controllers\WebhookController;
use Illuminate\Support\Facades\Route;

// Provider webhooks (public, signature-verified). Set these URLs in Meta / Twilio.
Route::prefix('api/v1/webhooks/whatsapp')
    ->middleware(['api', 'throttle:300,1'])
    ->name('whatsapp.webhook.')
    ->group(function () {
        Route::get('/meta', [WebhookController::class, 'metaVerify'])->name('meta.verify');
        Route::post('/meta', [WebhookController::class, 'meta'])->name('meta');
        Route::post('/twilio', [WebhookController::class, 'twilio'])->name('twilio');
    });

// Admin dashboard (employee session).
Route::prefix('api/v1/modules/whatsapp')
    ->middleware(['api', 'web', 'auth:employee', 'guard.employee', 'employee.active'])
    ->name('api.v1.whatsapp.')
    ->group(function () {
        Route::get('/settings', [AdminWhatsAppController::class, 'settings'])->name('settings');
        Route::put('/settings', [AdminWhatsAppController::class, 'updateSettings'])->name('settings.update');
        Route::post('/test-connection', [AdminWhatsAppController::class, 'testConnection'])->name('test-connection');
        Route::post('/test-send', [AdminWhatsAppController::class, 'testSend'])->name('test-send');
        Route::get('/conversations', [AdminWhatsAppController::class, 'conversations'])->name('conversations');
        Route::get('/conversations/{conversation}', [AdminWhatsAppController::class, 'messages'])->name('conversations.show');
        Route::post('/conversations/{conversation}/reply', [AdminWhatsAppController::class, 'reply'])->name('conversations.reply');
        Route::post('/conversations/{conversation}/resume-ai', [AdminWhatsAppController::class, 'resumeAi'])->name('conversations.resume-ai');
        Route::get('/log', [AdminWhatsAppController::class, 'log'])->name('log');
        Route::get('/stats', [AdminWhatsAppController::class, 'stats'])->name('stats');
    });
