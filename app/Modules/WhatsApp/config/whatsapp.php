<?php

/*
 * Platform-level WhatsApp settings (the Sitekit vendor's Meta app), shared by every showroom.
 * Each showroom still connects its own WhatsApp Business account and number from the admin.
 */
return [
    'embedded_signup' => [
        // Meta app of the platform (registered as a Tech Provider). Empty = manual connection only.
        'app_id' => env('WHATSAPP_META_APP_ID', ''),
        'app_secret' => env('WHATSAPP_META_APP_SECRET', ''),
        // Facebook Login for Business configuration id (WhatsApp Embedded Signup).
        'config_id' => env('WHATSAPP_META_CONFIG_ID', ''),
    ],

    // Health details from Meta are cached to stay far below the Graph API rate limits.
    'health_cache_seconds' => 600,
];
