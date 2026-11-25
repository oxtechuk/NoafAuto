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
        // Official Meta connection: Embedded Signup, number health, templates.
        Route::post('/onboarding/embedded', [AdminWhatsAppController::class, 'completeEmbeddedSignup'])->middleware('throttle:10,1')->name('onboarding.embedded');
        Route::get('/health', [AdminWhatsAppController::class, 'health'])->name('health');
        Route::get('/templates', [AdminWhatsAppController::class, 'templates'])->name('templates');
        Route::post('/templates/sync', [AdminWhatsAppController::class, 'syncTemplates'])->middleware('throttle:10,1')->name('templates.sync');
        // Inbox: admins see everything, other employees only the conversations assigned to them.
        Route::get('/inbox/meta', [AdminWhatsAppController::class, 'inboxMeta'])->name('inbox.meta');
        Route::get('/conversations', [AdminWhatsAppController::class, 'conversations'])->name('conversations');
        Route::get('/conversations/{conversation}', [AdminWhatsAppController::class, 'messages'])->name('conversations.show');
        Route::patch('/conversations/{conversation}', [AdminWhatsAppController::class, 'update'])->name('conversations.update');
        Route::post('/conversations/{conversation}/reply', [AdminWhatsAppController::class, 'reply'])->name('conversations.reply');
        Route::post('/conversations/{conversation}/resume-ai', [AdminWhatsAppController::class, 'resumeAi'])->name('conversations.resume-ai');
        // Internal notes, saved on the customer's CRM lead (created if missing).
        Route::post('/conversations/{conversation}/notes', [AdminWhatsAppController::class, 'storeNote'])->name('conversations.notes.store');
        Route::delete('/conversations/{conversation}/notes/{note}', [AdminWhatsAppController::class, 'destroyNote'])->name('conversations.notes.destroy');
        Route::post('/contacts/notes', [AdminWhatsAppController::class, 'storeContactNote'])->name('contacts.notes.store');
        Route::get('/log', [AdminWhatsAppController::class, 'log'])->name('log');
        Route::get('/stats', [AdminWhatsAppController::class, 'stats'])->name('stats');
    });
