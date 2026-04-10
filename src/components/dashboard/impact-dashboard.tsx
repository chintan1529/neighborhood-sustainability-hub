'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Leaf,
    TreePine,
    Droplets,
    Wind,
    Award,
    TrendingUp,
    Recycle,
    Target,
} from 'lucide-react';

// Estimated kg of waste per report by category
const WEIGHT_PER_REPORT: Record<string, number> = {
    plastic: 0.5,
    cardboard: 1.2,
    paper: 0.3,
    metal: 0.8,
    glass: 1.0,
    organic: 0.6,
    mixed: 0.7,
    hazardous: 0.4,
};

const CO2_PER_KG_DIVERTED = 2.5;
const WATER_PER_KG_DIVERTED = 15;
const TREES_PER_100KG = 1;

interface CategoryData {
    category: string;
    count: number;
}

interface MonthlyData {
    month: string;
    count: number;
}

interface ImpactDashboardProps {
    totalReports: number;
    totalPoints: number;
    currentStreak: number;
    categoryBreakdown: CategoryData[];
    monthlyActivity: MonthlyData[];
}

const MILESTONES = [
    { target: 10, label: 'Getting Started', icon: '🌱' },
    { target: 25, label: 'Eco Warrior', icon: '♻️' },
    { target: 50, label: 'Green Champion', icon: '🌿' },
    { target: 100, label: 'Sustainability Hero', icon: '🏆' },
    { target: 250, label: 'Planet Guardian', icon: '🌍' },
];

const CATEGORY_COLORS: Record<string, string> = {
    plastic: '#EF4444',
    cardboard: '#F59E0B',
    paper: '#10B981',
    metal: '#6B7280',
    glass: '#3B82F6',
    organic: '#84CC16',
    mixed: '#8B5CF6',
    hazardous: '#DC2626',
};

export function ImpactDashboard({
    totalReports,
    totalPoints,
    currentStreak,
    categoryBreakdown,
    monthlyActivity,
}: ImpactDashboardProps) {
    // Calculate impact metrics
    const totalWeightKg = categoryBreakdown.reduce((sum, cat) => {
        return sum + cat.count * (WEIGHT_PER_REPORT[cat.category] || 0.7);
    }, 0);

    const co2SavedKg = totalWeightKg * CO2_PER_KG_DIVERTED;
    const waterSavedL = totalWeightKg * WATER_PER_KG_DIVERTED;
    const treesEquivalent = (totalWeightKg / 100) * TREES_PER_100KG;


    // Max for monthly chart
    const maxMonthly = Math.max(...monthlyActivity.map((m) => m.count), 1);

    // Total for pie chart
    const totalCategoryReports = categoryBreakdown.reduce((s, c) => s + c.count, 0) || 1;

    // Build CSS conic gradient for donut chart
    let conicParts: string[] = [];
    let cumulative = 0;
    categoryBreakdown.forEach((cat) => {
        const pct = (cat.count / totalCategoryReports) * 100;
        const color = CATEGORY_COLORS[cat.category] || '#6B7280';
        conicParts.push(`${color} ${cumulative}% ${cumulative + pct}%`);
        cumulative += pct;
    });
    const conicGradient = conicParts.length > 0 ? conicParts.join(', ') : '#e5e7eb 0% 100%';

    const impactStats = [
        {
            label: 'Waste Diverted',
            value: `${totalWeightKg.toFixed(1)} kg`,
            icon: Recycle,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50 dark:bg-emerald-950/40',
            accent: 'border-l-emerald-500',
        },
        {
            label: 'CO₂ Saved',
            value: `${co2SavedKg.toFixed(1)} kg`,
            icon: Wind,
            color: 'text-blue-600',
            bg: 'bg-blue-50 dark:bg-blue-950/40',
            accent: 'border-l-blue-500',
        },
        {
            label: 'Trees Equivalent',
            value: treesEquivalent.toFixed(1),
            icon: TreePine,
            color: 'text-green-600',
            bg: 'bg-green-50 dark:bg-green-950/40',
            accent: 'border-l-green-500',
        },
        {
            label: 'Water Saved',
            value: `${waterSavedL.toFixed(0)} L`,
            icon: Droplets,
            color: 'text-cyan-600',
            bg: 'bg-cyan-50 dark:bg-cyan-950/40',
            accent: 'border-l-cyan-500',
        },
    ];

    return (
        <div className="space-y-6">
            {/* Impact Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {impactStats.map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <Card
                            key={stat.label}
                            className={`border-l-4 ${stat.accent} shadow-subtle hover:shadow-soft transition-all duration-300 hover:-translate-y-0.5 animate-fadeIn`}
                            style={{ animationDelay: `${i * 100}ms` }}
                        >
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    {stat.label}
                                </CardTitle>
                                <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center`}>
                                    <Icon className={`h-4 w-4 ${stat.color}`} />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold tracking-tight">{stat.value}</div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Category Breakdown — Donut Chart */}
                <Card className="shadow-subtle hover:shadow-soft transition-all duration-300">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <Recycle className="h-4 w-4 text-emerald-600" />
                            Waste Categories
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-6">
                            {/* Donut chart */}
                            <div
                                className="w-32 h-32 rounded-full flex-shrink-0 relative"
                                style={{
                                    background: `conic-gradient(${conicGradient})`,
                                }}
                            >
                                <div className="absolute inset-3 rounded-full bg-card flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="text-lg font-bold">{totalCategoryReports}</div>
                                        <div className="text-[10px] text-muted-foreground">reports</div>
                                    </div>
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="flex-1 space-y-1.5">
                                {categoryBreakdown.map((cat) => (
                                    <div key={cat.category} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-2.5 h-2.5 rounded-full"
                                                style={{ backgroundColor: CATEGORY_COLORS[cat.category] || '#6B7280' }}
                                            />
                                            <span className="capitalize text-muted-foreground">{cat.category}</span>
                                        </div>
                                        <span className="font-medium">{cat.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Monthly Activity Chart */}
                <Card className="shadow-subtle hover:shadow-soft transition-all duration-300">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-blue-600" />
                            Monthly Activity
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end gap-2 h-36">
                            {monthlyActivity.map((month) => {
                                const height = (month.count / maxMonthly) * 100;
                                return (
                                    <div key={month.month} className="flex-1 flex flex-col items-center gap-1">
                                        <span className="text-[10px] font-medium text-muted-foreground">
                                            {month.count}
                                        </span>
                                        <div
                                            className="w-full rounded-t-md bg-emerald-500/80 hover:bg-emerald-500 transition-colors duration-300 min-h-[4px]"
                                            style={{ height: `${Math.max(height, 4)}%` }}
                                        />
                                        <span className="text-[10px] text-muted-foreground">{month.month}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Milestone Progress */}
                <Card className="shadow-subtle hover:shadow-soft transition-all duration-300">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <Target className="h-4 w-4 text-amber-600" />
                            Milestone Progress
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {MILESTONES.map((milestone) => {
                            const achieved = totalReports >= milestone.target;
                            const progress = achieved ? 100 : Math.min((totalReports / milestone.target) * 100, 100);
                            return (
                                <div key={milestone.target} className="space-y-1.5">
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <span>{milestone.icon}</span>
                                            <span className={achieved ? 'font-medium' : 'text-muted-foreground'}>
                                                {milestone.label}
                                            </span>
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            {totalReports}/{milestone.target}
                                        </span>
                                    </div>
                                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${achieved ? 'bg-emerald-500' : 'bg-amber-500'
                                                }`}
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>

                {/* SDG Contribution */}
                <Card className="shadow-subtle hover:shadow-soft transition-all duration-300">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <Leaf className="h-4 w-4 text-green-600" />
                            SDG Contribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-medium text-sm">SDG 11.6 — Sustainable Cities</div>
                                    <div className="text-xs text-muted-foreground">
                                        Reduce environmental impact of cities
                                    </div>
                                </div>
                                <div className="w-10 h-10 rounded-lg bg-amber-500 text-white flex items-center justify-center text-xs font-bold">
                                    11
                                </div>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-amber-500 transition-all duration-500"
                                    style={{ width: `${Math.min(totalReports * 2, 100)}%` }}
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-medium text-sm">SDG 12.5 — Responsible Consumption</div>
                                    <div className="text-xs text-muted-foreground">
                                        Reduce waste through recycling & reuse
                                    </div>
                                </div>
                                <div className="w-10 h-10 rounded-lg bg-orange-600 text-white flex items-center justify-center text-xs font-bold">
                                    12
                                </div>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-orange-600 transition-all duration-500"
                                    style={{ width: `${Math.min(totalWeightKg * 3, 100)}%` }}
                                />
                            </div>
                        </div>

                        <div className="pt-2 border-t">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Your Impact Score</span>
                                <div className="flex items-center gap-2">
                                    <Award className="h-4 w-4 text-amber-500" />
                                    <span className="font-bold text-lg">
                                        {Math.round(totalPoints * 0.1 + totalReports * 5 + currentStreak * 2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
