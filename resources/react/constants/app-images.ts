export const getAssetBase = (): string => {
  if (typeof window !== "undefined" && (window as any).__ASSET_URL__) {
    const assetUrl = (window as any).__ASSET_URL__;
    return assetUrl.endsWith("/") ? assetUrl : `${assetUrl}/`;
  }
  const base = import.meta.env.BASE_URL || "/";
  return base.endsWith("/") ? base : `${base}/`;
};

export function getImageUrl(path: string | null): string {
  if (!path) return "";
  
  if (path.startsWith("http://") || path.startsWith("https://")) {
    try {
      const url = new URL(path);
      const storageIdx = url.pathname.indexOf("/storage/");
      if (storageIdx !== -1) {
        return `${getAssetBase()}${url.pathname.substring(storageIdx + 1)}`;
      }
    } catch {
      // ignore invalid URLs
    }
    return path.replace(/([^:]\/)\//g, "$1");
  }
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  if (cleanPath.startsWith("storage/")) {
    return `${getAssetBase()}${cleanPath}`;
  }
  return `${getAssetBase()}storage/${cleanPath}`;
}

/** Widths the server can generate (App\Services\ImageThumbnailService::WIDTHS). */
export type ThumbWidth = 320 | 480 | 768;

/**
 * Resized WebP version of an uploaded image (served from /thumbs/{width}/..., generated on first use).
 * URLs that aren't uploads on this site (static /images, external, SVG) are returned unchanged.
 */
export function getThumbUrl(url: string, width: ThumbWidth): string {
  const base = getAssetBase();
  const storagePrefix = `${base}storage/`;
  if (!url || !url.startsWith(storagePrefix)) return url;

  const relativePath = url.slice(storagePrefix.length).split(/[?#]/)[0];
  if (!/\.(jpe?g|png|webp)$/i.test(relativePath)) return url;

  return `${base}thumbs/${width}/${relativePath}.webp`;
}

/** srcSet for an uploaded image, or undefined when no thumbnails apply. */
export function getThumbSrcSet(url: string, widths: ThumbWidth[] = [320, 480, 768]): string | undefined {
  if (getThumbUrl(url, widths[0]) === url) return undefined;
  return widths.map((width) => `${getThumbUrl(url, width)} ${width}w`).join(", ");
}

export const APP_IMAGES = {
  get LOGO() { return `${getAssetBase()}images/logo_without_bg.webp`; },
  get Logo_COLORED() { return `${getAssetBase()}images/logo-colored.webp`; },
  get HOME_HERO() { return `${getAssetBase()}images/home_hero.webp`; },
  get EID() { return `${getAssetBase()}images/eid.webp`; },
  get CAR1() { return `${getAssetBase()}images/car1.webp`; },
  get CAR_PLACEHOLDER() {
    if (typeof window !== "undefined") {
      const bootSettings = (window as any).__BOOT_SETTINGS__;
      const def = bootSettings?.data?.default_car_image;
      if (def) return getImageUrl(def);
    }
    return `${getAssetBase()}storage/settings/tjJk5THeSKGpLVocAHCqqSvhy9S055LxICF8iXEU.webp`;
  },
  get BRAND_PLACEHOLDER() { return `${getAssetBase()}images/brand-placeholder.svg`; },
  get RIYAL() { return `${getAssetBase()}images/riyal.svg`; },
  get CAR_ICON() { return `${getAssetBase()}images/car icons/car.svg`; },
  get FUEL_ICON() { return `${getAssetBase()}images/car icons/fuel.svg`; },
  get GEARBOX_ICON() { return `${getAssetBase()}images/car icons/tabler_manual-gearbox.svg`; },
  get SEAT_ICON() { return `${getAssetBase()}images/car icons/seat.svg`; },
  get BG_IMAGE() { return `${getAssetBase()}images/offers-section-bg.webp`; },
  get OFFERS_SECTION_BG() { return `${getAssetBase()}images/offers-section-bg.webp`; },
  get ALL_CARS_OFFER_IMAGE() { return `${getAssetBase()}images/all-cars-offer-page.webp`; },
  get CONTACT_US_HERO() { return `${getAssetBase()}images/contact-us-hero.webp`; },
  get COMPARE_IMAGE() { return `${getAssetBase()}images/compre-image.webp`; },
  get OFFER1() { return `${getAssetBase()}images/offer1.webp`; },
  get OFFER_PLACEHOLDER() { return `${getAssetBase()}images/offer1.webp`; },
  get BLOG_PLACEHOLDER() { return `${getAssetBase()}images/blog.webp`; },
  get BLOG_AUTHOR_PLACEHOLDER() { return `${getAssetBase()}images/blogs/author.png`; },
  get AVATAR_PLACEHOLDER() { return `${getAssetBase()}images/avatar.png`; },
  get LOCATION_PLACEHOLDER() { return `${getAssetBase()}images/locations/riyadh.png`; },
  get SOCIAL_TIKTOK() { return `${getAssetBase()}images/social/tiktok.png`; },
  get SOCIAL_FACEBOOK() { return `${getAssetBase()}images/social/facebook.png`; },
  get SOCIAL_INSTAGRAM() { return `${getAssetBase()}images/social/instagram.png`; },
  get VID_MUSK_POSTER() { return `${getAssetBase()}images/vidmusk.webp`; },
} as const;
