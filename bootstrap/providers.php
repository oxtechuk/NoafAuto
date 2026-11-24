<?php

use App\Providers\AppServiceProvider;
use App\Providers\InfrastructureServiceProvider;
use App\Providers\SitekitModuleServiceProvider;

return [
    // First: switches cache/session/queue/asset config before anything else uses them.
    InfrastructureServiceProvider::class,
    AppServiceProvider::class,
    SitekitModuleServiceProvider::class,
];
