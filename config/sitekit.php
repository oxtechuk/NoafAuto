<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Sitekit Core Version
    |--------------------------------------------------------------------------
    |
    | The semantic version of the Sitekit core this project runs on. It is
    | compared against the update manifest to detect available upgrades.
    |
    */

    'version' => '0.1.0',

    /*
    |--------------------------------------------------------------------------
    | Update Channel
    |--------------------------------------------------------------------------
    |
    | Supported: "stable", "beta", "security".
    |
    */

    'update_channel' => env('SITEKIT_UPDATE_CHANNEL', 'stable'),

    /*
    |--------------------------------------------------------------------------
    | Update Manifest URL
    |--------------------------------------------------------------------------
    */

    'manifest_url' => env('SITEKIT_MANIFEST_URL'),

];
