<!doctype html>
<?php
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
?>
<html lang="<?php echo e($locale); ?>" dir="<?php echo e($isRtl ? 'rtl' : 'ltr'); ?>">
<head>
    <meta charset="UTF-8" />
    <link rel="icon" type="<?php echo e($faviconMime); ?>" href="<?php echo e($faviconUrl); ?>" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title><?php echo e($pageTitle); ?></title>
    <meta name="description" content="<?php echo e($pageDescription); ?>" />
    <?php if(!empty($metaKeywords)): ?>
    <meta name="keywords" content="<?php echo e($metaKeywords); ?>" />
    <?php endif; ?>
    <?php if(empty($is404)): ?>
    <link rel="canonical" href="<?php echo e($canonicalUrl ?? rtrim(url()->current(), '/')); ?>" />
    <?php endif; ?>
    <meta name="robots" content="<?php echo e($metaRobots ?? 'index, follow'); ?>" />
    <meta name="ssr-seo-path" content="<?php echo e(rawurldecode('/' . ltrim(request()->path(), '/'))); ?>" />

    <!-- Cairo Font (High-Performance WOFF2 Subsets with font-display: swap) -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet" />

    <!-- Open Graph (Facebook, WhatsApp, LinkedIn) -->
    <meta property="og:site_name" content="<?php echo e($siteName); ?>" />
    <meta property="og:title" content="<?php echo e($pageTitle); ?>" />
    <meta property="og:description" content="<?php echo e($pageDescription); ?>" />
    <meta property="og:url" content="<?php echo e($canonicalUrl ?? url()->current()); ?>" />
    <meta property="og:type" content="<?php echo e($ogType ?? 'website'); ?>" />
    <meta property="og:image" content="<?php echo e($pageOgImage); ?>" />
    <meta property="og:locale" content="<?php echo e($locale === 'en' ? 'en_US' : 'ar_SA'); ?>" />

    <!-- Twitter Cards -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="<?php echo e($pageTitle); ?>" />
    <meta name="twitter:description" content="<?php echo e($pageDescription); ?>" />
    <meta name="twitter:image" content="<?php echo e($pageOgImage); ?>" />

    <?php if(!empty($jsonLd)): ?>
    <!-- Structured Data (JSON-LD) -->
    <script type="application/ld+json">
    <?php echo json_encode($jsonLd, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT); ?>

    </script>
    <?php endif; ?>

    <?php if(!empty($gaId)): ?>
    <!-- Google Analytics 4 (async, does not block rendering) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=<?php echo e($gaId); ?>"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '<?php echo e($gaId); ?>');
    </script>
    <?php endif; ?>

    <?php if(!empty($gtmId) || !empty($metaPixelId) || !empty($tiktokPixelId) || !empty($snapPixelId)): ?>
    <!-- Marketing & Analytics Tracking (Deferred to avoid blocking page load) -->
    <script>
        function loadMarketingPixels() {
            <?php if(!empty($gtmId)): ?>
            // Google Tag Manager
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','<?php echo e($gtmId); ?>');
            <?php endif; ?>

            <?php if(!empty($metaPixelId)): ?>
            // Meta Pixel
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '<?php echo e($metaPixelId); ?>');
            fbq('track', 'PageView');
            <?php endif; ?>

            <?php if(!empty($tiktokPixelId)): ?>
            // TikTok Pixel
            !function (w, d, t) {
              w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(
            var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script")
            ;n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
              ttq.load('<?php echo e($tiktokPixelId); ?>');
              ttq.page();
            }(window, document, 'ttq');
            <?php endif; ?>

            <?php if(!empty($snapPixelId)): ?>
            // Snap Pixel
            (function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function()
            {a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};
            a.queue=[];var s='script';r=t.createElement(s);r.async=!0;
            r.src=n;var u=t.getElementsByTagName(s)[0];
            u.parentNode.insertBefore(r,u);})(window,document,
            'https://sc-static.net/scevent.min.js');
            snaptr('init', '<?php echo e($snapPixelId); ?>');
            snaptr('track', 'PAGE_VIEW');
            <?php endif; ?>
        }

        if (document.readyState === 'complete') {
            setTimeout(loadMarketingPixels, 100);
        } else {
            window.addEventListener('load', function() {
                setTimeout(loadMarketingPixels, 100);
            });
        }
    </script>
    <?php endif; ?>

    <?php if(!empty($customHead)): ?>
        <?php echo $customHead; ?>

    <?php endif; ?>

    <script>
        window.__APP_URL__ = "<?php echo e(rtrim(url('/'), '/')); ?>";
        window.__BASE_PATH__ = "<?php echo e(rtrim(request()->getBasePath(), '/')); ?>";
        window.__API_URL__ = "<?php echo e(rtrim(url('/api/v1'), '/')); ?>/";
        window.__ASSET_URL__ = "<?php echo e(rtrim(asset('/'), '/')); ?>/";
    </script>

    <?php echo app('Illuminate\Foundation\Vite')->reactRefresh(); ?>
    <?php echo app('Illuminate\Foundation\Vite')('resources/react/main.tsx'); ?>
</head>
<body>
    <?php if(!empty($gtmId)): ?>
    <!-- Google Tag Manager (noscript) -->
    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=<?php echo e($gtmId); ?>"
    height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
    <!-- End Google Tag Manager (noscript) -->
    <?php endif; ?>

    <?php if(!empty($metaPixelId)): ?>
    <!-- Meta Pixel (noscript) -->
    <noscript><img height="1" width="1" style="display:none"
    src="https://www.facebook.com/tr?id=<?php echo e($metaPixelId); ?>&ev=PageView&noscript=1"
    /></noscript>
    <!-- End Meta Pixel (noscript) -->
    <?php endif; ?>

    <div id="root"><?php if(! empty($seoContent)): ?><?php echo $__env->make('partials.seo-content', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php endif; ?></div>

    <?php if(!empty($customBody)): ?>
        <?php echo $customBody; ?>

    <?php endif; ?>
</body>
</html>
<?php /**PATH C:\wamp64\www\Tameed\resources\views/app.blade.php ENDPATH**/ ?>