"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Waves } from "lucide-react";
import { SourceBadge } from "@/components/common/SourceBadge";
import { useLanguage } from "@/context/LanguageContext";
import { formatTime, providerDisplayName, windDirectionLabel } from "@/lib/utils/format";
import type { MarineResponse, TideEvent } from "@/lib/types";

function fmtM(v: number | null | undefined): string {
  return v === null || v === undefined ? "--" : `${v.toFixed(1)} m`;
}
function fmtS(v: number | null | undefined): string {
  return v === null || v === undefined ? "--" : `${v.toFixed(0)} s`;
}
function fmtDeg(v: number | null | undefined, locale: string): string {
  return v === null || v === undefined ? "--" : windDirectionLabel(v, locale);
}

function nextTide(tides: TideEvent[], type: "high" | "low"): TideEvent | undefined {
  return tides.find((t) => t.type === type);
}

export function MarineCard({ data }: { data: MarineResponse }) {
  const { t, locale } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (expanded && detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [expanded]);

  if (!data.available || !data.current) {
    return null;
  }

  const { current } = data;
  const high = nextTide(data.tides, "high");
  const low = nextTide(data.tides, "low");
  const waveLabel = data.wave_source || providerDisplayName(data.source);
  const tideLabel = data.tide_source || (data.is_demo_tide ? t("home.sampleData") : null);

  return (
    <div className="glass glass-hover flex flex-col gap-3 rounded-3xl p-5">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="flex items-center gap-2">
          <Waves className="h-4 w-4 text-sky-400" />
          <span className="text-xs font-medium uppercase tracking-wide text-mist-400">{t("home.marine")}</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 text-mist-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      <button
        type="button"
        className="grid w-full grid-cols-2 gap-3 text-left text-sm"
        onClick={() => setExpanded(true)}
        aria-expanded={expanded}
        aria-controls={panelId}
      >
        <div>
          <p className="text-2xl font-semibold text-mist-100">{fmtM(current.wave_height).replace(" m", "")}
            <span className="text-base font-normal text-mist-400"> m</span>
          </p>
          <p className="text-[11px] text-mist-400">{t("home.waveHeight")}</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-mist-100">
            {current.wave_period != null ? current.wave_period.toFixed(0) : "--"}
            <span className="text-base font-normal text-mist-400"> s</span>
          </p>
          <p className="text-[11px] text-mist-400">{t("home.wavePeriod")}</p>
        </div>
      </button>

      <SourceBadge provider={waveLabel} kind={t("home.waveSwell")} official={false} />

      {expanded && (
        <div id={panelId} ref={detailRef} className="animate-fade-in-up space-y-4 border-t border-white/5 pt-3">
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-mist-400">{t("home.marineWaves")}</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-mist-300 sm:grid-cols-3">
              <div>
                <p className="text-mist-100">{fmtM(current.wave_height)}</p>
                <p>{t("home.waveHeight")}</p>
              </div>
              <div>
                <p className="text-mist-100">{fmtS(current.wave_period)}</p>
                <p>{t("home.wavePeriod")}</p>
              </div>
              <div>
                <p className="text-mist-100">{fmtDeg(current.wave_direction, locale)}</p>
                <p>{t("home.waveDirection")}</p>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-mist-400">{t("home.marineSwell")}</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-mist-300 sm:grid-cols-3">
              <div>
                <p className="text-mist-100">{fmtM(current.swell_wave_height)}</p>
                <p>{t("home.swellHeight")}</p>
              </div>
              <div>
                <p className="text-mist-100">{fmtS(current.swell_wave_period)}</p>
                <p>{t("home.swellPeriod")}</p>
              </div>
              <div>
                <p className="text-mist-100">{fmtDeg(current.swell_wave_direction, locale)}</p>
                <p>{t("home.swellDirection")}</p>
              </div>
            </div>
          </div>

          {(current.ocean_current_velocity != null ||
            current.sea_surface_temperature != null ||
            current.sea_level_height_msl != null) && (
            <div>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-mist-400">
                {t("home.marineOther")}
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs text-mist-300 sm:grid-cols-3">
                {current.ocean_current_velocity != null && (
                  <div>
                    <p className="text-mist-100">{current.ocean_current_velocity.toFixed(2)} m/s</p>
                    <p>{t("home.oceanCurrent")}</p>
                  </div>
                )}
                {current.ocean_current_direction != null && (
                  <div>
                    <p className="text-mist-100">{fmtDeg(current.ocean_current_direction, locale)}</p>
                    <p>{t("home.currentDirection")}</p>
                  </div>
                )}
                {current.sea_surface_temperature != null && (
                  <div>
                    <p className="text-mist-100">{current.sea_surface_temperature.toFixed(1)}°C</p>
                    <p>{t("home.sst")}</p>
                  </div>
                )}
                {current.sea_level_height_msl != null && (
                  <div>
                    <p className="text-mist-100">{current.sea_level_height_msl.toFixed(2)} m</p>
                    <p>{t("home.seaLevel")}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-mist-400">{t("home.tidesToday")}</p>
              {tideLabel ? (
                <SourceBadge provider={tideLabel} kind={t("home.realTide")} official={false} />
              ) : (
                <span className="text-[10px] text-mist-500">{t("home.tidesUnavailable")}</span>
              )}
            </div>
            {data.tides.length > 0 ? (
              <div className="space-y-2 text-xs text-mist-300">
                {high && (
                  <p>
                    {t("home.nextHighTide")}:{" "}
                    {formatTime(high.time.length <= 5 ? `1970-01-01T${high.time}` : high.time, undefined, locale)}
                    {high.height != null ? ` · ${high.height.toFixed(2)} m` : ""}
                  </p>
                )}
                {low && (
                  <p>
                    {t("home.nextLowTide")}:{" "}
                    {formatTime(low.time.length <= 5 ? `1970-01-01T${low.time}` : low.time, undefined, locale)}
                    {low.height != null ? ` · ${low.height.toFixed(2)} m` : ""}
                  </p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {data.tides.map((tide, i) => (
                    <span key={i}>
                      {tide.type === "high" ? t("home.tideHigh") : t("home.tideLow")}{" "}
                      {formatTime(tide.time.length <= 5 ? `1970-01-01T${tide.time}` : tide.time, undefined, locale)}
                      {tide.height != null ? ` (${tide.height.toFixed(2)} m)` : ""}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-mist-500">{t("home.tidesUnavailable")}</p>
            )}
          </div>

          {data.incois_status && data.incois_status !== "available" && (
            <p className="text-[10px] text-mist-500">{t("home.incoisUnavailable")}</p>
          )}
          <p className="text-[10px] text-mist-500">{t("home.marineModelNote")}</p>
        </div>
      )}
    </div>
  );
}
