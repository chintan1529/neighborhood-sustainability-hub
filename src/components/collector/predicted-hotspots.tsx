"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BrainCircuit,
  CheckCircle2,
  Clock,
  MapPin,
  Target,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { WASTE_CATEGORIES } from "@/lib/constants";

interface Prediction {
  id: string;
  geohash: string | null;
  predicted_category: string | null;
  base_confidence: number;
  final_weight: number;
  latitude: number;
  longitude: number;
  target_date: string;
  status: string;
  metadata: {
    reason?: string;
    source?: string;
    confidence_threshold?: number;
  } | null;
}

interface PredictionMetrics {
  active: number;
  verified: number;
  missed: number;
  accuracy: number | null;
  calibrationMultiplier: number;
  threshold: number;
}

export function PredictedHotspots() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [metrics, setMetrics] = useState<PredictionMetrics | null>(null);
  const [feedbackStatement, setFeedbackStatement] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchPredictions() {
      try {
        const response = await fetch(
          "/api/predicted-hotspots?status=active&limit=3",
        );
        const data = await response.json();

        if (!mounted || !data.success) {
          return;
        }

        setPredictions(data.predictions || []);
        setMetrics(data.metrics || null);
        setFeedbackStatement(data.feedbackStatement || "");
      } catch (error) {
        console.error("Failed to fetch predicted hotspots", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchPredictions();
    const interval = window.setInterval(fetchPredictions, 30000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  if (loading || predictions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <BrainCircuit className="h-5 w-5 text-violet-500" />
        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
          Predicted Hotspots
        </h3>
      </div>

      {metrics && (
        <div className="grid gap-3 md:grid-cols-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">Active</div>
              <div className="text-2xl font-bold">{metrics.active}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">Verified</div>
              <div className="text-2xl font-bold">{metrics.verified}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">Missed</div>
              <div className="text-2xl font-bold">{metrics.missed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">Accuracy</div>
              <div className="text-2xl font-bold">
                {metrics.accuracy !== null ? `${metrics.accuracy}%` : "N/A"}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <p className="text-xs text-muted-foreground px-1">{feedbackStatement}</p>

      <div className="grid gap-4 md:grid-cols-3">
        {predictions.map((prediction) => {
          const wasteType = prediction.predicted_category || "mixed";
          const category =
            WASTE_CATEGORIES[wasteType as keyof typeof WASTE_CATEGORIES];
          return (
            <Card
              key={prediction.id}
              className="relative overflow-hidden border-violet-100 dark:border-violet-900/30 bg-gradient-to-br from-white to-violet-50/30 dark:from-slate-950 dark:to-violet-950/10"
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start gap-2">
                  <Badge
                    variant="secondary"
                    className="bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 border-none"
                  >
                    {Math.round(prediction.base_confidence * 100)}% confidence
                  </Badge>
                  <TrendingUp className="h-4 w-4 text-violet-400" />
                </div>
                <CardTitle className="text-base mt-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  {category?.label || wasteType} hotspot
                </CardTitle>
                <CardDescription className="text-xs line-clamp-2 italic">
                  {prediction.metadata?.reason ||
                    "Deterministic hotspot scoring found repeat waste activity in this area."}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Target className="h-3.5 w-3.5" />
                    weight {prediction.final_weight.toFixed(2)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    due {new Date(prediction.target_date).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    geohash {prediction.geohash || "n/a"}
                  </span>
                  <span className="capitalize text-violet-600">
                    {prediction.metadata?.source || "deterministic"}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {metrics && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground px-1">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            Closed-loop verification enabled
          </span>
          <span className="flex items-center gap-1">
            <XCircle className="h-3.5 w-3.5 text-amber-500" />
            Threshold {Math.round(metrics.threshold * 100)}%
          </span>
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
            Calibration x{metrics.calibrationMultiplier.toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
}
