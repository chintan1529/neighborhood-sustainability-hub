// Supabase Edge Function: claim-report
// Allows collectors to claim pending waste reports with transaction safety

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Types
interface ClaimReportRequest {
  report_id: string;
  idempotency_key?: string;
}

interface ClaimReportResponse {
  success: boolean;
  claim_id?: string;
  report?: {
    id: string;
    latitude: number;
    longitude: number;
    address_text?: string;
    notes?: string;
    confirmed_class?: string;
  };
  error?: string;
  message?: string;
}

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

    // Client for user operations
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Admin client for service operations
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

    // Parse request body
    const body: ClaimReportRequest = await req.json();

    if (!body.report_id) {
      return new Response(
        JSON.stringify({ success: false, error: "report_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Generate idempotency key if not provided
    const idempotencyKey =
      body.idempotency_key || `${user.id}-${body.report_id}-${Date.now()}`;

    // Call the database function for atomic claim
    const { data: result, error: claimError } = await supabaseAdmin.rpc(
      "claim_report",
      {
        p_report_id: body.report_id,
        p_collector_id: user.id,
        p_idempotency_key: idempotencyKey,
      },
    );

    if (claimError) {
      console.error("Claim error:", claimError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to claim report" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Parse result from database function
    const dbResult = result as {
      success: boolean;
      claim_id?: string;
      error?: string;
      message?: string;
    };

    if (!dbResult.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: dbResult.error,
          message: dbResult.message,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get report details for navigation
    const { data: report } = await supabaseUser
      .from("waste_reports")
      .select(
        "id, latitude, longitude, address_text, landmark, notes, confirmed_class, predicted_class, photo_url",
      )
      .eq("id", body.report_id)
      .single();

    const response: ClaimReportResponse = {
      success: true,
      claim_id: dbResult.claim_id,
      report: report
        ? {
            id: report.id,
            latitude: report.latitude,
            longitude: report.longitude,
            address_text: report.address_text,
            notes: report.notes,
            confirmed_class: report.confirmed_class || report.predicted_class,
          }
        : undefined,
      message: dbResult.message || "Report claimed successfully",
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
