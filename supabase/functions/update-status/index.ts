// Supabase Edge Function: update-status
// Updates report status with audit trail and completion handling

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Types
interface UpdateStatusRequest {
  report_id: string;
  status: "in_progress" | "completed" | "cancelled";
  completion_photo_base64?: string;
  completion_notes?: string;
  cancellation_reason?: string;
}

interface UpdateStatusResponse {
  success: boolean;
  points_awarded?: number;
  error?: string;
  message?: string;
}

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["assigned", "cancelled"],
  assigned: ["in_progress", "completed", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [], // Terminal state
  cancelled: [], // Terminal state
};

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    // Verify user
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

    // Get user profile
    const { data: profile } = await supabaseUser
      .from("profiles")
      .select("id, neighborhood_id, role")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return new Response(
        JSON.stringify({ success: false, error: "Profile not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Parse request body
    const body: UpdateStatusRequest = await req.json();

    if (!body.report_id || !body.status) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "report_id and status are required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get current report
    const { data: report, error: reportError } = await supabaseUser
      .from("waste_reports")
      .select("*")
      .eq("id", body.report_id)
      .single();

    if (reportError || !report) {
      return new Response(
        JSON.stringify({ success: false, error: "Report not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Check permissions
    const isAdmin = profile.role === "admin";
    const isAssignedCollector =
      profile.role === "collector" && report.assigned_to === user.id;
    const isReportOwner = report.user_id === user.id;

    if (!isAdmin && !isAssignedCollector && !isReportOwner) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "You don't have permission to update this report",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Validate status transition
    const validNextStatuses = VALID_TRANSITIONS[report.status] || [];
    if (!validNextStatuses.includes(body.status) && !isAdmin) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Cannot transition from ${report.status} to ${body.status}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Handle completion with photo
    if (body.status === "completed") {
      if (!isAssignedCollector && !isAdmin) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Only assigned collector can complete",
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Use database function for atomic completion
      const { data: result, error: completeError } = await supabaseAdmin.rpc(
        "complete_report",
        {
          p_report_id: body.report_id,
          p_collector_id: user.id,
          p_completion_photo_url: body.completion_photo_base64 || null, // TODO: Upload photo first
          p_completion_notes: body.completion_notes || null,
        },
      );

      if (completeError) {
        console.error("Complete error:", completeError);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Failed to complete report",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const dbResult = result as {
        success: boolean;
        points_awarded?: number;
        error?: string;
        message?: string;
      };

      if (!dbResult.success) {
        return new Response(
          JSON.stringify({ success: false, error: dbResult.error }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          points_awarded: dbResult.points_awarded,
          message: dbResult.message || "Report completed successfully",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Handle other status updates
    const updateData: Record<string, unknown> = {
      status: body.status,
    };

    if (body.status === "in_progress") {
      // Update claim started_at
      await supabaseAdmin
        .from("collector_claims")
        .update({ started_at: new Date().toISOString() })
        .eq("report_id", body.report_id)
        .eq("is_active", true);
    }

    if (body.status === "cancelled") {
      // Cancel the claim
      await supabaseAdmin
        .from("collector_claims")
        .update({
          is_active: false,
          cancelled_at: new Date().toISOString(),
          cancellation_reason: body.cancellation_reason,
        })
        .eq("report_id", body.report_id)
        .eq("is_active", true);

      // Clear collector's active claim
      if (report.assigned_to) {
        await supabaseAdmin
          .from("profiles")
          .update({ active_claim_id: null })
          .eq("id", report.assigned_to);
      }

      // Reset assignment
      updateData.assigned_to = null;
      updateData.assigned_at = null;
    }

    // Update report
    const { error: updateError } = await supabaseAdmin
      .from("waste_reports")
      .update(updateData)
      .eq("id", body.report_id);

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to update status" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Create audit event
    await supabaseAdmin.from("report_events").insert({
      report_id: body.report_id,
      event_type: body.status === "cancelled" ? "cancelled" : "status_changed",
      previous_status: report.status,
      new_status: body.status,
      actor_id: user.id,
      actor_role: profile.role,
      notes: body.cancellation_reason || body.completion_notes,
    });

    const response: UpdateStatusResponse = {
      success: true,
      message: `Status updated to ${body.status}`,
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
