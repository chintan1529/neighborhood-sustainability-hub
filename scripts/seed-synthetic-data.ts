/**
 * Synthetic Waste Report Generator
 * =================================
 * Generates realistic waste reports for development, testing, and
 * calibration of the predictive hotspot engine.
 *
 * Signals simulated:
 *   - Geolocation clusters (8 hotspot centers with Gaussian noise)
 *   - Time patterns (weekday bias, peak hours)
 *   - Seasonal patterns (organic surge in summer, paper in December)
 *   - Festival spikes (Diwali, Holi)
 *   - Rain disruption (lower completion rates)
 *   - Neighborhood behavior (commercial/residential/restaurant profiles)
 *   - Category distributions per zone
 *
 * Usage:
 *   npx tsx scripts/seed-synthetic-data.ts
 *
 * IMPORTANT: Only for dev/test. Never run on production databases.
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ─── Zone Profiles ───────────────────────────────────────────────────────────

interface ZoneProfile {
  name: string;
  center: [number, number]; // [lat, lng]
  spread: number; // σ in degrees (~0.002° ≈ 220m)
  behavior: "commercial" | "residential" | "restaurant" | "market" | "transit";
  categoryWeights: Record<string, number>;
  weeklyFrequency: number; // average reports per week
  peakHour: number; // UTC
  weekdayBias: number; // 1.0 = no bias, 1.5 = 50% more on weekdays
}

const BANGALORE_ZONES: ZoneProfile[] = [
  {
    name: "Koramangala Commercial",
    center: [12.935, 77.625],
    spread: 0.003,
    behavior: "commercial",
    categoryWeights: { plastic: 0.35, paper: 0.25, cardboard: 0.2, mixed: 0.1, metal: 0.1 },
    weeklyFrequency: 8,
    peakHour: 10,
    weekdayBias: 1.4,
  },
  {
    name: "Indiranagar Residential",
    center: [12.978, 77.641],
    spread: 0.004,
    behavior: "residential",
    categoryWeights: { organic: 0.4, plastic: 0.25, mixed: 0.15, paper: 0.1, glass: 0.1 },
    weeklyFrequency: 6,
    peakHour: 7,
    weekdayBias: 0.8,
  },
  {
    name: "Church Street Restaurants",
    center: [12.975, 77.607],
    spread: 0.002,
    behavior: "restaurant",
    categoryWeights: { organic: 0.55, plastic: 0.2, glass: 0.1, cardboard: 0.1, mixed: 0.05 },
    weeklyFrequency: 10,
    peakHour: 22,
    weekdayBias: 0.7,
  },
  {
    name: "KR Market",
    center: [12.963, 77.578],
    spread: 0.002,
    behavior: "market",
    categoryWeights: { organic: 0.6, cardboard: 0.15, plastic: 0.1, paper: 0.1, mixed: 0.05 },
    weeklyFrequency: 12,
    peakHour: 16,
    weekdayBias: 1.0,
  },
  {
    name: "Majestic Metro Station",
    center: [12.977, 77.572],
    spread: 0.0015,
    behavior: "transit",
    categoryWeights: { plastic: 0.4, paper: 0.3, mixed: 0.15, organic: 0.1, metal: 0.05 },
    weeklyFrequency: 7,
    peakHour: 9,
    weekdayBias: 1.6,
  },
  {
    name: "HSR Layout",
    center: [12.912, 77.638],
    spread: 0.005,
    behavior: "residential",
    categoryWeights: { organic: 0.35, plastic: 0.25, cardboard: 0.15, paper: 0.1, mixed: 0.15 },
    weeklyFrequency: 5,
    peakHour: 8,
    weekdayBias: 0.9,
  },
  {
    name: "Whitefield Tech Park",
    center: [12.970, 77.750],
    spread: 0.003,
    behavior: "commercial",
    categoryWeights: { paper: 0.3, plastic: 0.3, cardboard: 0.2, metal: 0.1, mixed: 0.1 },
    weeklyFrequency: 6,
    peakHour: 13,
    weekdayBias: 1.5,
  },
  {
    name: "Jayanagar Weekend Market",
    center: [12.925, 77.584],
    spread: 0.002,
    behavior: "market",
    categoryWeights: { organic: 0.45, plastic: 0.2, cardboard: 0.15, glass: 0.1, mixed: 0.1 },
    weeklyFrequency: 4,
    peakHour: 11,
    weekdayBias: 0.5, // weekend-heavy
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function gaussianRandom(mean: number, stddev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return mean + stddev * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function weightedRandomPick(weights: Record<string, number>): string {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = Math.random() * total;
  for (const [key, weight] of entries) {
    r -= weight;
    if (r <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

function pickQuantity(): string {
  const r = Math.random();
  if (r < 0.25) return "small";
  if (r < 0.7) return "medium";
  return "large";
}

function pickStatus(daysSinceCreation: number, isRainDay: boolean): string {
  const completionChance = isRainDay ? 0.4 : 0.75;
  if (daysSinceCreation < 1) {
    return Math.random() < 0.3 ? "assigned" : "pending";
  }
  if (daysSinceCreation < 3) {
    return Math.random() < completionChance ? "completed" : "in_progress";
  }
  return Math.random() < completionChance ? "completed" : "pending";
}

// Festival spike dates (approximate)
function isFestivalPeriod(date: Date): boolean {
  const month = date.getMonth(); // 0-indexed
  const day = date.getDate();
  // Diwali (Oct/Nov), Holi (Mar), New Year
  if (month === 10 && day >= 10 && day <= 15) return true; // Diwali
  if (month === 2 && day >= 20 && day <= 25) return true; // Holi
  if (month === 11 && day >= 30) return true; // New Year
  return false;
}

// Rain season (June-September in Bangalore)
function isRainSeason(date: Date): boolean {
  const month = date.getMonth();
  return month >= 5 && month <= 8;
}

function isRainDay(date: Date): boolean {
  if (!isRainSeason(date)) return Math.random() < 0.05;
  return Math.random() < 0.35;
}

// Seasonal category adjustment
function adjustCategoryWeights(
  base: Record<string, number>,
  date: Date,
): Record<string, number> {
  const month = date.getMonth();
  const adjusted = { ...base };

  // Summer (Mar-May): more organic waste
  if (month >= 2 && month <= 4) {
    adjusted.organic = (adjusted.organic || 0) * 1.3;
  }
  // December: more paper/cardboard (packaging)
  if (month === 11) {
    adjusted.paper = (adjusted.paper || 0) * 1.4;
    adjusted.cardboard = (adjusted.cardboard || 0) * 1.3;
  }

  return adjusted;
}

// ─── Main Generator ──────────────────────────────────────────────────────────

async function generateSyntheticData() {
  console.log("🧪 Starting synthetic data generation...\n");

  // Get a user ID and neighborhood ID
  const { data: users } = await supabase.from("profiles").select("id").limit(1);
  const { data: neighborhoods } = await supabase.from("neighborhoods").select("id").limit(1);

  if (!users?.length) {
    console.error("❌ No users found. Create at least one user first.");
    process.exit(1);
  }

  const userId = users[0].id;
  const neighborhoodId = neighborhoods?.[0]?.id || null;

  const now = new Date();
  const reports: any[] = [];
  const DAYS_BACK = 60;

  for (const zone of BANGALORE_ZONES) {
    const reportsPerDay = zone.weeklyFrequency / 7;

    for (let dayOffset = DAYS_BACK; dayOffset >= 0; dayOffset--) {
      const date = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
      const dayOfWeek = date.getDay(); // 0=Sun
      const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
      const rain = isRainDay(date);
      const festival = isFestivalPeriod(date);

      // Adjust daily frequency
      let dailyRate = reportsPerDay;
      if (isWeekday) dailyRate *= zone.weekdayBias;
      else dailyRate *= (2 - zone.weekdayBias); // inverse for weekends
      if (rain) dailyRate *= 0.6;
      if (festival) dailyRate *= 3.0;

      // Poisson-like sampling
      const reportCount = Math.max(0, Math.round(dailyRate + gaussianRandom(0, Math.sqrt(dailyRate))));

      for (let i = 0; i < reportCount; i++) {
        const adjustedWeights = adjustCategoryWeights(zone.categoryWeights, date);
        const category = weightedRandomPick(adjustedWeights);

        // Scatter around zone center
        const lat = gaussianRandom(zone.center[0], zone.spread);
        const lng = gaussianRandom(zone.center[1], zone.spread);

        // Time of day: peak-hour Gaussian
        const hour = Math.round(gaussianRandom(zone.peakHour, 3)) % 24;
        const minute = Math.floor(Math.random() * 60);
        const reportDate = new Date(date);
        reportDate.setUTCHours(hour, minute, 0, 0);

        // Don't generate future reports
        if (reportDate.getTime() > now.getTime()) continue;

        const daysSince = (now.getTime() - reportDate.getTime()) / (1000 * 60 * 60 * 24);
        const status = pickStatus(daysSince, rain);

        reports.push({
          user_id: userId,
          neighborhood_id: neighborhoodId,
          predicted_class: category,
          confirmed_class: Math.random() < 0.85 ? category : null,
          prediction_confidence: Math.round((0.6 + Math.random() * 0.35) * 100) / 100,
          quantity_estimate: pickQuantity(),
          status,
          latitude: Math.round(lat * 1e6) / 1e6,
          longitude: Math.round(lng * 1e6) / 1e6,
          address_text: `${zone.name} (synthetic)`,
          photo_url: "synthetic-placeholder.jpg",
          created_at: reportDate.toISOString(),
          updated_at: new Date(
            reportDate.getTime() + Math.random() * 48 * 60 * 60 * 1000,
          ).toISOString(),
          completed_at:
            status === "completed"
              ? new Date(
                  reportDate.getTime() +
                    (6 + Math.random() * 42) * 60 * 60 * 1000,
                ).toISOString()
              : null,
        });
      }
    }
  }

  console.log(`📊 Generated ${reports.length} synthetic reports across ${BANGALORE_ZONES.length} zones`);
  console.log(`   Spanning ${DAYS_BACK} days\n`);

  // Print zone summary
  const zoneCounts: Record<string, number> = {};
  for (const r of reports) {
    zoneCounts[r.address_text] = (zoneCounts[r.address_text] || 0) + 1;
  }
  for (const [zone, count] of Object.entries(zoneCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${zone}: ${count} reports`);
  }

  // Batch insert (50 at a time to avoid payload limits)
  const BATCH_SIZE = 50;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < reports.length; i += BATCH_SIZE) {
    const batch = reports.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("waste_reports").insert(batch);
    if (error) {
      console.error(`   ❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, error.message);
      errors++;
    } else {
      inserted += batch.length;
    }
  }

  console.log(`\n✅ Inserted ${inserted} reports (${errors} batch errors)`);

  // Print category distribution
  const categoryCounts: Record<string, number> = {};
  const statusCounts: Record<string, number> = {};
  for (const r of reports) {
    categoryCounts[r.predicted_class] = (categoryCounts[r.predicted_class] || 0) + 1;
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
  }

  console.log("\n📈 Category Distribution:");
  for (const [cat, count] of Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])) {
    const pct = ((count / reports.length) * 100).toFixed(1);
    console.log(`   ${cat}: ${count} (${pct}%)`);
  }

  console.log("\n📋 Status Distribution:");
  for (const [status, count] of Object.entries(statusCounts).sort((a, b) => b[1] - a[1])) {
    const pct = ((count / reports.length) * 100).toFixed(1);
    console.log(`   ${status}: ${count} (${pct}%)`);
  }

  console.log("\n🎯 Done. Run the prediction engine to see hotspot detection in action.");
}

generateSyntheticData().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
