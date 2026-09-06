"use client";

import { ExternalLink, MapPinned, Waves } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface WeatherMapCardProps {
  lat: number;
  lon: number;
  locationName: string;
}

function radarForLocation(lat: number, lon: number) {
  // Paradip radar is the most relevant official IMD radar for the Puri/Odisha demo.
  if (lat >= 17 && lat <= 24 && lon >= 80 && lon <= 90) {
    return {
      name: "Paradip",
      image: "https://mausam.imd.gov.in/Radar/caz_pdp.gif",
      page: "https://mausam.imd.gov.in/bhubaneswar/index_radar.php?id=Paradip",
    };
  }

  return {
    name: "Delhi-HQ",
    image: "https://mausam.imd.gov.in/Radar/caz_delhi.gif",
    page: "https://mausam.imd.gov.in/responsive/radar.php",
  };
}

export function WeatherMapCard({ lat, lon, locationName }: WeatherMapCardProps) {
  const { locale } = useLanguage();
  const hi = locale === "hi";
  const radar = radarForLocation(lat, lon);

  return (
    <section className="glass glass-hover overflow-hidden rounded-3xl p-5 md:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <MapPinned className="h-4 w-4 text-sky-400" aria-hidden />
            <h2 className="text-sm font-semibold text-mist-100">
              {hi ? "मौसम मानचित्र" : "Weather Map"}
            </h2>
          </div>
          <p className="mt-1 text-xs text-mist-400">
            {hi
              ? `IMD रडार • ${locationName}`
              : `IMD radar • ${locationName}`}
          </p>
        </div>
        <a
          href={radar.page}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-[11px] text-mist-300 transition hover:bg-white/5"
        >
          {hi ? "IMD खोलें" : "Open IMD"}
          <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-[10px] uppercase tracking-wide text-mist-400">
          <span>{radar.name} Radar • MAX-Z</span>
          <span>{hi ? "आधिकारिक IMD" : "Official IMD"}</span>
        </div>
        <div className="flex min-h-[260px] items-center justify-center bg-slate-950 p-2 md:min-h-[320px]">
          <img
            src={radar.image}
            alt={`${radar.name} IMD weather radar`}
            className="max-h-[310px] w-full object-contain"
            loading="lazy"
          />
        </div>
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-mist-500">
        {hi
          ? "रडार इमेज IMD के आधिकारिक रडार नेटवर्क से ली गई है। यह forecast model नहीं, radar observation product है।"
          : "Radar imagery is served by IMD's official radar network. This is a radar observation product, not a forecast model."}
      </p>
    </section>
  );
}

export function MarineMapCard({ locationName }: { locationName: string }) {
  const { locale } = useLanguage();
  const hi = locale === "hi";

  return (
    <section className="glass glass-hover overflow-hidden rounded-3xl p-5 md:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Waves className="h-4 w-4 text-cyan-400" aria-hidden />
            <h2 className="text-sm font-semibold text-mist-100">
              {hi ? "INCOIS समुद्री मानचित्र" : "INCOIS Marine Map"}
            </h2>
          </div>
          <p className="mt-1 text-xs text-mist-400">
            {hi ? `ERDDAP / WMS • ${locationName}` : `ERDDAP / WMS • ${locationName}`}
          </p>
        </div>
        <a
          href="https://erddap.incois.gov.in/erddap/wms/incois_oceansat2_datasets/index.html"
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-[11px] text-mist-300 transition hover:bg-white/5"
        >
          {hi ? "INCOIS खोलें" : "Open INCOIS"}
          <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
        <iframe
          title="INCOIS ERDDAP marine map"
          src="https://erddap.incois.gov.in/erddap/wms/incois_oceansat2_datasets/index.html"
          className="h-[320px] w-full border-0 md:h-[380px]"
          loading="lazy"
        />
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-mist-500">
        {hi
          ? "यह मानचित्र INCOIS ERDDAP के सार्वजनिक WMS डेटा से जुड़ा है। ERDDAP dataset की freshness अलग-अलग हो सकती है; इसे live tide observation के रूप में न दिखाएँ।"
          : "This map is connected to INCOIS public ERDDAP/WMS. Dataset freshness varies by product, so it is not presented as a live tide observation."}
      </p>
    </section>
  );
}
