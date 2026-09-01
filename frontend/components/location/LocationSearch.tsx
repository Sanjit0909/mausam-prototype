"use client";

import { useEffect, useState } from "react";
import { Loader2, MapPin, Search, Signpost } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { searchLocations } from "@/lib/api/location";
import { useLocation } from "@/context/LocationContext";
import { locationLabel } from "@/lib/utils/format";
import type { LocationSearchResult } from "@/lib/types";

interface LocationSearchProps {
  onSelect?: (loc: LocationSearchResult) => void;
  autoFocus?: boolean;
  placeholder?: string;
}

export function LocationSearch({ onSelect, autoFocus, placeholder = "Search city, region, or country..." }: LocationSearchProps) {
  const { setLocation, useMyLocation, geoLoading, geoError } = useLocation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debouncedQuery = useDebounce(query, 350);

  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    searchLocations(debouncedQuery, controller.signal)
      .then(setResults)
      .catch((err) => {
        if (err.name !== "AbortError") setError("Couldn't search locations right now.");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [debouncedQuery]);

  const handleSelect = (loc: LocationSearchResult) => {
    setLocation(loc);
    setQuery("");
    setResults([]);
    onSelect?.(loc);
  };

  return (
    <div className="w-full">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mist-400" />
        <input
          autoFocus={autoFocus}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3.5 pl-11 pr-4 text-sm text-mist-100 placeholder:text-mist-400 outline-none transition-colors focus:border-sky-400/50 focus:bg-white/[0.06]"
        />
        {loading && <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-mist-400" />}
      </div>

      <button
        onClick={useMyLocation}
        disabled={geoLoading}
        className="mt-2 flex items-center gap-2 text-xs font-medium text-sky-400 hover:text-sky-300 transition-colors disabled:opacity-50"
      >
        <Signpost className="h-3.5 w-3.5" />
        {geoLoading ? "Locating..." : "Use my current location"}
      </button>
      {geoError && <p className="mt-1 text-xs text-rose-400">{geoError}</p>}

      {(results.length > 0 || error) && (
        <div className="glass mt-3 max-h-72 overflow-y-auto rounded-2xl p-2">
          {error && <p className="px-3 py-2 text-sm text-rose-400">{error}</p>}
          {results.map((loc, i) => (
            <button
              key={`${loc.lat}-${loc.lon}-${i}`}
              onClick={() => handleSelect(loc)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-mist-200 hover:bg-white/10 transition-colors"
            >
              <MapPin className="h-4 w-4 shrink-0 text-sky-400" />
              <span className="truncate">{locationLabel(loc)}</span>
            </button>
          ))}
        </div>
      )}

      {!loading && debouncedQuery.trim().length >= 2 && results.length === 0 && !error && (
        <p className="mt-3 px-1 text-sm text-mist-400">No locations found for &ldquo;{debouncedQuery}&rdquo;.</p>
      )}
    </div>
  );
}
