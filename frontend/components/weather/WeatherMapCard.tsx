"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ExternalLink,
  MapPinned,
  Waves,
  Satellite,
  Radio,
  AlertTriangle,
  Maximize2,
  CheckCircle2,
  RefreshCw,
  Compass,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

// Dynamically load the high-performance 2D/3D WebGL satellite & Doppler map
const SatelliteWeatherMap = dynamic(
  () =>
    import("@/components/map/SatelliteWeatherMap").then(
      (m) => m.SatelliteWeatherMap
    ),
  {
    ssr: false,
    loading: () => (
      <div className="relative h-[440px] w-full overflow-hidden rounded-2xl border border-white/10 bg-navy-950/80 animate-shimmer flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-sky-500/10 border border-sky-400/20 flex items-center justify-center text-sky-400 shadow-lg shadow-sky-500/10">
            <Satellite className="h-5 w-5 animate-pulse" />
          </div>
          <p className="text-xs font-medium text-mist-300">
            Initializing Live Doppler Radar & Satellite View...
          </p>
        </div>
      </div>
    ),
  }
);

interface WeatherMapCardProps {
  lat: number;
  lon: number;
  locationName: string;
}

// Select the closest official IMD Doppler radar station for context
function radarForLocation(lat: number, lon: number) {
  // Eastern India / West Bengal / Sikkim / Darjeeling / North East
  if (lat >= 21 && lat <= 28 && lon >= 86 && lon <= 96) {
    return {
      name: "Kolkata",
      region: "Eastern Region",
      image: "https://mausam.imd.gov.in/Radar/caz_kol.gif",
      page: "https://mausam.imd.gov.in/kolkata/index_radar.php",
    };
  }

  // Odisha / Bay of Bengal Coast
  if (lat >= 17 && lat <= 23 && lon >= 81 && lon <= 87) {
    return {
      name: "Paradip",
      region: "Odisha Coast",
      image: "https://mausam.imd.gov.in/Radar/caz_pdp.gif",
      page: "https://mausam.imd.gov.in/bhubaneswar/index_radar.php?id=Paradip",
    };
  }

  // Western India / Maharashtra / Mumbai
  if (lat >= 17 && lat <= 22 && lon >= 71 && lon <= 76) {
    return {
      name: "Mumbai",
      region: "Western Region",
      image: "https://mausam.imd.gov.in/Radar/caz_mum.gif",
      page: "https://mausam.imd.gov.in/responsive/radar.php",
    };
  }

  // Southern India / Tamil Nadu / Chennai
  if (lat >= 8 && lat <= 16 && lon >= 76 && lon <= 82) {
    return {
      name: "Chennai",
      region: "Southern Region",
      image: "https://mausam.imd.gov.in/Radar/caz_chn.gif",
      page: "https://mausam.imd.gov.in/responsive/radar.php",
    };
  }

  // Default: Delhi-HQ National Doppler Radar
  return {
    name: "Delhi-HQ",
    region: "Northern Region",
    image: "https://mausam.imd.gov.in/Radar/caz_delhi.gif",
    page: "https://mausam.imd.gov.in/responsive/radar.php",
  };
}

export function WeatherMapCard({ lat, lon, locationName }: WeatherMapCardProps) {
  const { locale } = useLanguage();
  const hi = locale === "hi";
  const radar = radarForLocation(lat, lon);

  // Default to the reliable, interactive live Doppler satellite map
  const [activeTab, setActiveTab] = useState<"live" | "imd">("live");
  const [imdImgLoading, setImdImgLoading] = useState(true);
  const [imdImgError, setImdImgError] = useState(false);

  // Monitor IMD image load with fallback timeout (government servers frequently timeout or drop cross-origin requests)
  useEffect(() => {
    if (activeTab === "imd") {
      setImdImgLoading(true);
      setImdImgError(false);

      const timeoutId = setTimeout(() => {
        setImdImgLoading(false);
        setImdImgError(true);
      }, 5000);

      return () => clearTimeout(timeoutId);
    }
  }, [activeTab, radar.image]);

  return (
    <section className="glass glass-hover overflow-hidden rounded-3xl p-5 md:p-6 transition-all duration-300">
      {/* CARD HEADER */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <MapPinned className="h-4 w-4 text-sky-400" aria-hidden />
            <h2 className="text-sm font-semibold text-mist-100">
              {hi ? "मौसम एवं रडार मानचित्र" : "Weather & Radar Map"}
            </h2>
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <p className="mt-1 text-xs text-mist-400">
            {hi
              ? `लाइव डॉपलर वर्षा और उपग्रह बादल • ${locationName}`
              : `Live Doppler precipitation & satellite imagery • ${locationName}`}
          </p>
        </div>

        {/* CONTROLS: VIEW SWITCHER + FULLSCREEN COCKPIT LINK */}
        <div className="flex flex-wrap items-center gap-2">
          {/* TAB SWITCHER */}
          <div className="flex items-center rounded-2xl border border-white/10 bg-navy-950/70 p-1 backdrop-blur-md">
            <button
              onClick={() => setActiveTab("live")}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                activeTab === "live"
                  ? "bg-sky-500 text-navy-950 shadow-md shadow-sky-500/25 font-semibold"
                  : "text-mist-400 hover:text-mist-200 hover:bg-white/5"
              }`}
            >
              <Satellite className="h-3.5 w-3.5" />
              <span>{hi ? "लाइव रडार (सक्रिय)" : "Live Doppler & Satellite"}</span>
            </button>
            <button
              onClick={() => setActiveTab("imd")}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                activeTab === "imd"
                  ? "bg-sky-500 text-navy-950 shadow-md shadow-sky-500/25 font-semibold"
                  : "text-mist-400 hover:text-mist-200 hover:bg-white/5"
              }`}
            >
              <Radio className="h-3.5 w-3.5" />
              <span>{hi ? "IMD रडार" : "Official IMD"}</span>
            </button>
          </div>

          {/* LINK TO DEDICATED /map ROUTE */}
          <Link
            href="/map"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-mist-200 hover:bg-white/10 hover:text-sky-300 transition-all"
            title="Open full interactive map cockpit"
          >
            <span>{hi ? "पूर्ण मैप" : "Full Map"}</span>
            <Maximize2 className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* VIEWPORT CONTENT */}
      {activeTab === "live" ? (
        <div className="space-y-3">
          {/* LIVE WEBGL SATELLITE & DOPPLER MAP */}
          <div className="overflow-hidden rounded-2xl border border-white/10 shadow-xl bg-navy-950">
            <SatelliteWeatherMap height="440px" />
          </div>

          {/* STATUS FOOTER */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] text-mist-400 px-1">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>
                {hi
                  ? `रीयल-टाइम डॉपलर और उच्च-रिज़ॉल्यूशन उपग्रह फ़ीड सक्रिय (${locationName})`
                  : `Real-time Doppler precipitation & high-resolution cloud cover active for ${locationName}`}
              </span>
            </div>
            <span className="text-mist-500">
              RainViewer Global Doppler · Esri World Imagery · MapLibre 3D
            </span>
          </div>
        </div>
      ) : (
        /* OFFICIAL IMD RADAR TAB WITH RELIABLE FALLBACK */
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
          <div className="flex items-center justify-between border-b border-white/10 bg-navy-950/60 px-3.5 py-2.5 text-[11px] uppercase tracking-wide text-mist-400">
            <div className="flex items-center gap-2">
              <Radio className="h-3.5 w-3.5 text-sky-400" />
              <span className="font-semibold text-mist-200">
                {radar.name} Station • MAX-Z Reflectivity
              </span>
              <span className="rounded bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-normal text-sky-300 border border-sky-400/20">
                {radar.region}
              </span>
            </div>
            <span className="text-mist-400">{hi ? "आधिकारिक IMD" : "Official IMD"}</span>
          </div>

          <div className="relative flex min-h-[320px] md:min-h-[380px] items-center justify-center p-4">
            {/* LOADING SPINNER */}
            {imdImgLoading && !imdImgError && (
              <div className="flex flex-col items-center gap-3 text-mist-400 py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-sky-400" />
                <p className="text-xs font-medium">
                  Connecting to IMD Gateway ({radar.name} Station)...
                </p>
              </div>
            )}

            {/* ERROR FALLBACK UI (SHOWN WHEN GOVERNMENT SERVER TIMES OUT OR BLOCKS CORS) */}
            {imdImgError ? (
              <div className="flex flex-col items-center text-center max-w-md p-6 rounded-2xl bg-navy-900/60 border border-amber-500/20 my-4 shadow-xl animate-in fade-in duration-300">
                <div className="h-11 w-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 shadow-lg shadow-amber-500/10">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold text-mist-100">
                  IMD Radar Gateway Temporarily Unreachable
                </h3>
                <p className="mt-1.5 text-xs text-mist-400 leading-relaxed">
                  The Indian Meteorological Department server (
                  <code className="text-[11px] text-amber-300 font-mono">mausam.imd.gov.in</code>
                  ) is currently timing out or restricting direct cross-origin browser requests.
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    onClick={() => setActiveTab("live")}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500 px-4 py-2 text-xs font-semibold text-navy-950 shadow-md shadow-sky-500/25 hover:bg-sky-400 transition"
                  >
                    <Satellite className="h-3.5 w-3.5" />
                    <span>Switch to Live Doppler Radar</span>
                  </button>
                  <a
                    href={radar.page}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-medium text-mist-300 hover:bg-white/10 hover:text-mist-100 transition"
                  >
                    <span>Open IMD Portal</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            ) : (
              /* IMD IMAGE RENDERED IF REACHABLE */
              <img
                src={radar.image}
                alt={`${radar.name} IMD weather radar`}
                className={`max-h-[350px] w-full object-contain transition-opacity duration-300 ${
                  imdImgLoading ? "opacity-0 pointer-events-none" : "opacity-100"
                }`}
                onLoad={() => setImdImgLoading(false)}
                onError={() => {
                  setImdImgLoading(false);
                  setImdImgError(true);
                }}
              />
            )}
          </div>

          <div className="border-t border-white/10 bg-navy-950/40 px-4 py-2.5 text-[10px] leading-relaxed text-mist-500 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <span>
              {hi
                ? "रडार इमेज IMD के आधिकारिक डॉपलर नेटवर्क से ली जाती है।"
                : "Radar observation imagery provided by IMD's official Doppler network."}
            </span>
            <a
              href={radar.page}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sky-400 hover:underline"
            >
              <span>{radar.name} Radar on IMD</span>
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
        </div>
      )}
    </section>
  );
}

export function MarineMapCard({ locationName }: { locationName: string }) {
  const { locale } = useLanguage();
  const hi = locale === "hi";

  return (
    <section className="glass glass-hover overflow-hidden rounded-3xl p-5 md:p-6 transition-all duration-300">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Waves className="h-4 w-4 text-cyan-400" aria-hidden />
            <h2 className="text-sm font-semibold text-mist-100">
              {hi ? "INCOIS समुद्री मानचित्र" : "INCOIS Marine Map"}
            </h2>
            <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          </div>
          <p className="mt-1 text-xs text-mist-400">
            {hi ? `ERDDAP / WMS • ${locationName}` : `ERDDAP / WMS • ${locationName}`}
          </p>
        </div>
        <a
          href="https://erddap.incois.gov.in/erddap/wms/incois_oceansat2_datasets/index.html"
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-mist-200 transition hover:bg-white/10 hover:text-cyan-300"
        >
          <span>{hi ? "INCOIS खोलें" : "Open INCOIS"}</span>
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
