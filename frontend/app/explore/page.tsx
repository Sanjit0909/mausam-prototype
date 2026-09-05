"use client";

import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { LocationSearch } from "@/components/location/LocationSearch";
import { useLocation } from "@/context/LocationContext";
import { useLanguage } from "@/context/LanguageContext";
import type { LocationSearchResult } from "@/lib/types";

const POPULAR_CITIES: LocationSearchResult[] = [
  { name: "New Delhi", country: "India", admin1: "Delhi", lat: 28.6139, lon: 77.209 },
  { name: "Mumbai", country: "India", admin1: "Maharashtra", lat: 19.076, lon: 72.8777 },
  { name: "Bengaluru", country: "India", admin1: "Karnataka", lat: 12.9716, lon: 77.5946 },
  { name: "Chennai", country: "India", admin1: "Tamil Nadu", lat: 13.0827, lon: 80.2707 },
  { name: "Kolkata", country: "India", admin1: "West Bengal", lat: 22.5726, lon: 88.3639 },
  { name: "Hyderabad", country: "India", admin1: "Telangana", lat: 17.385, lon: 78.4867 },
  { name: "Goa", country: "India", admin1: "Goa", lat: 15.2993, lon: 74.124 },
  { name: "Shimla", country: "India", admin1: "Himachal Pradesh", lat: 31.1048, lon: 77.1734 },
];

export default function ExplorePage() {
  const router = useRouter();
  const { setLocation, location } = useLocation();
  const { t } = useLanguage();

  const handleSelect = (loc: LocationSearchResult) => {
    setLocation(loc);
    router.push("/home");
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <h1 className="text-xl font-semibold text-mist-100">{t("explore.title")}</h1>
      <p className="mt-1 text-sm text-mist-400">{t("explore.subtitle", { name: location.name })}</p>

      <div className="mt-6">
        <LocationSearch autoFocus onSelect={handleSelect} placeholder={t("explore.search")} />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-mist-400">{t("explore.popular")}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {POPULAR_CITIES.map((city) => (
            <button
              key={city.name}
              onClick={() => handleSelect(city)}
              className="glass glass-hover flex items-center gap-2 rounded-2xl p-4 text-left"
            >
              <MapPin className="h-4 w-4 shrink-0 text-sky-400" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-mist-100">{city.name}</p>
                <p className="truncate text-xs text-mist-400">{city.admin1}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
