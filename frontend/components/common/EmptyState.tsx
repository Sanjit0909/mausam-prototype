import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }: EmptyStateProps) {
  return (
    <div className="glass rounded-3xl p-10 flex flex-col items-center text-center gap-3">
      <div className="rounded-full bg-white/[0.06] p-3">
        <Icon className="h-6 w-6 text-mist-400" />
      </div>
      <p className="font-medium text-mist-100">{title}</p>
      {description && <p className="text-sm text-mist-400 max-w-xs">{description}</p>}
      {action}
    </div>
  );
}
