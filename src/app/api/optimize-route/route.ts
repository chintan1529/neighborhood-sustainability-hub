import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  calculateBatchPriority,
  type PriorityInput,
} from "@/lib/priority-engine";
import { getRouteReadyPredictions } from "@/lib/predictive-engine";

// ───── Types ─────
interface ReportLocation {
  id: string;
  latitude: number;
  longitude: number;
  wasteType: string;
  quantity: string | null;
  createdAt: string;
  address: string;
  status: string;
  predictionConfidence?: number | null;
  isTransferStation?: boolean;
}

interface OptimizedStop {
  index: number;
  report: ReportLocation;
  distanceFromPrev: number; // km
  estimatedTimeFromPrev: number; // minutes
  cumulativeDistance: number;
  cumulativeTime: number;
  priorityScore: number;
  priorityReason: string;
}

// ───── Geo Helpers ─────
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// ───── Priority Scoring (via shared engine) ─────
function getReportPriorities(
  reports: ReportLocation[],
): Map<string, { score: number; reason: string }> {
  const inputs: PriorityInput[] = reports.map((r) => ({
    id: r.id,
    wasteType: r.wasteType,
    createdAt: r.createdAt,
    quantity: r.quantity,
    latitude: r.latitude,
    longitude: r.longitude,
    predictionConfidence: r.predictionConfidence,
    status: r.status,
  }));

  const batchResults = calculateBatchPriority(inputs);
  const simplified = new Map<string, { score: number; reason: string }>();

  for (const [id, result] of Array.from(batchResults.entries())) {
    simplified.set(id, {
      score: result.score / 100, // Convert 0-100 to 0-1 for TSP weighting
      reason: result.reasons.join(", "),
    });
  }

  return simplified;
}

// ───── TSP Solver: Nearest Neighbor + 2-opt ─────
function buildDistanceMatrix(
  start: { latitude: number; longitude: number },
  reports: ReportLocation[],
): number[][] {
  const allPoints = [
    start,
    ...reports.map((r) => ({ latitude: r.latitude, longitude: r.longitude })),
  ];
  const n = allPoints.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = haversineDistance(
        allPoints[i].latitude,
        allPoints[i].longitude,
        allPoints[j].latitude,
        allPoints[j].longitude,
      );
      matrix[i][j] = d;
      matrix[j][i] = d;
    }
  }

  return matrix;
}

function nearestNeighborTSP(
  distMatrix: number[][],
  priorities: number[],
): number[] {
  const n = distMatrix.length;
  const visited = new Set<number>([0]); // Start from index 0 (collector position)
  const tour = [0];

  while (visited.size < n) {
    const current = tour[tour.length - 1];
    let bestNext = -1;
    let bestScore = Infinity;

    for (let j = 0; j < n; j++) {
      if (visited.has(j)) continue;
      // Weight distance by inverse priority (higher priority = lower effective distance)
      const priorityWeight = 1 - (priorities[j] || 0.5) * 0.5; // Range 0.5 to 1.0
      const effectiveDistance = distMatrix[current][j] * priorityWeight;
      if (effectiveDistance < bestScore) {
        bestScore = effectiveDistance;
        bestNext = j;
      }
    }

    if (bestNext !== -1) {
      tour.push(bestNext);
      visited.add(bestNext);
    }
  }

  return tour;
}

function twoOptImprove(tour: number[], distMatrix: number[][]): number[] {
  const n = tour.length;
  let improved = true;
  let bestTour = [...tour];

  while (improved) {
    improved = false;
    for (let i = 1; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        const current =
          distMatrix[bestTour[i - 1]][bestTour[i]] +
          distMatrix[bestTour[j]][bestTour[(j + 1) % n] || bestTour[j]];
        const swapped =
          distMatrix[bestTour[i - 1]][bestTour[j]] +
          distMatrix[bestTour[i]][bestTour[(j + 1) % n] || bestTour[i]];

        if (swapped < current) {
          // Reverse the segment between i and j
          const reversed = bestTour.slice(i, j + 1).reverse();
          bestTour = [
            ...bestTour.slice(0, i),
            ...reversed,
            ...bestTour.slice(j + 1),
          ];
          improved = true;
        }
      }
    }
  }

  return bestTour;
}

// ───── Main Route Handler ─────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      collectorLat,
      collectorLng,
      reports: initialReports,
    }: {
      collectorLat: number;
      collectorLng: number;
      reports: ReportLocation[];
    } = body;

    if (!collectorLat || !collectorLng || !initialReports) {
      return NextResponse.json(
        { error: "Missing collector position or reports" },
        { status: 400 },
      );
    }

    // 1. Fetch confidence-filtered AI predicted hotspots and inject them as virtual stops
    const predictionsRaw = await getRouteReadyPredictions();
    const predictions = predictionsRaw as unknown as Array<{
      id: string;
      latitude: number;
      longitude: number;
      predicted_category: string | null;
      geohash: string | null;
      base_confidence: number | null;
    }>;

    const reports = [...initialReports];

    if (predictions) {
      predictions.forEach((p) => {
        // Only inject if no report is already within 200m
        const exists = initialReports.some(
          (r) =>
            haversineDistance(
              r.latitude,
              r.longitude,
              p.latitude,
              p.longitude,
            ) < 0.2,
        );

        if (!exists) {
          reports.push({
            id: `pred-${p.id}`,
            latitude: p.latitude,
            longitude: p.longitude,
            wasteType: p.predicted_category || "mixed",
            quantity: "medium",
            createdAt: new Date().toISOString(),
            address: `AI predicted hotspot (${p.geohash || "unknown"})`,
            status: "predicted",
            predictionConfidence: p.base_confidence,
          });
        }
      });
    }

    // 1b. Inject Transfer Stations as mandatory waypoints when route is long
    try {
      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );
      const { data: transferStations } = await adminClient
        .from("transfer_stations")
        .select(
          "id, name, latitude, longitude, address_text, capacity_tons, current_load_tons",
        )
        .eq("is_active", true);

      if (transferStations && transferStations.length > 0) {
        // Calculate rough route span to decide if transfer stations are needed
        const lats = reports.map((r) => r.latitude);
        const lngs = reports.map((r) => r.longitude);
        const routeSpan = haversineDistance(
          Math.min(...lats),
          Math.min(...lngs),
          Math.max(...lats),
          Math.max(...lngs),
        );

        // Inject transfer station if route spans > 5km (long haul)
        if (routeSpan > 5) {
          // Find centroid of all reports
          const centroidLat = lats.reduce((a, b) => a + b, 0) / lats.length;
          const centroidLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

          // Pick the nearest transfer station to centroid that isn't at capacity
          const viable = transferStations
            .filter((ts) => ts.current_load_tons < ts.capacity_tons * 0.9)
            .map((ts) => ({
              ...ts,
              dist: haversineDistance(
                centroidLat,
                centroidLng,
                ts.latitude,
                ts.longitude,
              ),
            }))
            .sort((a, b) => a.dist - b.dist);

          if (viable.length > 0) {
            const best = viable[0];
            const alreadyInjected = reports.some(
              (r) => r.id === `ts-${best.id}`,
            );
            if (!alreadyInjected) {
              reports.push({
                id: `ts-${best.id}`,
                latitude: best.latitude,
                longitude: best.longitude,
                wasteType: "transfer_station",
                quantity: null,
                createdAt: new Date().toISOString(),
                address: `🏭 ${best.name} (${best.address_text})`,
                status: "transfer_station",
                isTransferStation: true,
              });
              console.log(
                `[Route] Injected transfer station: ${best.name} (${best.dist.toFixed(1)}km from centroid)`,
              );
            }
          }
        }
      }
    } catch (tsErr) {
      console.warn(
        "[Route] Transfer station lookup failed, continuing without:",
        tsErr,
      );
    }

    // 2. Priority Scoring (via shared engine)
    const priorities = getReportPriorities(reports);

    // 2. Build distance matrix (index 0 = collector position)
    const distMatrix = buildDistanceMatrix(
      { latitude: collectorLat, longitude: collectorLng },
      reports,
    );

    // 3. Build priority array (index 0 = collector = no priority)
    const priorityArray = [
      0,
      ...reports.map((r) => priorities.get(r.id)?.score || 0.5),
    ];

    // 4. Solve TSP
    let tour = nearestNeighborTSP(distMatrix, priorityArray);
    tour = twoOptImprove(tour, distMatrix);

    // 5. Build response (skip index 0 which is collector start)
    const orderedStops = tour.slice(1);
    const stops: OptimizedStop[] = [];
    let cumulativeDistance = 0;
    let cumulativeTime = 0;

    for (let i = 0; i < orderedStops.length; i++) {
      const reportIdx = orderedStops[i] - 1; // Adjust for collector offset
      const report = reports[reportIdx];
      const prevTourIdx = i === 0 ? 0 : orderedStops[i - 1];
      const dist = distMatrix[prevTourIdx][orderedStops[i]];
      const timeMinutes = (dist / 15) * 60; // Assume 15 km/h average city speed

      cumulativeDistance += dist;
      cumulativeTime += timeMinutes + 5; // +5 min per stop for pickup

      const priority = priorities.get(report.id) || {
        score: 0.5,
        reason: "standard",
      };

      stops.push({
        index: i + 1,
        report,
        distanceFromPrev: Math.round(dist * 100) / 100,
        estimatedTimeFromPrev: Math.round(timeMinutes),
        cumulativeDistance: Math.round(cumulativeDistance * 100) / 100,
        cumulativeTime: Math.round(cumulativeTime),
        priorityScore: Math.round(priority.score * 100) / 100,
        priorityReason: priority.reason,
      });
    }

    // Calculate naive (unoptimized) distance for comparison
    let naiveDistance = 0;
    for (let i = 0; i < reports.length; i++) {
      const prevLat = i === 0 ? collectorLat : reports[i - 1].latitude;
      const prevLng = i === 0 ? collectorLng : reports[i - 1].longitude;
      naiveDistance += haversineDistance(
        prevLat,
        prevLng,
        reports[i].latitude,
        reports[i].longitude,
      );
    }

    const timeSaved = Math.max(
      0,
      Math.round(((naiveDistance - cumulativeDistance) / 15) * 60),
    );

    try {
      const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      ) as any;
      await admin.from("route_run_metrics").insert({
        route_date: new Date().toISOString().slice(0, 10),
        total_stops: stops.length,
        total_distance_km: Math.round(cumulativeDistance * 100) / 100,
        naive_distance_km: Math.round(naiveDistance * 100) / 100,
        distance_saved_km:
          Math.round((naiveDistance - cumulativeDistance) * 100) / 100,
        total_time_minutes: Math.round(cumulativeTime),
        time_saved_minutes: timeSaved,
        predicted_stop_count: reports.filter(
          (report) => report.status === "predicted",
        ).length,
        optimization_method:
          "nearest-neighbor + 2-opt with AI priority and predictive hotspot injection",
      });
    } catch (metricError) {
      console.warn("Failed to persist route metrics", metricError);
    }

    return NextResponse.json({
      success: true,
      route: {
        stops,
        totalStops: stops.length,
        totalDistance: Math.round(cumulativeDistance * 100) / 100,
        totalTime: Math.round(cumulativeTime),
        naiveDistance: Math.round(naiveDistance * 100) / 100,
        timeSaved,
        distanceSaved:
          Math.round((naiveDistance - cumulativeDistance) * 100) / 100,
        transferStationsUsed: reports.filter((r) => r.isTransferStation).length,
        optimizationMethod:
          "nearest-neighbor + 2-opt with AI priority, predictive hotspot injection, and transfer station waypoints",
      },
    });
  } catch (error: any) {
    console.error("Route optimization error:", error);
    return NextResponse.json(
      { error: "Failed to optimize route", message: error.message },
      { status: 500 },
    );
  }
}
