import { CalendarPlus, Stethoscope, CalendarCheck, Phone } from "lucide-react";
import type { QuickAction } from "@/types/ai-assistant";

const ICON_MAP: Record<string, React.ElementType> = {
  CalendarPlus,
  Stethoscope,
  CalendarCheck,
  Phone,
};

type QuickActionCardsProps = {
  actions: QuickAction[];
  onSelect: (prompt: string) => void;
};

export function QuickActionCards({ actions, onSelect }: QuickActionCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {actions.map((action) => {
        const Icon = ICON_MAP[action.icon] ?? CalendarPlus;
        return (
          <button
            key={action.id}
            onClick={() => onSelect(action.prompt)}
            className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-5 text-center shadow-soft transition-all hover:border-primary/30 hover:bg-primary/5 hover:shadow-elevated"
          >
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-soft transition-transform group-hover:scale-110">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">{action.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{action.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
