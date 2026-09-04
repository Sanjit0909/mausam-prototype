import { Activity, Briefcase, Calendar, Car, Heart, Sprout, Users, Waves } from "lucide-react";
import { WhyThis } from "@/components/common/WhyThis";
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

const INTEREST_LABELS: Record<string, string> = {
  outdoor_fitness: "Outdoor Fitness",
  travel: "Traveler",
  family: "Parent / Family",
  agriculture: "Farmer / Agriculture",
  marine_beach: "Fisherman / Marine",
  commuting: "Commuter",
  events: "Event Planner",
  health: "Health-conscious",
  elderly: "Elderly / Vulnerable",
};

export function RecommendationCard({ card }: { card: RecommendationCardType }) {
  const Icon = ICONS[card.icon] ?? Activity;

  return (
    <div className="glass glass-hover rounded-3xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-mist-400">
          {INTEREST_LABELS[card.interest] ?? card.interest}
        </span>
        <div className="rounded-lg bg-amber-500/10 p-1.5">
          <Icon className="h-4 w-4 text-amber-400" />
        </div>
      </div>
      <div>
        <h4 className="font-medium text-mist-100">{card.title}</h4>
        <p className="mt-1 text-sm text-mist-400">{card.description}</p>
      </div>
      {card.reason && (
        <div className="border-t border-white/5 pt-2">
          <WhyThis reason={card.reason} label={card.label} />
        </div>
      )}
    </div>
  );
}
