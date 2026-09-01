"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { reverseGeocode } from "@/lib/api/location";
import type { LocationInfo } from "@/lib/types";

export const DEFAULT_LOCATION: LocationInfo = {
  name: "New Delhi",
  country: "India",
  admin1: "Delhi",
  lat: 28.6139,
  lon: 77.209,
  timezone: "Asia/Kolkata",
};

const STORAGE_KEY = "mausam:lastLocation";

interface LocationContextValue {
  location: LocationInfo;
  setLocation: (loc: LocationInfo) => void;
  useMyLocation: () => Promise<void>;
  geoLoading: boolean;
  geoError: string | null;
}

const LocationContext = createContext<LocationContextValue>({
  location: DEFAULT_LOCATION,
  setLocation: () => {},
  useMyLocation: async () => {},
  geoLoading: false,
  geoError: null,
});

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocationState] = useState<LocationInfo>(DEFAULT_LOCATION);
  const { loading: geoLoading, error: geoError, getPosition } = useGeolocation();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setLocationState(JSON.parse(raw));
    } catch {
      // Ignore malformed/unavailable storage - default location is a safe fallback.
    }
  }, []);

  const setLocation = useCallback((loc: LocationInfo) => {
    setLocationState(loc);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
    } catch {
      // Storage may be unavailable (private mode) - non-fatal.
    }
  }, []);

  const useMyLocation = useCallback(async () => {
    const pos = await getPosition();
    if (!pos) return;
    const place = await reverseGeocode(pos.lat, pos.lon).catch(() => null);
    setLocation({
      name: place?.name ?? "My Location",
      country: place?.country ?? null,
      admin1: place?.admin1 ?? null,
      lat: pos.lat,
      lon: pos.lon,
      timezone: null,
    });
  }, [getPosition, setLocation]);

  return (
    <LocationContext.Provider value={{ location, setLocation, useMyLocation, geoLoading, geoError }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  return useContext(LocationContext);
}
