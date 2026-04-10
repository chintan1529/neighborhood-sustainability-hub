import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Flame, FileText, Medal } from 'lucide-react';
import { formatPoints } from '@/lib/utils';

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
        key: 'totalPoints',
        label: 'Total Points',
        subtitle: 'Lifetime earnings',
        icon: Trophy,
        gradient: 'from-amber-500 to-orange-600',
        bgGlow: 'bg-amber-500/5',
        borderColor: 'border-amber-500/20 hover:border-amber-500/40',
        textColor: 'text-amber-600 dark:text-amber-400',
        format: (v: number) => formatPoints(v),
    },
    {
        key: 'currentStreak',
        label: 'Current Streak',
        subtitle: 'Days in a row',
        icon: Flame,
        gradient: 'from-red-500 to-rose-600',
        bgGlow: 'bg-red-500/5',
        borderColor: 'border-red-500/20 hover:border-red-500/40',
        textColor: 'text-red-600 dark:text-red-400',
        format: (v: number) => `${v}`,
        suffix: 'days',
    },
    {
        key: 'reportsCount',
        label: 'Reports Filed',
        subtitle: 'Waste items reported',
        icon: FileText,
        gradient: 'from-emerald-500 to-teal-600',
        bgGlow: 'bg-emerald-500/5',
        borderColor: 'border-emerald-500/20 hover:border-emerald-500/40',
        textColor: 'text-emerald-600 dark:text-emerald-400',
        format: (v: number) => String(v),
    },
    {
        key: 'rank',
        label: 'Neighborhood Rank',
        subtitle: 'On the leaderboard',
        icon: Medal,
        gradient: 'from-blue-500 to-indigo-600',
        bgGlow: 'bg-blue-500/5',
        borderColor: 'border-blue-500/20 hover:border-blue-500/40',
        textColor: 'text-blue-600 dark:text-blue-400',
        format: (v: number) => `#${v}`,
    },
] as const;

export function StatsCards({ stats }: StatsCardsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {statConfig.map((config, i) => {
                const Icon = config.icon;
                const value = stats[config.key];
                return (
                    <Card
                        key={config.key}
                        className={`relative overflow-hidden border ${config.borderColor} shadow-subtle hover:shadow-soft transition-all duration-300 hover:-translate-y-1 group`}
                    >
                        {/* Gradient glow behind the card */}
                        <div className={`absolute inset-0 ${config.bgGlow} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                        {/* Top gradient line */}
                        <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${config.gradient} opacity-60`} />

                        <CardContent className="relative pt-5 pb-4 px-5">
                            <div className="flex items-start justify-between mb-3">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    {config.label}
                                </p>
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                    <Icon className="h-5 w-5 text-white" />
                                </div>
                            </div>

                            <div className="flex items-baseline gap-1.5">
                                <span className="text-3xl font-extrabold tracking-tight number-pop" style={{ animationDelay: `${i * 0.15}s` }}>
                                    {config.format(value)}
                                </span>
                                {'suffix' in config && (
                                    <span className="text-sm font-medium text-muted-foreground">{config.suffix}</span>
                                )}
                            </div>

                            <p className="text-xs text-muted-foreground mt-1.5">{config.subtitle}</p>

                            {/* Subtle shimmer underline */}
                            <div className="mt-3 h-px shimmer-line rounded-full" />
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
