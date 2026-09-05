import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Flame, FileText, Medal } from "lucide-react";
import { formatPoints } from "@/lib/utils";

interface StatsCardsProps {
  stats: {
    totalPoints: number;
    currentStreak: number;
    reportsCount: number;
    rank: number;
  };
}

const statConfig = [
  {
    key: "totalPoints",
    label: "Total Points",
    icon: Trophy,
    format: (v: number) => formatPoints(v),
  },
  {
    key: "currentStreak",
    label: "Current Streak",
    icon: Flame,
    format: (v: number) => `${v}`,
    suffix: "days",
  },
  {
    key: "reportsCount",
    label: "Reports Filed",
    icon: FileText,
    format: (v: number) => String(v),
  },
  {
    key: "rank",
    label: "Neighborhood Rank",
    icon: Medal,
    format: (v: number) => `#${v}`,
  },
] as const;

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statConfig.map((config) => {
        const Icon = config.icon;
        const value = stats[config.key];
        return (
          <Card key={config.key} className="card-hover relative overflow-hidden">
            {/* Accent top border */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-accent/30 via-accent to-accent/30" />
            <CardContent className="pt-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {config.label}
                </p>
                <div className="w-8 h-8 rounded-lg bg-accent-soft flex items-center justify-center">
                  <Icon className="h-4 w-4 text-accent" />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-semibold tracking-tight tabular-nums">
                  {config.format(value)}
                </span>
                {"suffix" in config && (
                  <span className="text-sm text-muted-foreground">
                    {config.suffix}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
