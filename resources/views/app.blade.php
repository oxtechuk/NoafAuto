<!doctype html>
@php
    // Settings may arrive as an array or a Collection; normalize so ->get() below never fails.
    $globalSettings = collect($globalSettings ?? []);
    $locale = app()->getLocale();
    $isRtl = $locale !== 'en';

    // 1. Resolve Dynamic Site Name
    $rawSiteName = $globalSettings['site_name'] ?? ($globalSettings->get('site_name') ?? null);
    $siteName = is_array($rawSiteName)
        ? ($rawSiteName[$locale] ?? $rawSiteName['ar'] ?? reset($rawSiteName))
        : ($rawSiteName ?: config('app.name', 'تعميد'));

    // 2. Resolve Meta Title & Fallbacks
    $rawMetaTitle = $globalSettings['meta_title'] ?? ($globalSettings->get('meta_title') ?? null);
    $defaultMetaTitle = is_array($rawMetaTitle)
        ? ($rawMetaTitle[$locale] ?? $rawMetaTitle['ar'] ?? reset($rawMetaTitle))
        : ($rawMetaTitle ?: ($siteName . ' | تمويل سيارات بالتقسيط في السعودية'));
    $pageTitle = $metaTitle ?? $defaultMetaTitle;

    // 3. Resolve Meta Description & Fallbacks
    $rawMetaDesc = $globalSettings['meta_description'] ?? ($globalSettings->get('meta_description') ?? null);
    $defaultMetaDesc = is_array($rawMetaDesc)
        ? ($rawMetaDesc[$locale] ?? $rawMetaDesc['ar'] ?? reset($rawMetaDesc))
        : ($rawMetaDesc ?: ('احصل على أفضل عروض تمويل وتقسيط السيارات في السعودية من ' . $siteName . '. أقل قسط شهري وبدون دفعة أولى لجميع الماركات.'));
    $pageDescription = $metaDescription ?? $defaultMetaDesc;

    // 4. Resolve Meta Keywords
    $rawMetaKeywords = $globalSettings['meta_keywords'] ?? ($globalSettings->get('meta_keywords') ?? null);
    $metaKeywords = is_array($rawMetaKeywords)
        ? ($rawMetaKeywords[$locale] ?? $rawMetaKeywords['ar'] ?? reset($rawMetaKeywords))
        : $rawMetaKeywords;

    // 5. Resolve Favicon
    $faviconPath = $globalSettings['site_favicon'] ?? ($globalSettings->get('site_favicon') ?? null);
    $faviconUrl = $faviconPath
        ? (str_starts_with($faviconPath, 'http://') || str_starts_with($faviconPath, 'https://')
            ? $faviconPath
            : (str_starts_with(ltrim($faviconPath, '/'), 'images/') || file_exists(public_path(ltrim($faviconPath, '/')))
                ? asset(ltrim($faviconPath, '/'))
                : asset('storage/' . ltrim($faviconPath, '/'))))
        : asset('favicon.svg');
    $faviconExt = strtolower(pathinfo((string) parse_url($faviconUrl, PHP_URL_PATH), PATHINFO_EXTENSION));
    $faviconMime = match($faviconExt) {
        'png' => 'image/png',
        'ico' => 'image/x-icon',
        'jpg', 'jpeg' => 'image/jpeg',
        'webp' => 'image/webp',
        default => 'image/svg+xml',
    };

    // 6. Resolve Open Graph & Social Share Image
    $siteLogoPath = $globalSettings['site_logo'] ?? ($globalSettings->get('site_logo') ?? null);
    $defaultShareImage = $siteLogoPath
        ? (str_starts_with($siteLogoPath, 'http://') || str_starts_with($siteLogoPath, 'https://')
            ? $siteLogoPath
            : (str_starts_with(ltrim($siteLogoPath, '/'), 'images/') || file_exists(public_path(ltrim($siteLogoPath, '/')))
                ? asset(ltrim($siteLogoPath, '/'))
                : asset('storage/' . ltrim($siteLogoPath, '/'))))
        : asset('images/logo.png');
    $pageOgImage = $ogImage ?? $defaultShareImage;

    // 7. Resolve Tracking Pixels & Marketing IDs
    $gaId = trim((string) ($globalSettings['google_analytics_id'] ?? ($globalSettings->get('google_analytics_id') ?? '')));
    $gtmId = trim((string) ($globalSettings['google_tag_manager_id'] ?? ($globalSettings->get('google_tag_manager_id') ?? ($globalSettings['gtm_id'] ?? ($globalSettings->get('gtm_id') ?? '')))));
    $metaPixelId = trim((string) ($globalSettings['meta_pixel_id'] ?? ($globalSettings->get('meta_pixel_id') ?? ($globalSettings['facebook_pixel_id'] ?? ($globalSettings->get('facebook_pixel_id') ?? '')))));
    $tiktokPixelId = trim((string) ($globalSettings['tiktok_pixel_id'] ?? ($globalSettings->get('tiktok_pixel_id') ?? '')));
    $snapPixelId = trim((string) ($globalSettings['snapchat_pixel_id'] ?? ($globalSettings->get('snapchat_pixel_id') ?? ($globalSettings['snap_pixel_id'] ?? ($globalSettings->get('snap_pixel_id') ?? '')))));
    $customHead = $globalSettings['custom_head_scripts'] ?? ($globalSettings->get('custom_head_scripts') ?? null);
    $customBody = $globalSettings['custom_body_scripts'] ?? ($globalSettings->get('custom_body_scripts') ?? null);
@endphp
<html lang="{{ $locale }}" dir="{{ $isRtl ? 'rtl' : 'ltr' }}">
<head>
    <meta charset="UTF-8" />
    <link rel="icon" type="{{ $faviconMime }}" href="{{ $faviconUrl }}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{ $pageTitle }}</title>
    <meta name="description" content="{{ $pageDescription }}" />
    @if (!empty($metaKeywords))
    <meta name="keywords" content="{{ $metaKeywords }}" />
    @endif
    @if (empty($is404))
    <link rel="canonical" href="{{ $canonicalUrl ?? rtrim(url()->current(), '/') }}" />
    @endif
    <meta name="robots" content="{{ $metaRobots ?? 'index, follow' }}" />
    <meta name="ssr-seo-path" content="{{ rawurldecode('/' . ltrim(request()->path(), '/')) }}" />

    @if (empty($storefront))
    <!-- Cairo Font (High-Performance WOFF2 Subsets with font-display: swap) -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
    @endif

    <!-- Open Graph (Facebook, WhatsApp, LinkedIn) -->
    <meta property="og:site_name" content="{{ $siteName }}" />
    <meta property="og:title" content="{{ $pageTitle }}" />
    <meta property="og:description" content="{{ $pageDescription }}" />
    <meta property="og:url" content="{{ $canonicalUrl ?? url()->current() }}" />
    <meta property="og:type" content="{{ $ogType ?? 'website' }}" />
    <meta property="og:image" content="{{ $pageOgImage }}" />
    <meta property="og:locale" content="{{ $locale === 'en' ? 'en_US' : 'ar_SA' }}" />

    <!-- Twitter Cards -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="{{ $pageTitle }}" />
    <meta name="twitter:description" content="{{ $pageDescription }}" />
    <meta name="twitter:image" content="{{ $pageOgImage }}" />

    @if (!empty($jsonLd))
    <!-- Structured Data (JSON-LD) -->
    <script type="application/ld+json">
    {!! json_encode($jsonLd, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) !!}
    </script>
    @endif

    @if (!empty($gaId))
    <!-- Google Analytics 4 (async, does not block rendering) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id={{ $gaId }}"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '{{ $gaId }}');
    </script>
    @endif

    @if (!empty($gtmId) || !empty($metaPixelId) || !empty($tiktokPixelId) || !empty($snapPixelId))
    <!-- Marketing & Analytics Tracking (Deferred to avoid blocking page load) -->
    <script>
        function loadMarketingPixels() {
            @if (!empty($gtmId))
            // Google Tag Manager
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','{{ $gtmId }}');
            @endif

            @if (!empty($metaPixelId))
            // Meta Pixel
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '{{ $metaPixelId }}');
            fbq('track', 'PageView');
            @endif

            @if (!empty($tiktokPixelId))
            // TikTok Pixel
            !function (w, d, t) {
              w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(
            var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script")
            ;n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
              ttq.load('{{ $tiktokPixelId }}');
              ttq.page();
            }(window, document, 'ttq');
            @endif

            @if (!empty($snapPixelId))
            // Snap Pixel
            (function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function()
            {a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};
            a.queue=[];var s='script';r=t.createElement(s);r.async=!0;
            r.src=n;var u=t.getElementsByTagName(s)[0];
            u.parentNode.insertBefore(r,u);})(window,document,
            'https://sc-static.net/scevent.min.js');
            snaptr('init', '{{ $snapPixelId }}');
            snaptr('track', 'PAGE_VIEW');
            @endif
        }

        if (document.readyState === 'complete') {
            setTimeout(loadMarketingPixels, 100);
        } else {
            window.addEventListener('load', function() {
                setTimeout(loadMarketingPixels, 100);
            });
        }
    </script>
    @endif

    @if (!empty($customHead))
        {!! $customHead !!}
    @endif

    <script>
        window.__APP_URL__ = "{{ rtrim(url('/'), '/') }}";
        window.__BASE_PATH__ = "{{ rtrim(request()->getBasePath(), '/') }}";
        window.__API_URL__ = "{{ rtrim(url('/api/v1'), '/') }}/";
        window.__ASSET_URL__ = "{{ rtrim(asset('/'), '/') }}/";
    </script>

    @if (! empty($storefront))
    <!-- Project storefront (built from config('sitekit.storefront.path')) -->
    {!! $storefront['head'] !!}
    @else
    @viteReactRefresh
    @vite('resources/react/main.tsx')
    @endif
</head>
<body>
    @if (!empty($gtmId))
    <!-- Google Tag Manager (noscript) -->
    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id={{ $gtmId }}"
    height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
    <!-- End Google Tag Manager (noscript) -->
    @endif

    @if (!empty($metaPixelId))
    <!-- Meta Pixel (noscript) -->
    <noscript><img height="1" width="1" style="display:none"
    src="https://www.facebook.com/tr?id={{ $metaPixelId }}&ev=PageView&noscript=1"
    /></noscript>
    <!-- End Meta Pixel (noscript) -->
    @endif

    <div id="{{ $storefront['root_id'] ?? 'root' }}">@if (! empty($seoContent))@include('partials.seo-content')@endif</div>

    @if (! empty($storefront['body']))
    {!! $storefront['body'] !!}
    @endif

    @if (!empty($customBody))
        {!! $customBody !!}
    @endif
</body>
</html>
