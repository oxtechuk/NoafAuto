{{-- First-paint placeholder inside #root, shown while the store JS bundle downloads.
     React replaces everything inside #root on mount. Pure HTML/CSS, no images or fonts. --}}
<style>
    .boot-sk{min-height:100vh;background:#F0F2F5}
    .boot-sk__bar{display:none;height:84px;background:#fff;border-bottom:1px solid #E5E9F0}
    .boot-sk__wrap{max-width:80rem;margin:0 auto;padding:0 16px}
    .boot-sk__bar .boot-sk__wrap{height:100%;display:flex;align-items:center;justify-content:space-between;gap:24px}
    .boot-sk__b{background:linear-gradient(90deg,#e4e8ee 25%,#f1f4f8 50%,#e4e8ee 75%);background-size:200% 100%;animation:boot-sk 1.4s ease-in-out infinite;border-radius:12px}
    .boot-sk__hero{height:420px;margin:24px 0;border-radius:24px}
    .boot-sk__grid{display:grid;grid-template-columns:1fr;gap:28px;padding-bottom:48px}
    .boot-sk__card{height:400px;border-radius:16px}
    @media (min-width:768px){.boot-sk__bar{display:block}.boot-sk__grid{grid-template-columns:repeat(2,1fr)}.boot-sk__wrap{padding:0 24px}}
    @media (min-width:1280px){.boot-sk__grid{grid-template-columns:repeat(3,1fr)}}
    @media (prefers-reduced-motion:reduce){.boot-sk__b{animation:none}}
    @keyframes boot-sk{0%{background-position:200% 0}100%{background-position:-200% 0}}
</style>
<div class="boot-sk" aria-busy="true" aria-hidden="true">
    <div class="boot-sk__bar">
        <div class="boot-sk__wrap">
            <div class="boot-sk__b" style="width:140px;height:44px"></div>
            <div class="boot-sk__b" style="flex:1;max-width:560px;height:18px"></div>
            <div class="boot-sk__b" style="width:130px;height:44px"></div>
        </div>
    </div>
    <div class="boot-sk__wrap">
        <div class="boot-sk__b boot-sk__hero"></div>
        <div class="boot-sk__grid">
            <div class="boot-sk__b boot-sk__card"></div>
            <div class="boot-sk__b boot-sk__card"></div>
            <div class="boot-sk__b boot-sk__card"></div>
        </div>
    </div>
</div>
