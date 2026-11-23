<!doctype html>
@php
    $locale = app()->getLocale();
    $rawSiteName = $globalSettings['site_name'] ?? ($globalSettings->get('site_name') ?? null);
    $siteName = is_array($rawSiteName)
        ? ($rawSiteName[$locale] ?? $rawSiteName['ar'] ?? reset($rawSiteName))
        : ($rawSiteName ?: 'تعميد CRM');

    $faviconPath = $globalSettings['site_favicon'] ?? ($globalSettings->get('site_favicon') ?? null);
    $faviconUrl = $faviconPath
        ? (str_starts_with($faviconPath, 'http://') || str_starts_with($faviconPath, 'https://')
            ? $faviconPath
            : (str_starts_with(ltrim($faviconPath, '/'), 'images/') || file_exists(public_path(ltrim($faviconPath, '/')))
                ? asset(ltrim($faviconPath, '/'))
                : asset('storage/' . ltrim($faviconPath, '/'))))
        : asset('images/logo.png');
    $faviconExt = strtolower(pathinfo((string) parse_url($faviconUrl, PATHINFO_EXTENSION), PATHINFO_EXTENSION));
    $faviconMime = match($faviconExt) {
        'png' => 'image/png',
        'ico' => 'image/x-icon',
        'jpg', 'jpeg' => 'image/jpeg',
        'webp' => 'image/webp',
        default => 'image/png',
    };
@endphp
<html lang="{{ $locale }}" dir="{{ $locale === 'en' ? 'ltr' : 'rtl' }}">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{ $siteName }} | {{ __('لوحة التحكم') }}</title>
    <link rel="icon" type="{{ $faviconMime }}" href="{{ $faviconUrl }}" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&family=Tajawal:wght@300;400;500;700;800;900&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet" />
    @viteReactRefresh
    @vite(['resources/react/admin/main.tsx'])
</head>
<body class="bg-[var(--app-bg,#F4F6F8)] text-[var(--text-primary,#20252B)] antialiased">
    <div id="admin-root"></div>
</body>
</html>
