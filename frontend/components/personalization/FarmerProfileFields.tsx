"use client";

import { CROP_OPTIONS, CROP_STAGE_OPTIONS, IRRIGATION_OPTIONS } from "@/lib/personalization/crops";
import { useLanguage } from "@/context/LanguageContext";
import type { TranslationKey } from "@/lib/i18n/translations";
import type { FarmerProfile } from "@/lib/types";

interface FarmerProfileFieldsProps {
  value: FarmerProfile;
  onChange: (next: FarmerProfile) => void;
  compact?: boolean;
}

export function FarmerProfileFields({ value, onChange, compact = false }: FarmerProfileFieldsProps) {
  const { t } = useLanguage();

  return (
    <div className={`grid gap-3 ${compact ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2"}`}>
      <label className="block text-xs text-mist-400">
        {t("crop.label")}
        <select
          value={value.crop}
          onChange={(e) => onChange({ ...value, crop: e.target.value })}
          className="mt-1 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-mist-100 outline-none focus:border-sky-400/50"
        >
          {CROP_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} className="bg-navy-950">
              {t(o.labelKey as TranslationKey)}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs text-mist-400">
        {t("crop.stageLabel")}
        <select
          value={value.crop_stage}
          onChange={(e) => onChange({ ...value, crop_stage: e.target.value })}
          className="mt-1 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-mist-100 outline-none focus:border-sky-400/50"
        >
          {CROP_STAGE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} className="bg-navy-950">
              {t(o.labelKey as TranslationKey)}
            </option>
          ))}
        </select>
      </label>
      {!compact && (
        <>
          <label className="block text-xs text-mist-400">
            {t("crop.irrigationLabel")}
            <select
              value={value.irrigation_type ?? ""}
              onChange={(e) =>
                onChange({ ...value, irrigation_type: e.target.value || null })
              }
              className="mt-1 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-mist-100 outline-none focus:border-sky-400/50"
            >
              <option value="" className="bg-navy-950">
                {t("crop.optional")}
              </option>
              {IRRIGATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="bg-navy-950">
                  {t(o.labelKey as TranslationKey)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-mist-400">
            {t("crop.fieldSizeLabel")}
            <input
              type="number"
              min={0}
              step={0.1}
              value={value.field_size_ha ?? ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  field_size_ha: e.target.value === "" ? null : Number(e.target.value),
                })
              }
              placeholder={t("crop.fieldSizePlaceholder")}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-mist-100 placeholder:text-mist-500 outline-none focus:border-sky-400/50"
            />
          </label>
          <label className="block text-xs text-mist-400 sm:col-span-2">
            {t("crop.sowingLabel")}
            <input
              type="date"
              value={value.sowing_date ?? ""}
              onChange={(e) => onChange({ ...value, sowing_date: e.target.value || null })}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-mist-100 outline-none focus:border-sky-400/50"
            />
          </label>
        </>
      )}
    </div>
  );
}
