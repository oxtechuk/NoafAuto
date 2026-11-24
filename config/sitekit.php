<?php

$versionFile = base_path('VERSION');

return [

    /*
    |--------------------------------------------------------------------------
    | Sitekit Core Version
    |--------------------------------------------------------------------------
    |
    | Read from the VERSION file at the project root. The release workflow in
    | the base (upstream) repository bumps this file and tags the release,
    | so client repositories pick up the new version when they merge it.
    |
    */

    'version' => is_file($versionFile) ? (trim((string) file_get_contents($versionFile)) ?: '1.0.0') : '1.0.0',

    /*
    |--------------------------------------------------------------------------
    | Update Channel
    |--------------------------------------------------------------------------
    |
    | "stable" only offers normal GitHub releases. "beta" also offers
    | pre-releases (tags such as v1.3.0-beta.1).
    |
    */

    'update_channel' => env('SITEKIT_UPDATE_CHANNEL', 'stable'),

    /*
    |--------------------------------------------------------------------------
    | Update Manifest URL (legacy)
    |--------------------------------------------------------------------------
    |
    | Optional JSON manifest ({"version": "x.y.z", "changelog": "..."}). Only
    | used when no GitHub upstream repository is configured.
    |
    */

    'manifest_url' => env('SITEKIT_MANIFEST_URL'),

    /*
    |--------------------------------------------------------------------------
    | GitHub Update Source
    |--------------------------------------------------------------------------
    |
    | upstream_repo  The base Sitekit repository ("owner/repo") that publishes releases.
    | client_repo    This client's own repository ("owner/repo"). Installing an update
    |                dispatches the "update_workflow" GitHub Action in this repository,
    |                which merges the upstream release, runs the tests and deploys to the VPS.
    | token          Fine-grained token: "Contents: read" on the upstream repo and
    |                "Actions: read and write" on the client repo.
    |
    */

    'github' => [
        'api_url' => env('SITEKIT_GITHUB_API_URL', 'https://api.github.com'),
        'upstream_repo' => env('SITEKIT_UPSTREAM_REPO'),
        'client_repo' => env('SITEKIT_CLIENT_REPO'),
        'client_branch' => env('SITEKIT_CLIENT_BRANCH', 'main'),
        'token' => env('SITEKIT_GITHUB_TOKEN'),
        'update_workflow' => env('SITEKIT_UPDATE_WORKFLOW', 'sitekit-update.yml'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Update Check Cache
    |--------------------------------------------------------------------------
    |
    | How long (seconds) the last update check is reused by the dashboard.
    | The scheduler refreshes it daily; "Check now" refreshes it on demand.
    |
    */

    'update_check_ttl' => (int) env('SITEKIT_UPDATE_CHECK_TTL', 21600),

    /*
    |--------------------------------------------------------------------------
    | Project Storefront (external static frontend)
    |--------------------------------------------------------------------------
    |
    | A project-specific frontend (React/Vite, built separately) that replaces
    | the bundled store SPA. Laravel keeps rendering resources/views/app.blade.php
    | (SEO meta, JSON-LD, pixels, custom scripts) and injects the storefront's
    | built assets from "public_path"/index.html instead of the bundled store.
    |
    | path         source folder of the frontend (has its own package.json)
    | public_path  where "sitekit:storefront:build" publishes dist/ (served as /storefront/)
    |
    */

    'storefront' => [
        'enabled' => (bool) env('SITEKIT_STOREFRONT_ENABLED', false),
        'path' => env('SITEKIT_STOREFRONT_PATH', resource_path('storefront')),
        'public_path' => env('SITEKIT_STOREFRONT_PUBLIC_PATH', public_path('storefront')),
        'build_command' => env('SITEKIT_STOREFRONT_BUILD_COMMAND', 'npm run build'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Deploy / Webhook Secret
    |--------------------------------------------------------------------------
    |
    | Shared secret used to sign (HMAC-SHA256) webhooks between GitHub Actions
    | and this instance: release notifications and deployment progress callbacks.
    |
    */

    'deploy_secret' => env('SITEKIT_DEPLOY_SECRET'),

];
