import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getCars, searchCars } from "../services/api";
import type { CarItem } from "../types/home.types";

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Car picker search. Empty query = first page of cars (cached across opens),
 * otherwise a debounced search. `searching` is true while results are on their way.
 */
export function useCarSearch(showSearch: boolean) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isFetching, isError } = useQuery<CarItem[]>({
    queryKey: ["car-search", debouncedQuery],
    queryFn: () =>
      debouncedQuery ? searchCars(debouncedQuery) : getCars().then((res) => res.data),
    enabled: showSearch,
    placeholderData: keepPreviousData,
  });

  const isDebouncing = searchQuery.trim() !== debouncedQuery;
  const searchResults = showSearch && !isError ? (data ?? []) : [];

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    searching: showSearch && (isFetching || isDebouncing),
  };
}
