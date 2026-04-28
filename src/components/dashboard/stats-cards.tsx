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
          <Card key={config.key}>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {config.label}
                </p>
                <Icon className="h-4 w-4 text-muted-foreground/60" />
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
