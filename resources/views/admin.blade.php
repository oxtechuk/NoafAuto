<!doctype html>
@php
    $locale = app()->getLocale();
    $rawSiteName = data_get($globalSettings ?? [], 'site_name');
    $siteName = is_array($rawSiteName)
        ? ($rawSiteName[$locale] ?? $rawSiteName['ar'] ?? reset($rawSiteName))
        : ($rawSiteName ?: 'تعميد CRM');

    $faviconPath = data_get($globalSettings ?? [], 'site_favicon');
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
    {{-- Non-blocking font CSS: the panel paints with the system font, then swaps. --}}
    <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&family=Tajawal:wght@300;400;500;700;800;900&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" onload="this.onload=null;this.rel='stylesheet'" />
    <noscript><link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&family=Tajawal:wght@300;400;500;700;800;900&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet" /></noscript>
    @isset($bootUser)
    <script>window.__BOOT_USER__ = @json($bootUser);</script>
    @else
    <script>window.__BOOT_USER__ = null;</script>
    @endisset
    @php
        $resolveAsset = function(?string $path): ?string {
            if (! $path) return null;
            if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) return $path;
            $clean = ltrim($path, '/');
            if (str_starts_with($clean, 'images/') || file_exists(public_path($clean))) return asset($clean);
            return asset('storage/' . $clean);
        };
        $adminSettings = [
            'login_bg' => $resolveAsset(data_get($globalSettings, 'admin_login_bg')),
            'login_logo' => $resolveAsset(data_get($globalSettings, 'admin_login_logo')),
            'sidebar_logo' => $resolveAsset(data_get($globalSettings, 'admin_sidebar_logo')),
            'site_logo' => $resolveAsset(data_get($globalSettings, 'site_logo')),
            'login_title' => data_get($globalSettings, 'admin_login_title'),
            'login_subtitle' => data_get($globalSettings, 'admin_login_subtitle'),
            'has_title_setting' => array_key_exists('admin_login_title', (array) $globalSettings),
        ];
    @endphp
    <script>window.__ADMIN_SETTINGS__ = @json($adminSettings);</script>
    @viteReactRefresh
    @vite(['resources/react/admin/main.tsx'])
</head>
<body class="bg-[var(--app-bg,#F4F6F8)] text-[var(--text-primary,#20252B)] antialiased">
    <div id="admin-root"></div>
</body>
</html>
