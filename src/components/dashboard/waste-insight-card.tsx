'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Lightbulb, Loader2, TrendingUp, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    plastic: '🧴',
    organic: '🥬',
    paper: '📄',
    cardboard: '📦',
    metal: '🥫',
    glass: '🫙',
    mixed: '🗑️',
    hazardous: '⚠️',
};

export function WasteInsightCard() {
    const [insight, setInsight] = useState<InsightData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const fetchInsight = async () => {
        setLoading(true);
        setError(false);
        try {
            const res = await fetch('/api/waste-insights');
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
            <Card className="relative overflow-hidden border border-violet-200/60 dark:border-violet-800/40">
                <CardContent className="py-8 flex items-center justify-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
                    <span className="text-sm text-muted-foreground">Generating your AI insights...</span>
                </CardContent>
            </Card>
        );
    }

    if (error || !insight) {
        return null; // Silently fail — not critical
    }

    return (
        <Card className="relative overflow-hidden border border-violet-200/60 dark:border-violet-800/40 bg-gradient-to-br from-violet-50/50 via-purple-50/30 to-fuchsia-50/20 dark:from-violet-950/20 dark:via-purple-950/10 dark:to-fuchsia-950/5">
            {/* Decorative gradient accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-violet-400/10 rounded-full blur-3xl pointer-events-none" />

            <CardContent className="relative pt-5 pb-5 px-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                            <Sparkles className="h-4 w-4 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-sm flex items-center gap-2">
                                {insight.title}
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-violet-300 text-violet-600 dark:text-violet-400 dark:border-violet-700">
                                    AI Insight
                                </Badge>
                            </h3>
                            {insight.category_focus && (
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                    Focus: {CATEGORY_EMOJIS[insight.category_focus] || '📊'} {insight.category_focus}
                                </p>
                            )}
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchInsight} disabled={loading}>
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{insight.message}</p>

                {/* Trend mini-bar */}
                {insight.trend && (
                    <div className="flex items-center gap-2 mb-4 p-2.5 rounded-lg bg-background/60 border border-border/50">
                        <TrendingUp className="h-3.5 w-3.5 text-violet-500 flex-shrink-0" />
                        <div className="flex gap-1.5 flex-1 flex-wrap">
                            {Object.entries(insight.trend.breakdown).map(([cat, count]) => (
                                <div
                                    key={cat}
                                    className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-[10px] font-medium"
                                    title={`${cat}: ${count} reports`}
                                >
                                    <span>{CATEGORY_EMOJIS[cat] || '📊'}</span>
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
                        <div key={i} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-background/60 transition-colors">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Lightbulb className="h-2.5 w-2.5 text-white" />
                            </div>
                            <p className="text-xs leading-relaxed text-foreground/80">{tip}</p>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
