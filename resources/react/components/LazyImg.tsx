import {
  type ImgHTMLAttributes,
  type SyntheticEvent,
  useEffect,
  useRef,
  useState,
} from "react";

type LazyImgStatus = "idle" | "loading" | "revealed";

// Global in-memory cache of already loaded images to prevent re-flashing
const loadedImagesCache = new Set<string>();

export interface ILazyImgProps extends ImgHTMLAttributes<HTMLImageElement> {
  skeletonClassName?: string;
  containerClassName?: string;
  rootMargin?: string;
  /** Tried in order when the image fails (e.g. thumbnail → original → placeholder). */
  fallbackSrc?: string | string[];
}

export default function LazyImg({
  src,
  srcSet,
  sizes,
  className = "",
  containerClassName = "",
  style,
  onLoad,
  onError,
  skeletonClassName = "",
  loading = "lazy",
  rootMargin = "1000px 600px",
  fallbackSrc,
  ...rest
}: ILazyImgProps) {
  const fallbacks = fallbackSrc === undefined ? [] : Array.isArray(fallbackSrc) ? fallbackSrc : [fallbackSrc];
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const isCached = Boolean(src && loadedImagesCache.has(src));
  const isEager = loading === "eager" || isCached;

  const [inView, setInView] = useState(() => isEager);
  const [status, setStatus] = useState<LazyImgStatus>(() =>
    isCached ? "revealed" : isEager ? "loading" : "idle"
  );
  const [currentSrc, setCurrentSrc] = useState<string | undefined>(src);

  useEffect(() => {
    setCurrentSrc(src);
    if (src && loadedImagesCache.has(src)) {
      setInView(true);
      setStatus("revealed");
    }
  }, [src]);

  useEffect(() => {
    if (isEager) {
      setInView(true);
      return;
    }

    if (inView) return;
    const el = containerRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      setStatus("loading");
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          setStatus((prev) => (prev === "revealed" ? "revealed" : "loading"));
          observer.disconnect();
        }
      },
      { rootMargin, threshold: 0 }
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, [isEager, inView, rootMargin]);

  useEffect(() => {
    if (!inView || !currentSrc) return;
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) {
      loadedImagesCache.add(currentSrc);
      setStatus("revealed");
    }
  }, [currentSrc, inView]);

  const handleLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    if (currentSrc) {
      loadedImagesCache.add(currentSrc);
    }
    setStatus("revealed");
    onLoad?.(event);
  };

  const handleError = (event: SyntheticEvent<HTMLImageElement>) => {
    const nextIndex = currentSrc === src ? 0 : fallbacks.indexOf(currentSrc ?? "") + 1;
    const next = fallbacks.slice(nextIndex).find((candidate) => candidate && candidate !== currentSrc);
    if (next) {
      setCurrentSrc(next);
      return;
    }
    setStatus("revealed");
    onError?.(event);
  };

  const isPending = status !== "revealed";

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${containerClassName} ${isPending ? `lazy-img-skeleton ${skeletonClassName}` : ""}`}
    >
      {inView && currentSrc && (
        <img
          {...rest}
          ref={imgRef}
          src={currentSrc}
          // srcSet only applies to the primary image; once we fall back it must go, or the browser keeps using it.
          srcSet={currentSrc === src ? srcSet : undefined}
          sizes={currentSrc === src ? sizes : undefined}
          loading={loading}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={`${className} transition-opacity duration-200 ease-out ${status === "revealed" ? "opacity-100" : "opacity-0"}`}
          style={style}
        />
      )}
    </div>
  );
}
