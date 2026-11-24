import { queryClient } from "./query-client";
import { getCarBySlug } from "../services/api/cars.service";
import { useLanguageStore } from "../store/language.store";

/** Same module as the lazy route in routes/index.tsx; the browser loads it once. */
const loadCarDetailsPage = () => import("../pages/CarDetailsPage");

let carDetailsChunkRequested = false;

/** Hover / focus: warm the page code only. Cheap, and no API call. */
export function prefetchCarDetailsChunk(): void {
  if (carDetailsChunkRequested) return;
  carDetailsChunkRequested = true;
  loadCarDetailsPage().catch(() => {
    carDetailsChunkRequested = false;
  });
}

/**
 * Pointer down (the click is happening): start the car request ~100ms before navigation.
 * Not on hover: the details endpoint counts a view per request.
 * Uses the same query key as CarDetailsPage, which then reads it from the cache.
 */
export function prefetchCarDetailsData(slug: string): void {
  prefetchCarDetailsChunk();
  const language = useLanguageStore.getState().language;
  void queryClient.prefetchQuery({
    queryKey: ["car-details", slug, language],
    queryFn: () => getCarBySlug(slug),
  });
}
