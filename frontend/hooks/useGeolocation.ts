"use client";

import { useCallback, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";

interface GeoState {
  loading: boolean;
  error: string | null;
}

export function useGeolocation() {
  const { t } = useLanguage();
  const [state, setState] = useState<GeoState>({ loading: false, error: null });

  const getPosition = useCallback((): Promise<{ lat: number; lon: number } | null> => {
    return new Promise((resolve) => {
      if (!("geolocation" in navigator)) {
        setState({ loading: false, error: t("location.unsupported") });
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
          setState({ loading: false, error: err.message || t("location.accessError") });
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 }
      );
    });
  }, [t]);

  return { ...state, getPosition };
}
