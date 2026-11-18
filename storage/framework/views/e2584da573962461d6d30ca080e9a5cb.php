<!doctype html>
<html lang="<?php echo e(app()->getLocale()); ?>" dir="<?php echo e(app()->getLocale() === 'en' ? 'ltr' : 'rtl'); ?>">
<head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title><?php echo e($metaTitle ?? 'زاد كابيتال | تمويل سيارات بالتقسيط في السعودية'); ?></title>
    <meta name="description" content="<?php echo e($metaDescription ?? 'احصل على أفضل عروض تمويل وتقسيط السيارات في السعودية من زاد كابيتال. أقل قسط شهري وبدون دفعة أولى لجميع الماركات.'); ?>" />
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
    <meta property="og:site_name" content="زاد كابيتال" />
    <meta property="og:title" content="<?php echo e($metaTitle ?? 'زاد كابيتال | تمويل سيارات بالتقسيط في السعودية'); ?>" />
    <meta property="og:description" content="<?php echo e($metaDescription ?? 'احصل على أفضل عروض تمويل وتقسيط السيارات في السعودية من زاد كابيتال.'); ?>" />
    <meta property="og:url" content="<?php echo e($canonicalUrl ?? url()->current()); ?>" />
    <meta property="og:type" content="<?php echo e($ogType ?? 'website'); ?>" />
    <meta property="og:image" content="<?php echo e($ogImage ?? asset('images/og-share-zad.jpg')); ?>" />
    <meta property="og:locale" content="<?php echo e(app()->getLocale() === 'en' ? 'en_US' : 'ar_SA'); ?>" />

    <!-- Twitter Cards -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="<?php echo e($metaTitle ?? 'زاد كابيتال | تمويل سيارات بالتقسيط في السعودية'); ?>" />
    <meta name="twitter:description" content="<?php echo e($metaDescription ?? 'احصل على أفضل عروض تمويل وتقسيط السيارات في السعودية من زاد كابيتال.'); ?>" />
    <meta name="twitter:image" content="<?php echo e($ogImage ?? asset('images/og-share-zad.jpg')); ?>" />

    <?php if(!empty($jsonLd)): ?>
    <!-- Structured Data (JSON-LD) -->
    <script type="application/ld+json">
    <?php echo json_encode($jsonLd, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT); ?>

    </script>
    <?php endif; ?>

    <!-- Google Analytics 4 (async, does not block rendering) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-GZMP4VBPHR"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-GZMP4VBPHR');
    </script>

    <!-- Marketing & Analytics Tracking (Deferred to avoid blocking page load) -->
    <script>
        function loadMarketingPixels() {
            // Google Tag Manager
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-5FMK8WJR');

            // Meta Pixel
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '27909085665438703');
            fbq('track', 'PageView');

            // TikTok Pixel
            !function (w, d, t) {
              w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(
            var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script")
            ;n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
              ttq.load('DA0MI2JC77UFIU519G0G');
              ttq.page();
            }(window, document, 'ttq');

            // Snap Pixel
            (function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function()
            {a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};
            a.queue=[];var s='script';r=t.createElement(s);r.async=!0;
            r.src=n;var u=t.getElementsByTagName(s)[0];
            u.parentNode.insertBefore(r,u);})(window,document,
            'https://sc-static.net/scevent.min.js');
            snaptr('init', 'bdbd26a3-c7a9-4250-b6a4-bcfe43476132');
            snaptr('track', 'PAGE_VIEW');
        }

        if (document.readyState === 'complete') {
            setTimeout(loadMarketingPixels, 100);
        } else {
            window.addEventListener('load', function() {
                setTimeout(loadMarketingPixels, 100);
            });
        }
    </script>

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
    <!-- Google Tag Manager (noscript) -->
    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-5FMK8WJR"
    height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
    <!-- End Google Tag Manager (noscript) -->

    <!-- Meta Pixel (noscript) -->
    <noscript><img height="1" width="1" style="display:none"
    src="https://www.facebook.com/tr?id=27909085665438703&ev=PageView&noscript=1"
    /></noscript>
    <!-- End Meta Pixel (noscript) -->

    <div id="root"><?php if(! empty($seoContent)): ?><?php echo $__env->make('partials.seo-content', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php endif; ?></div>
</body>
</html>
<?php /**PATH C:\wamp64\www\Tameed\resources\views/app.blade.php ENDPATH**/ ?>