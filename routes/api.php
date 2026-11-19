<?php

use App\Http\Controllers\Api\V1\AuthController as V1AuthController;
use App\Http\Controllers\Api\V1\BookingController as V1BookingController;
use App\Http\Controllers\Api\V1\BrandController as V1BrandController;
use App\Http\Controllers\Api\V1\CarController as V1CarController;
use App\Http\Controllers\Api\V1\DashboardController as V1DashboardController;
use App\Http\Controllers\Api\V1\DeployWebhookController;
use App\Http\Controllers\Api\V1\EmployeeController as V1EmployeeController;
use App\Http\Controllers\Api\V1\LeadController as V1LeadController;
use App\Http\Controllers\Api\V1\ModuleController as V1ModuleController;
use App\Http\Controllers\Api\V1\ReportController as V1ReportController;
use App\Http\Controllers\Api\V1\RoleController as V1RoleController;
use App\Http\Controllers\Api\V1\SettingController as V1SettingController;
use App\Http\Controllers\Api\V1\SystemController;
use App\Http\Controllers\Api\V1\TaskController as V1TaskController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->name('api.v1.')->group(function () {
    Route::get('/health', [SystemController::class, 'health'])->name('health');
    Route::get('/system/info', [SystemController::class, 'info'])->name('system.info');
    Route::get('/version', [SystemController::class, 'version'])->name('version');
    Route::post('/system/deploy-webhook', [DeployWebhookController::class, 'handle'])->name('system.deploy-webhook');

    // Cookie-based SPA authentication for employees (call /sanctum/csrf-cookie first).
    Route::prefix('auth')->name('auth.')->middleware('web')->group(function () {
        Route::post('/login', [V1AuthController::class, 'login'])->middleware('throttle:login')->name('login');

        Route::middleware(['auth:employee', 'employee.active'])->group(function () {
            Route::get('/me', [V1AuthController::class, 'me'])->name('me');
            Route::post('/logout', [V1AuthController::class, 'logout'])->name('logout');
        });
    });

    // Authenticated CRM API for employees (session cookie + CSRF).
    Route::middleware(['web', 'auth:employee', 'guard.employee', 'employee.active'])->group(function () {
        Route::get('dashboard/stats', [V1DashboardController::class, 'stats'])->name('dashboard.stats');
        Route::get('dashboard/alerts', [V1DashboardController::class, 'alerts'])->name('dashboard.alerts');

        Route::get('reports/bookings', [V1ReportController::class, 'bookings'])->name('reports.bookings');
        Route::get('reports/sources', [V1ReportController::class, 'sources'])->name('reports.sources');

        Route::apiResource('leads', V1LeadController::class);

        Route::apiResource('bookings', V1BookingController::class)->except('update');
        Route::prefix('bookings/{booking}')->name('bookings.')->controller(V1BookingController::class)->group(function () {
            Route::patch('/offer', 'updateOffer')->name('offer');
            Route::patch('/status', 'updateStatus')->name('status');
            Route::post('/approve', 'approve')->name('approve');
            Route::post('/reject', 'reject')->name('reject');
            Route::patch('/assign', 'assign')->name('assign');
            Route::post('/notes', 'addNote')->name('notes.store');
            Route::post('/documents', 'uploadDocument')->name('documents.store');
            Route::get('/documents/{document}/download', 'downloadDocument')->name('documents.download');
            Route::delete('/documents/{document}', 'deleteDocument')->name('documents.destroy');
        });

        Route::apiResource('tasks', V1TaskController::class);
        Route::prefix('tasks/{task}')->name('tasks.')->controller(V1TaskController::class)->group(function () {
            Route::post('/toggle', 'toggle')->name('toggle');
            Route::post('/start', 'start')->name('start');
            Route::post('/complete', 'complete')->name('complete');
            Route::post('/postpone', 'postpone')->name('postpone');
        });

        Route::apiResource('employees', V1EmployeeController::class);
        Route::post('employees/{employee}/toggle-active', [V1EmployeeController::class, 'toggleActive'])->name('employees.toggle-active');

        Route::get('roles/permissions', [V1RoleController::class, 'permissions'])->name('roles.permissions');
        Route::apiResource('roles', V1RoleController::class);

        Route::apiResource('brands', V1BrandController::class);
        Route::apiResource('cars', V1CarController::class);

        Route::get('settings', [V1SettingController::class, 'index'])->name('settings.index');
        Route::get('settings/{key}', [V1SettingController::class, 'show'])->name('settings.show');
        Route::put('settings', [V1SettingController::class, 'update'])->name('settings.update');
        Route::post('settings', [V1SettingController::class, 'update'])->name('settings.store');

        Route::get('modules', [V1ModuleController::class, 'index'])->name('modules.index');
        Route::post('modules/{key}/enable', [V1ModuleController::class, 'enable'])->name('modules.enable');
        Route::post('modules/{key}/disable', [V1ModuleController::class, 'disable'])->name('modules.disable');
    });
});

// Store Public API — loaded from routes/store-api.php
