<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Refresh the "update available" status shown in the admin dashboard.
Schedule::command('sitekit:updates:check')->dailyAt('03:00')->withoutOverlapping();
