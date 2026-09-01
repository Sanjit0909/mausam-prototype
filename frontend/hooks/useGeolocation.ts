"use client";

import { useCallback, useState } from "react";

interface GeoState {
  loading: boolean;
  error: string | null;
}

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({ loading: false, error: null });

  const getPosition = useCallback((): Promise<{ lat: number; lon: number } | null> => {
    return new Promise((resolve) => {
      if (!("geolocation" in navigator)) {
        setState({ loading: false, error: "Location access is not supported by this browser." });
        resolve(null);
        return;
      }
      setState({ loading: true, error: null });
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setState({ loading: false, error: null });
          resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        },
        (err) => {
          setState({ loading: false, error: err.message || "Unable to access your location." });
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 }
      );
    });
  }, []);

  return { ...state, getPosition };
}
