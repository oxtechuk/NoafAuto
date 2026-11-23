{{-- Plain HTML version of the page, rendered inside #root before React mounts
     (React replaces it). Visually hidden, so visitors see no change; crawlers
     that don't run JavaScript (AI search bots) read it. --}}
@php
    $locale = app()->getLocale();
    $rawSiteName = $globalSettings['site_name'] ?? ($globalSettings->get('site_name') ?? null);
    $siteName = is_array($rawSiteName)
        ? ($rawSiteName[$locale] ?? $rawSiteName['ar'] ?? reset($rawSiteName))
        : ($rawSiteName ?: config('app.name', 'تعميد'));

    $rawFooterText = $globalSettings['footer_text'] ?? ($globalSettings->get('footer_text') ?? null);
    $footerText = is_array($rawFooterText)
        ? ($rawFooterText[$locale] ?? $rawFooterText['ar'] ?? reset($rawFooterText))
        : $rawFooterText;

    $contactPhone = $seoContent['contact']['phone'] ?? ($globalSettings['contact_phone'] ?? ($globalSettings->get('contact_phone') ?? null));
    $contactWhatsapp = $seoContent['contact']['whatsapp'] ?? ($globalSettings['contact_whatsapp'] ?? ($globalSettings->get('contact_whatsapp') ?? null));
    $contactEmail = $seoContent['contact']['email'] ?? ($globalSettings['contact_email'] ?? ($globalSettings->get('contact_email') ?? null));
    $rawAddress = $seoContent['contact']['address'] ?? ($globalSettings['contact_address'] ?? ($globalSettings->get('contact_address') ?? null));
    $contactAddress = is_array($rawAddress)
        ? ($rawAddress[$locale] ?? $rawAddress['ar'] ?? reset($rawAddress))
        : $rawAddress;
@endphp
<div class="ssr-page" dir="{{ $locale === 'en' ? 'ltr' : 'rtl' }}" lang="{{ $locale }}">
    <style>
        /* Not shown to visitors (the app replaces #root on mount); kept in the HTML for crawlers. */
        .ssr-page{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);clip-path:inset(50%);border:0}
    </style>
    <div class="ssr-wrap">
        <header class="ssr-head">
            <strong><a href="{{ url('/') }}">{{ $siteName }}</a></strong>
            <a href="{{ url('/cars') }}">{{ __('السيارات') }}</a>
            <a href="{{ url('/offers') }}">{{ __('العروض') }}</a>
            <a href="{{ url('/finance-calculator') }}">{{ __('حاسبة التمويل') }}</a>
            <a href="{{ url('/blog') }}">{{ __('المدونة') }}</a>
            <a href="{{ url('/about') }}">{{ __('من نحن') }}</a>
            <a href="{{ url('/contact') }}">{{ __('تواصل معنا') }}</a>
        </header>

        @if (! empty($seoContent['breadcrumb']))
            <nav class="ssr-crumbs" aria-label="مسار التنقل">
                @foreach ($seoContent['breadcrumb'] as $crumb)
                    @if ($crumb['url'])<a href="{{ str_starts_with($crumb['url'], 'http') ? $crumb['url'] : url($crumb['url']) }}">{{ $crumb['name'] }}</a> ›@else<span>{{ $crumb['name'] }}</span>@endif
                @endforeach
            </nav>
        @endif

        <main>
            <h1>{{ $seoContent['h1'] ?? '' }}</h1>

            @if (! empty($seoContent['facts']))
                <dl class="ssr-facts">
                    @foreach ($seoContent['facts'] as [$label, $value])
                        <dt>{{ $label }}</dt><dd>{{ $value }}</dd>
                    @endforeach
                </dl>
            @endif

            @foreach ($seoContent['intro'] ?? [] as $paragraph)
                <p>{{ $paragraph }}</p>
            @endforeach

            @if (! empty($seoContent['html']))
                <article>{!! $seoContent['html'] !!}</article>
            @endif

            @foreach ($seoContent['sections'] ?? [] as $section)
                <section>
                    <h2>{{ $section['title'] }}</h2>
                    <ul>
                        @foreach ($section['items'] as $item)
                            <li>
                                <a href="{{ str_starts_with($item['url'], 'http') ? $item['url'] : url($item['url']) }}">{{ $item['text'] }}</a>
                                @if (! empty($item['meta']))<span class="ssr-meta"> · {{ $item['meta'] }}</span>@endif
                            </li>
                        @endforeach
                    </ul>
                </section>
            @endforeach

            @if (! empty($seoContent['faq']))
                <section>
                    <h2>{{ __('أسئلة شائعة') }}</h2>
                    @foreach ($seoContent['faq'] as $item)
                        <h3>{{ $item['q'] }}</h3>
                        <p>{{ $item['a'] }}</p>
                    @endforeach
                </section>
            @endif
        </main>

        <footer class="ssr-foot">
            <p>
                {{ $siteName }} {{ $footerText ?: __('لتمويل السيارات بالتقسيط في السعودية') }}
                @if (! empty($contactPhone))
                    · {{ __('الهاتف الموحد') }}: <a href="tel:{{ $contactPhone }}">{{ $contactPhone }}</a>
                @endif
                @if (! empty($contactWhatsapp))
                    · {{ __('واتساب') }}: {{ $contactWhatsapp }}
                @endif
                @if (! empty($contactEmail))
                    · <a href="mailto:{{ $contactEmail }}">{{ $contactEmail }}</a>
                @endif
            </p>
            @if (! empty($contactAddress))
                <p>{{ $contactAddress }}</p>
            @endif
            <p><a href="{{ url('/privacy') }}">{{ __('سياسة الخصوصية') }}</a> · <a href="{{ url('/terms') }}">{{ __('الشروط والأحكام') }}</a></p>
        </footer>
    </div>
</div>
