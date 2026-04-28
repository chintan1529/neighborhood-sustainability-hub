"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Lightbulb,

  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface InsightData {
  title: string;
  message: string;
  tips: string[];
  category_focus: string | null;
  trend: {
    topCategory: string;
    topCategoryCount: number;
    totalReports: number;
    breakdown: Record<string, number>;
  } | null;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  plastic: "🧴",
  organic: "🥬",
  paper: "📄",
  cardboard: "📦",
  metal: "🥫",
  glass: "🫙",
  mixed: "🗑️",
  hazardous: "⚠️",
};

export function WasteInsightCard() {
  const [insight, setInsight] = useState<InsightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchInsight = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/waste-insights");
      const data = await res.json();
      if (data.success) {
        setInsight(data.insight);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsight();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="space-y-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !insight) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-3">
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <div>
            <CardTitle className="flex items-center gap-2">
              {insight.title}
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                AI
              </Badge>
            </CardTitle>
            {insight.category_focus && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Focus: {CATEGORY_EMOJIS[insight.category_focus] || "📊"}{" "}
                {insight.category_focus}
              </p>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={fetchInsight}
          disabled={loading}
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          {insight.message}
        </p>

        {/* Trend mini-bar */}
        {insight.trend && (
          <div className="flex items-center gap-2 mb-4 p-2.5 rounded-lg bg-muted/50 border border-border">
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <div className="flex gap-1.5 flex-1 flex-wrap">
              {Object.entries(insight.trend.breakdown).map(([cat, count]) => (
                <div
                  key={cat}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-background text-[11px] font-medium"
                  title={`${cat}: ${count} reports`}
                >
                  <span>{CATEGORY_EMOJIS[cat] || "📊"}</span>
                  <span className="capitalize">{cat}</span>
                  <span className="text-muted-foreground">({count})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="space-y-2">
          {insight.tips.map((tip, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition-colors duration-150"
            >
              <Lightbulb className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                {tip}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
