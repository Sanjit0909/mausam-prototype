"use client";

import { Activity, Briefcase, Calendar, Car, Heart, Sprout, Users, Waves } from "lucide-react";
import { WhyThis } from "@/components/common/WhyThis";
import { useLanguage } from "@/context/LanguageContext";
import { localizeAlertDescription, localizeAlertTitle } from "@/lib/i18n/localizeAlert";
import type { TranslationKey } from "@/lib/i18n/translations";
import type { RecommendationCard as RecommendationCardType } from "@/lib/types";

const ICONS: Record<string, typeof Activity> = {
  activity: Activity,
  briefcase: Briefcase,
  users: Users,
  sprout: Sprout,
  waves: Waves,
  car: Car,
  calendar: Calendar,
  heart: Heart,
};

const INTEREST_LABEL_KEYS: Record<string, TranslationKey> = {
  outdoor_fitness: "interest.outdoor_fitness",
  travel: "interest.travel",
  family: "interest.family",
  agriculture: "interest.agriculture",
  marine_beach: "interest.marine_beach",
  commuting: "interest.commuting",
  events: "interest.events",
  health: "interest.health",
  elderly: "interest.elderly",
};

export function RecommendationCard({ card }: { card: RecommendationCardType }) {
  const { t, locale } = useLanguage();
  const Icon = ICONS[card.icon] ?? Activity;
  const labelKey = INTEREST_LABEL_KEYS[card.interest];
  const title = localizeAlertTitle(card.title, locale);
  const description = localizeAlertDescription(card.description, locale);

  return (
    <div className="glass group relative flex flex-col justify-between rounded-3xl p-5 border border-white/10 transition-all duration-300 hover:-translate-y-1 hover:border-amber-400/30 hover:shadow-[0_12px_35px_rgba(0,0,0,0.4),0_0_20px_rgba(251,191,36,0.06)]">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-white/5 border border-white/5 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-mist-400 transition-colors group-hover:text-mist-200">
            {labelKey ? t(labelKey) : card.interest}
          </span>
          <div className="rounded-xl bg-amber-500/10 p-2 transition-all duration-300 group-hover:bg-amber-500/20 group-hover:scale-110">
            <Icon className="h-4 w-4 text-amber-400" />
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-mist-100 transition-colors group-hover:text-white">{title}</h4>
          <p className="mt-1 text-sm text-mist-400 leading-relaxed">{description}</p>
        </div>
      </div>
      {card.reason && (
        <div className="border-t border-white/5 pt-2">
          <WhyThis reason={card.reason} label={card.label} />
        </div>
      )}
    </div>
  );
}
