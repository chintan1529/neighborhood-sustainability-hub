// Supabase Edge Function: export-pdf
// Generates monthly PDF reports for admin/municipal use

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Types
interface ExportPdfRequest {
  neighborhood_id?: string;
  month?: number; // 1-12
  year?: number;
}

interface MonthlyStats {
  total_reports: number;
  completed_reports: number;
  pending_reports: number;
  completion_rate: number;
  avg_completion_hours: number;
  sla_compliance: number;
  category_distribution: Record<string, number>;
  top_users: Array<{ name: string; reports: number; points: number }>;
  top_collectors: Array<{ name: string; completed: number }>;
  daily_breakdown: Array<{ date: string; created: number; completed: number }>;
}

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Generate HTML for PDF (server-side rendering)
function generatePdfHtml(
  stats: MonthlyStats,
  neighborhoodName: string,
  monthYear: string,
): string {
  const categoryColors: Record<string, string> = {
    plastic: "#EF4444",
    cardboard: "#F59E0B",
    paper: "#10B981",
    metal: "#6B7280",
    glass: "#3B82F6",
    organic: "#84CC16",
    mixed: "#8B5CF6",
  };

  const categoryBars = Object.entries(stats.category_distribution)
    .sort((a, b) => b[1] - a[1])
    .map(
      ([category, count]) => `
      <div style="display: flex; align-items: center; margin-bottom: 8px;">
        <span style="width: 80px; text-transform: capitalize;">${category}</span>
        <div style="flex: 1; background: #E5E7EB; border-radius: 4px; height: 20px; margin: 0 12px;">
          <div style="background: ${categoryColors[category] || "#6B7280"}; width: ${(count / stats.total_reports) * 100}%; height: 100%; border-radius: 4px;"></div>
        </div>
        <span style="width: 50px; text-align: right;">${count}</span>
      </div>
    `,
    )
    .join("");

  const topUsersRows = stats.top_users
    .slice(0, 5)
    .map(
      (user, i) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #E5E7EB;">${i + 1}</td>
        <td style="padding: 8px; border-bottom: 1px solid #E5E7EB;">${user.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #E5E7EB; text-align: center;">${user.reports}</td>
        <td style="padding: 8px; border-bottom: 1px solid #E5E7EB; text-align: center;">${user.points}</td>
      </tr>
    `,
    )
    .join("");

  const topCollectorsRows = stats.top_collectors
    .slice(0, 5)
    .map(
      (collector, i) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #E5E7EB;">${i + 1}</td>
        <td style="padding: 8px; border-bottom: 1px solid #E5E7EB;">${collector.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #E5E7EB; text-align: center;">${collector.completed}</td>
      </tr>
    `,
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Monthly Waste Management Report - ${monthYear}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1F2937; line-height: 1.5; }
    .container { max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #10B981; }
    .header h1 { font-size: 28px; color: #059669; margin-bottom: 8px; }
    .header p { color: #6B7280; }
    .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px; }
    .kpi-card { background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%); border-radius: 12px; padding: 20px; text-align: center; }
    .kpi-value { font-size: 32px; font-weight: bold; color: #059669; }
    .kpi-label { font-size: 14px; color: #6B7280; margin-top: 4px; }
    .section { margin-bottom: 40px; }
    .section-title { font-size: 20px; font-weight: 600; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #E5E7EB; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #F3F4F6; padding: 12px 8px; text-align: left; font-weight: 600; }
    .sdg-box { background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%); border-radius: 12px; padding: 24px; margin-top: 40px; }
    .sdg-title { font-size: 18px; font-weight: 600; color: #4338CA; margin-bottom: 12px; }
    .sdg-item { display: flex; align-items: flex-start; margin-bottom: 12px; }
    .sdg-badge { background: #4F46E5; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; margin-right: 12px; white-space: nowrap; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E7EB; text-align: center; color: #6B7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌱 Neighborhood Sustainability Hub</h1>
      <p><strong>${neighborhoodName}</strong> | Monthly Report: ${monthYear}</p>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-value">${stats.total_reports}</div>
        <div class="kpi-label">Total Reports</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${stats.completion_rate.toFixed(1)}%</div>
        <div class="kpi-label">Completion Rate</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${stats.sla_compliance.toFixed(1)}%</div>
        <div class="kpi-label">SLA Compliance (&lt;24h)</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${stats.avg_completion_hours.toFixed(1)}h</div>
        <div class="kpi-label">Avg. Resolution Time</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${stats.completed_reports}</div>
        <div class="kpi-label">Completed</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${stats.pending_reports}</div>
        <div class="kpi-label">Pending</div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">📊 Waste Category Distribution</h2>
      ${categoryBars}
    </div>

    <div class="section">
      <h2 class="section-title">🏆 Top Contributors</h2>
      <table>
        <thead>
          <tr>
            <th style="width: 40px;">#</th>
            <th>Name</th>
            <th style="width: 80px; text-align: center;">Reports</th>
            <th style="width: 80px; text-align: center;">Points</th>
          </tr>
        </thead>
        <tbody>
          ${topUsersRows}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2 class="section-title">🚛 Top Collectors</h2>
      <table>
        <thead>
          <tr>
            <th style="width: 40px;">#</th>
            <th>Name</th>
            <th style="width: 100px; text-align: center;">Completed</th>
          </tr>
        </thead>
        <tbody>
          ${topCollectorsRows}
        </tbody>
      </table>
    </div>

    <div class="sdg-box">
      <div class="sdg-title">🌍 SDG Alignment Summary</div>
      <div class="sdg-item">
        <span class="sdg-badge">SDG 11.6</span>
        <span>Sustainable Cities: ${stats.completed_reports} waste items properly collected, reducing urban environmental impact through hyperlocal monitoring.</span>
      </div>
      <div class="sdg-item">
        <span class="sdg-badge">SDG 12.5</span>
        <span>Responsible Consumption: AI-powered segregation achieved ${Object.keys(stats.category_distribution).length} category classification, promoting recycling and material recovery.</span>
      </div>
    </div>

    <div class="footer">
      <p>Generated by Neighborhood Sustainability Hub | ${new Date().toLocaleDateString("en-IN", { dateStyle: "full" })}</p>
      <p>This report supports municipal waste management and sustainability compliance.</p>
    </div>
  </div>
</body>
</html>
  `;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate request method
    if (req.method !== "POST" && req.method !== "GET") {
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get auth token and create Supabase clients
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing authorization header",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is admin
    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: profile } = await supabaseUser
      .from("profiles")
      .select("role, neighborhood_id")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return new Response(
        JSON.stringify({ success: false, error: "Admin access required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Parse request
    let body: ExportPdfRequest = {};
    if (req.method === "POST") {
      body = await req.json();
    }

    const neighborhoodId = body.neighborhood_id || profile.neighborhood_id;
    const now = new Date();
    const month = body.month || now.getMonth() + 1;
    const year = body.year || now.getFullYear();

    // Calculate date range
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Get neighborhood info
    const { data: neighborhood } = await supabaseAdmin
      .from("neighborhoods")
      .select("name")
      .eq("id", neighborhoodId)
      .single();

    if (!neighborhood) {
      return new Response(
        JSON.stringify({ success: false, error: "Neighborhood not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Fetch reports for the month
    const { data: reports } = await supabaseAdmin
      .from("waste_reports")
      .select("*")
      .eq("neighborhood_id", neighborhoodId)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString());

    const allReports = reports || [];
    const completedReports = allReports.filter((r) => r.status === "completed");
    const pendingReports = allReports.filter((r) => r.status === "pending");

    // Calculate SLA compliance (completed within 24h)
    const slaCompliant = completedReports.filter((r) => {
      const created = new Date(r.created_at).getTime();
      const completed = new Date(r.completed_at).getTime();
      return (completed - created) / 3600000 <= 24;
    });

    // Category distribution
    const categoryDist: Record<string, number> = {};
    allReports.forEach((r) => {
      const cat = r.confirmed_class || r.predicted_class || "mixed";
      categoryDist[cat] = (categoryDist[cat] || 0) + 1;
    });

    // Top users
    const { data: topUsers } = await supabaseAdmin
      .from("profiles")
      .select("full_name, reports_count, total_points")
      .eq("neighborhood_id", neighborhoodId)
      .eq("role", "resident")
      .order("reports_count", { ascending: false })
      .limit(5);

    // Top collectors
    const { data: collectorClaims } = await supabaseAdmin
      .from("collector_claims")
      .select(
        `
        collector_id,
        profiles!collector_id(full_name)
      `,
      )
      .not("completed_at", "is", null)
      .gte("completed_at", startDate.toISOString())
      .lte("completed_at", endDate.toISOString());

    const collectorStats: Record<string, { name: string; completed: number }> =
      {};
    (collectorClaims || []).forEach((c: any) => {
      const id = c.collector_id;
      if (!collectorStats[id]) {
        collectorStats[id] = {
          name: c.profiles?.full_name || "Unknown",
          completed: 0,
        };
      }
      collectorStats[id].completed++;
    });
    const topCollectors = Object.values(collectorStats)
      .sort((a, b) => b.completed - a.completed)
      .slice(0, 5);

    // Calculate avg completion time
    let totalHours = 0;
    completedReports.forEach((r) => {
      const hours =
        (new Date(r.completed_at).getTime() -
          new Date(r.created_at).getTime()) /
        3600000;
      totalHours += hours;
    });

    const stats: MonthlyStats = {
      total_reports: allReports.length,
      completed_reports: completedReports.length,
      pending_reports: pendingReports.length,
      completion_rate:
        allReports.length > 0
          ? (completedReports.length / allReports.length) * 100
          : 0,
      avg_completion_hours:
        completedReports.length > 0 ? totalHours / completedReports.length : 0,
      sla_compliance:
        completedReports.length > 0
          ? (slaCompliant.length / completedReports.length) * 100
          : 0,
      category_distribution: categoryDist,
      top_users: (topUsers || []).map((u) => ({
        name: u.full_name || "Anonymous",
        reports: u.reports_count || 0,
        points: u.total_points || 0,
      })),
      top_collectors: topCollectors,
      daily_breakdown: [],
    };

    const monthYear = startDate.toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    });

    // Generate HTML
    const html = generatePdfHtml(stats, neighborhood.name, monthYear);

    // Return HTML (client can use html2pdf.js or similar)
    return new Response(html, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
