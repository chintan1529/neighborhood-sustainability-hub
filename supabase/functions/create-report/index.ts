// Supabase Edge Function: create-report
// Creates a waste report with photo upload and AI classification

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Types
interface CreateReportRequest {
    photo_base64: string;
    latitude: number;
    longitude: number;
    address_text?: string;
    landmark?: string;
    notes?: string;
    quantity_estimate?: string;
    confirmed_class?: string;
    idempotency_key?: string;
}

interface CreateReportResponse {
    success: boolean;
    report_id?: string;
    predicted_class?: string;
    ai_available?: boolean;
    points_awarded?: number;
    error?: string;
    message?: string;
}

// Constants
const WASTE_CATEGORIES = [
    "cardboard",
    "metal",
    "paper",
    "plastic",
    "glass",
    "organic",
    "mixed",
];

// CORS headers
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Validate coordinates
function validateCoordinates(lat: number, lng: number): boolean {
    return (
        typeof lat === "number" &&
        typeof lng === "number" &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
    );
}

// Generate unique filename
function generateFileName(userId: string, reportId: string): string {
    return `${reportId}_original.jpg`;
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
                { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Get auth token and create Supabase clients
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(
                JSON.stringify({ success: false, error: "Missing authorization header" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        // Client for user operations (RLS applies)
        const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } },
        });

        // Admin client for service operations (bypasses RLS)
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        // Verify user
        const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
        if (authError || !user) {
            return new Response(
                JSON.stringify({ success: false, error: "Unauthorized" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Get user profile
        const { data: profile, error: profileError } = await supabaseUser
            .from("profiles")
            .select("id, neighborhood_id, role")
            .eq("id", user.id)
            .single();

        if (profileError || !profile) {
            return new Response(
                JSON.stringify({ success: false, error: "User profile not found" }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (!profile.neighborhood_id) {
            return new Response(
                JSON.stringify({ success: false, error: "User must be assigned to a neighborhood" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Parse request body
        const body: CreateReportRequest = await req.json();

        // Validate required fields
        if (!body.photo_base64) {
            return new Response(
                JSON.stringify({ success: false, error: "Photo is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (!validateCoordinates(body.latitude, body.longitude)) {
            return new Response(
                JSON.stringify({ success: false, error: "Valid coordinates are required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Check idempotency
        if (body.idempotency_key) {
            const { data: existingReport } = await supabaseUser
                .from("waste_reports")
                .select("id")
                .eq("idempotency_key", body.idempotency_key)
                .single();

            if (existingReport) {
                return new Response(
                    JSON.stringify({
                        success: true,
                        report_id: existingReport.id,
                        message: "Report already exists (idempotent)",
                    }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
        }

        // Check max active reports per user
        const { count: activeReports } = await supabaseUser
            .from("waste_reports")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .in("status", ["pending", "assigned", "in_progress"]);

        const { data: neighborhood } = await supabaseUser
            .from("neighborhoods")
            .select("settings")
            .eq("id", profile.neighborhood_id)
            .single();

        const maxReports = neighborhood?.settings?.max_active_reports_per_user || 5;
        if ((activeReports || 0) >= maxReports) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: `Maximum active reports limit reached (${maxReports})`,
                }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Generate report ID first (for file naming)
        const reportId = crypto.randomUUID();

        // Decode and upload photo
        const base64Data = body.photo_base64.replace(/^data:image\/\w+;base64,/, "");
        const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

        const fileName = generateFileName(user.id, reportId);
        const storagePath = `${profile.neighborhood_id}/${user.id}/${fileName}`;

        const { error: uploadError } = await supabaseAdmin.storage
            .from("report-photos")
            .upload(storagePath, imageBytes, {
                contentType: "image/jpeg",
                upsert: false,
            });

        if (uploadError) {
            console.error("Upload error:", uploadError);
            return new Response(
                JSON.stringify({ success: false, error: "Failed to upload photo" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Get photo URL
        const { data: { publicUrl } } = supabaseAdmin.storage
            .from("report-photos")
            .getPublicUrl(storagePath);

        // Call classify-waste function (if not already classified)
        let predictedClass = body.confirmed_class || null;
        let predictionConfidence = 0;
        let aiAvailable = false;

        if (!predictedClass) {
            try {
                const classifyResponse = await fetch(
                    `${supabaseUrl}/functions/v1/classify-waste`,
                    {
                        method: "POST",
                        headers: {
                            Authorization: authHeader,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ image_base64: body.photo_base64 }),
                    }
                );

                if (classifyResponse.ok) {
                    const classifyResult = await classifyResponse.json();
                    predictedClass = classifyResult.predicted_class;
                    predictionConfidence = classifyResult.confidence;
                    aiAvailable = classifyResult.ai_available;
                }
            } catch (classifyError) {
                console.error("Classification error:", classifyError);
                // Continue without classification
            }
        }

        // Insert report
        const { data: report, error: insertError } = await supabaseUser
            .from("waste_reports")
            .insert({
                id: reportId,
                user_id: user.id,
                neighborhood_id: profile.neighborhood_id,
                status: "pending",
                predicted_class: predictedClass,
                confirmed_class: body.confirmed_class || null,
                prediction_confidence: predictionConfidence,
                ai_available: aiAvailable,
                photo_url: publicUrl,
                photo_path: storagePath,
                latitude: body.latitude,
                longitude: body.longitude,
                address_text: body.address_text || null,
                landmark: body.landmark || null,
                notes: body.notes || null,
                quantity_estimate: body.quantity_estimate || null,
                idempotency_key: body.idempotency_key || null,
            })
            .select()
            .single();

        if (insertError) {
            console.error("Insert error:", insertError);
            // Clean up uploaded photo
            await supabaseAdmin.storage.from("report-photos").remove([storagePath]);
            return new Response(
                JSON.stringify({ success: false, error: "Failed to create report" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Create audit event
        await supabaseAdmin.from("report_events").insert({
            report_id: reportId,
            event_type: "created",
            previous_status: null,
            new_status: "pending",
            actor_id: user.id,
            actor_role: profile.role,
            metadata: {
                ai_available: aiAvailable,
                predicted_class: predictedClass,
            },
        });

        const response: CreateReportResponse = {
            success: true,
            report_id: reportId,
            predicted_class: predictedClass || undefined,
            ai_available: aiAvailable,
            message: "Report created successfully",
        };

        return new Response(
            JSON.stringify(response),
            { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return new Response(
            JSON.stringify({
                success: false,
                error: "Internal server error",
                message: error instanceof Error ? error.message : "Unknown error",
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
