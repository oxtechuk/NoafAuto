<?php

use App\Modules\AiAssistant\Http\Controllers\AdminAssistantController;
use App\Modules\AiAssistant\Http\Controllers\StoreAssistantController;
use Illuminate\Support\Facades\Route;

// Storefront chat widget (public).
Route::prefix('api/v1/store/assistant')
    ->middleware('api')
    ->name('v1.store.api.assistant.')
    ->group(function () {
        Route::get('/config', [StoreAssistantController::class, 'config'])->name('config');
        Route::post('/chat', [StoreAssistantController::class, 'chat'])->middleware('throttle:20,1')->name('chat');
    });

// Admin dashboard (employee session).
Route::prefix('api/v1/modules/ai-assistant')
    ->middleware(['api', 'web', 'auth:employee', 'guard.employee', 'employee.active'])
    ->name('api.v1.ai-assistant.')
    ->group(function () {
        Route::get('/settings', [AdminAssistantController::class, 'settings'])->name('settings');
        Route::put('/settings', [AdminAssistantController::class, 'updateSettings'])->name('settings.update');
        Route::post('/test-connection', [AdminAssistantController::class, 'testConnection'])->name('test-connection');
        Route::post('/playground', [AdminAssistantController::class, 'playground'])->name('playground');
        Route::get('/conversations', [AdminAssistantController::class, 'conversations'])->name('conversations');
        Route::get('/conversations/{conversation}', [AdminAssistantController::class, 'conversation'])->name('conversations.show');
        Route::get('/stats', [AdminAssistantController::class, 'stats'])->name('stats');
    });
