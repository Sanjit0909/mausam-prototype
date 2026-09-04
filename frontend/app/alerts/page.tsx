"use client";

import { ShieldCheck } from "lucide-react";
import { AlertCard } from "@/components/alerts/AlertCard";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { GridSkeleton } from "@/components/common/LoadingSkeleton";
import { useLocation } from "@/context/LocationContext";
import { useHomeData } from "@/hooks/useHomeData";
import { usePreferences } from "@/context/PreferencesContext";
import { locationLabel } from "@/lib/utils/format";
import { useLanguage } from "@/context/LanguageContext";

export default function AlertsPage() {
  const { location } = useLocation();
  const { preferences } = usePreferences();
  const { t } = useLanguage();
  const { alerts, loading, error, refresh } = useHomeData(location.lat, location.lon, locationLabel(location), preferences.interests);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <h1 className="text-xl font-semibold text-mist-100">{t("alerts.title")}</h1>
      <p className="mt-1 text-sm text-mist-400">{t("alerts.subtitle", { name: location.name })}</p>

      <div className="mt-6 space-y-4">
        {loading && <GridSkeleton count={3} />}
        {!loading && error && <ErrorState message={error} onRetry={refresh} />}
        {!loading && !error && alerts && alerts.alerts.length === 0 && (
          <EmptyState
            icon={ShieldCheck}
            title={t("alerts.emptyTitle")}
            description={t("alerts.emptyDesc", { name: location.name })}
          />
        )}
        {!loading &&
          !error &&
          alerts?.alerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)}
      </div>

      <p className="mt-8 text-xs text-mist-500">
        {t("alerts.disclaimer")}
      </p>
    </div>
  );
}
