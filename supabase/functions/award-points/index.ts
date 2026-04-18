// Supabase Edge Function: award-points
// Admin/system function to award points with anti-cheat validation

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Types
interface AwardPointsRequest {
  user_id: string;
  points: number;
  reason: string;
  description?: string;
  reference_id?: string;
  reference_type?: string;
}

interface AwardPointsResponse {
  success: boolean;
  ledger_id?: string;
  new_balance?: number;
  error?: string;
  message?: string;
}

// Valid reasons
const VALID_REASONS = [
  "report_created",
  "correct_segregation",
  "streak_bonus",
  "challenge_completed",
  "badge_earned",
  "admin_adjustment",
  "referral_bonus",
];

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-service-key",
};

// Anti-cheat: Check for suspicious patterns
async function validateAntiCheat(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  points: number,
  reason: string,
): Promise<{ valid: boolean; message?: string }> {
  // Check for duplicate awards in last minute (same user, reason, points)
  const { count: recentDuplicates } = await supabase
    .from("points_ledger")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("reason", reason)
    .eq("points", points)
    .gte("created_at", new Date(Date.now() - 60000).toISOString());

  if ((recentDuplicates || 0) > 0) {
    return { valid: false, message: "Duplicate award detected" };
  }

  // Check for excessive points in 24 hours (more than 1000 points)
  const { data: recent24h } = await supabase
    .from("points_ledger")
    .select("points")
    .eq("user_id", userId)
    .gte("created_at", new Date(Date.now() - 86400000).toISOString());

  const totalRecent = (recent24h || []).reduce((sum, r) => sum + r.points, 0);
  if (totalRecent + points > 1000) {
    return { valid: false, message: "Daily points limit exceeded" };
  }

  // Check for negative balance
  const { data: profile } = await supabase
    .from("profiles")
    .select("total_points")
    .eq("id", userId)
    .single();

  if (profile && points < 0 && profile.total_points + points < 0) {
    return { valid: false, message: "Insufficient points balance" };
  }

  return { valid: true };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate request method
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Check for service key (system call) or user auth
    const serviceKey = req.headers.get("x-service-key");
    const authHeader = req.headers.get("Authorization");

    let isSystemCall = false;
    let actorId: string | null = null;

    if (serviceKey === supabaseServiceKey) {
      // System call (from other functions or cron)
      isSystemCall = true;
    } else if (authHeader) {
      // User call - verify admin role
      const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

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

      // Check admin role
      const { data: profile } = await supabaseUser
        .from("profiles")
        .select("role")
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

      actorId = user.id;
    } else {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Parse request body
    const body: AwardPointsRequest = await req.json();

    // Validate required fields
    if (!body.user_id || body.points === undefined || !body.reason) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "user_id, points, and reason are required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Validate reason
    if (!VALID_REASONS.includes(body.reason)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid reason. Valid reasons: ${VALID_REASONS.join(", ")}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Validate points range
    if (body.points < -100 || body.points > 500) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Points must be between -100 and 500",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify target user exists
    const { data: targetUser } = await supabaseAdmin
      .from("profiles")
      .select("id, neighborhood_id")
      .eq("id", body.user_id)
      .single();

    if (!targetUser) {
      return new Response(
        JSON.stringify({ success: false, error: "Target user not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Anti-cheat validation
    const antiCheatResult = await validateAntiCheat(
      supabaseAdmin,
      body.user_id,
      body.points,
      body.reason,
    );

    if (!antiCheatResult.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: antiCheatResult.message,
          message: "Award rejected by anti-cheat system",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Award points using database function
    const { data: ledgerId, error: awardError } = await supabaseAdmin.rpc(
      "award_points",
      {
        p_user_id: body.user_id,
        p_points: body.points,
        p_reason: body.reason,
        p_description: body.description || null,
        p_reference_id: body.reference_id || null,
        p_reference_type: body.reference_type || null,
      },
    );

    if (awardError) {
      console.error("Award error:", awardError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to award points" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get updated balance
    const { data: updatedProfile } = await supabaseAdmin
      .from("profiles")
      .select("total_points")
      .eq("id", body.user_id)
      .single();

    const response: AwardPointsResponse = {
      success: true,
      ledger_id: ledgerId,
      new_balance: updatedProfile?.total_points,
      message: `Awarded ${body.points} points for ${body.reason}`,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
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
