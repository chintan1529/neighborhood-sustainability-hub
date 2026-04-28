"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Leaf,
  TreePine,
  Droplets,
  Wind,
  Award,
  TrendingUp,
  Recycle,
  Target,
} from "lucide-react";

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
  { target: 10, label: "Getting Started", icon: "🌱" },
  { target: 25, label: "Eco Warrior", icon: "♻️" },
  { target: 50, label: "Green Champion", icon: "🌿" },
  { target: 100, label: "Sustainability Hero", icon: "🏆" },
  { target: 250, label: "Planet Guardian", icon: "🌍" },
];

const CATEGORY_COLORS: Record<string, string> = {
  plastic: "#EF4444",
  cardboard: "#F59E0B",
  paper: "#10B981",
  metal: "#6B7280",
  glass: "#3B82F6",
  organic: "#84CC16",
  mixed: "#8B5CF6",
  hazardous: "#DC2626",
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
  const totalCategoryReports =
    categoryBreakdown.reduce((s, c) => s + c.count, 0) || 1;

  // Build CSS conic gradient for donut chart
  let conicParts: string[] = [];
  let cumulative = 0;
  categoryBreakdown.forEach((cat) => {
    const pct = (cat.count / totalCategoryReports) * 100;
    const color = CATEGORY_COLORS[cat.category] || "#6B7280";
    conicParts.push(`${color} ${cumulative}% ${cumulative + pct}%`);
    cumulative += pct;
  });
  const conicGradient =
    conicParts.length > 0 ? conicParts.join(", ") : "#e5e7eb 0% 100%";

  const impactStats = [
    {
      label: "Waste Diverted",
      value: `${totalWeightKg.toFixed(1)} kg`,
      icon: Recycle,
    },
    {
      label: "CO₂ Saved",
      value: `${co2SavedKg.toFixed(1)} kg`,
      icon: Wind,
    },
    {
      label: "Trees Equivalent",
      value: treesEquivalent.toFixed(1),
      icon: TreePine,
    },
    {
      label: "Water Saved",
      value: `${waterSavedL.toFixed(0)} L`,
      icon: Droplets,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Impact Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {impactStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {stat.label}
                  </p>
                  <Icon className="h-4 w-4 text-muted-foreground/60" />
                </div>
                <div className="text-2xl font-semibold tracking-tight tabular-nums">
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Category Breakdown — Donut Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Recycle className="h-4 w-4 text-muted-foreground" />
              Waste Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              {/* Donut chart */}
              <div
                className="w-28 h-28 rounded-full flex-shrink-0 relative"
                style={{
                  background: `conic-gradient(${conicGradient})`,
                }}
              >
                <div className="absolute inset-3 rounded-full bg-card flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-lg font-semibold tabular-nums">
                      {totalCategoryReports}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      reports
                    </div>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="flex-1 space-y-1.5">
                {categoryBreakdown.map((cat) => (
                  <div
                    key={cat.category}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor:
                            CATEGORY_COLORS[cat.category] || "#6B7280",
                        }}
                      />
                      <span className="capitalize text-muted-foreground text-xs">
                        {cat.category}
                      </span>
                    </div>
                    <span className="font-medium text-xs tabular-nums">{cat.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Monthly Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-36">
              {monthlyActivity.map((month) => {
                const height = (month.count / maxMonthly) * 100;
                return (
                  <div
                    key={month.month}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
                      {month.count}
                    </span>
                    <div
                      className="w-full rounded-t bg-foreground/15 hover:bg-foreground/25 transition-colors duration-150 min-h-[4px]"
                      style={{ height: `${Math.max(height, 4)}%` }}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {month.month}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Milestone Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              Milestone Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {MILESTONES.map((milestone) => {
              const achieved = totalReports >= milestone.target;
              const progress = achieved
                ? 100
                : Math.min((totalReports / milestone.target) * 100, 100);
              return (
                <div key={milestone.target} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span>{milestone.icon}</span>
                      <span
                        className={
                          achieved ? "font-medium" : "text-muted-foreground"
                        }
                      >
                        {milestone.label}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {totalReports}/{milestone.target}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        achieved ? "bg-emerald-500" : "bg-foreground/20"
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Leaf className="h-4 w-4 text-muted-foreground" />
              SDG Contribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">
                    SDG 11.6 — Sustainable Cities
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Reduce environmental impact of cities
                  </div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-semibold">
                  11
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-foreground/20 transition-all duration-500"
                  style={{ width: `${Math.min(totalReports * 2, 100)}%` }}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">
                    SDG 12.5 — Responsible Consumption
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Reduce waste through recycling &amp; reuse
                  </div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-semibold">
                  12
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-foreground/20 transition-all duration-500"
                  style={{ width: `${Math.min(totalWeightKg * 3, 100)}%` }}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Your Impact Score</span>
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold text-lg tabular-nums">
                    {Math.round(
                      totalPoints * 0.1 + totalReports * 5 + currentStreak * 2,
                    )}
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
