// Supabase Edge Function: classify-waste
// Uses Hugging Face garbage classification model for accurate waste categorization

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Types
interface ClassificationResult {
  predicted_class: string;
  confidence: number;
  ai_available: boolean;
  all_predictions?: Array<{ label: string; score: number }>;
  cached?: boolean;
}

interface HuggingFaceResult {
  label: string;
  score: number;
}

// Our app's waste categories
const WASTE_CATEGORIES = [
  "cardboard",
  "metal",
  "paper",
  "plastic",
  "glass",
  "organic",
  "mixed",
] as const;

// Map model output labels to our categories
const CATEGORY_MAP: Record<string, string> = {
  // From yangy50/garbage-classification
  cardboard: "cardboard",
  metal: "metal",
  paper: "paper",
  plastic: "plastic",
  glass: "glass",
  trash: "mixed",
  // From kendrickfff/my_resnet50_garbage_classification
  biological: "organic",
  "brown-glass": "glass",
  "green-glass": "glass",
  "white-glass": "glass",
  clothes: "mixed",
  shoes: "mixed",
  batteries: "metal",
  // Generic mappings
  organic: "organic",
  compost: "organic",
  mixed: "mixed",
};

// Simple in-memory cache (per instance)
const cache = new Map<
  string,
  { result: ClassificationResult; timestamp: number }
>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Rate limiting per user
const rateLimits = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // requests per window
const RATE_WINDOW = 60 * 1000; // 1 minute

// CORS headers — restrict to configured origin in production
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Hash function for cache key
async function hashImage(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .substring(0, 16);
}

// Rate limit check
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimits.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimits.set(userId, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT) {
    return false;
  }

  userLimit.count++;
  return true;
}

// Map HuggingFace labels to our categories
function mapToCategory(label: string): string {
  const normalized = label.toLowerCase().trim();
  return CATEGORY_MAP[normalized] || "mixed";
}

// Call Hugging Face Inference API with a waste classification model
async function classifyWithHuggingFace(
  imageData: ArrayBuffer,
  apiToken: string,
): Promise<HuggingFaceResult[]> {
  // Use a dedicated garbage/waste classification model
  // This model has 95% accuracy on waste classification
  const MODEL_URL =
    "https://api-inference.huggingface.co/models/yangy50/garbage-classification";

  const response = await fetch(MODEL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/octet-stream",
    },
    body: imageData,
  });

  if (!response.ok) {
    const errorText = await response.text();

    // Handle model loading (503)
    if (response.status === 503) {
      console.log("Model is loading, returning fallback...");
      throw new Error("Model is loading, please try again in a moment");
    }

    throw new Error(`HuggingFace API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate request method
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get auth token and create Supabase client
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit check
    if (!checkRateLimit(user.id)) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          message: "Please wait a moment before trying again",
          predicted_class: null,
          ai_available: false,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get image from request body
    const contentType = req.headers.get("content-type") || "";
    let imageData: ArrayBuffer;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("image") as File;
      if (!file) {
        return new Response(JSON.stringify({ error: "No image provided" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      imageData = await file.arrayBuffer();
    } else if (contentType.includes("application/json")) {
      const body = await req.json();

      // Support both "image" and "image_base64" field names
      const base64Input = body.image || body.image_base64;
      if (!base64Input) {
        return new Response(
          JSON.stringify({ error: "No image or image_base64 provided" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Decode base64
      const base64Data = base64Input.replace(/^data:image\/\w+;base64,/, "");
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      imageData = bytes.buffer;
    } else {
      imageData = await req.arrayBuffer();
    }

    // Check cache
    const imageHash = await hashImage(imageData);
    const cached = cache.get(imageHash);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`Cache hit for image: ${imageHash}`);
      return new Response(JSON.stringify({ ...cached.result, cached: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get HuggingFace API token
    const hfToken = Deno.env.get("HUGGING_FACE_API_TOKEN");
    if (!hfToken) {
      console.error("HUGGING_FACE_API_TOKEN not configured");
      return new Response(
        JSON.stringify({
          predicted_class: null,
          confidence: 0,
          ai_available: false,
          message:
            "AI classification unavailable, please select category manually",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Call HuggingFace
    try {
      const predictions = await classifyWithHuggingFace(imageData, hfToken);

      console.log("Raw predictions:", JSON.stringify(predictions));

      // Map predictions to our categories
      const mappedPredictions = predictions.map((p) => ({
        label: mapToCategory(p.label),
        originalLabel: p.label,
        score: p.score,
      }));

      // Aggregate scores by category (in case multiple labels map to same category)
      const categoryScores: Record<string, number> = {};
      for (const pred of mappedPredictions) {
        categoryScores[pred.label] =
          (categoryScores[pred.label] || 0) + pred.score;
      }

      // Find best category
      let bestCategory = "mixed";
      let bestScore = 0;
      for (const [category, score] of Object.entries(categoryScores)) {
        if (score > bestScore && WASTE_CATEGORIES.includes(category as any)) {
          bestCategory = category;
          bestScore = score;
        }
      }

      const result: ClassificationResult = {
        predicted_class: bestCategory,
        confidence: Math.min(bestScore, 1),
        ai_available: true,
        all_predictions: Object.entries(categoryScores)
          .map(([label, score]) => ({ label, score }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 5),
      };

      // Cache result
      cache.set(imageHash, { result, timestamp: Date.now() });

      console.log(
        `Classified as: ${bestCategory} (${(bestScore * 100).toFixed(1)}%)`,
      );

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (hfError) {
      console.error("HuggingFace API error:", hfError);
      return new Response(
        JSON.stringify({
          predicted_class: null,
          confidence: 0,
          ai_available: false,
          message:
            "AI classification temporarily unavailable, please select category manually",
          error: hfError instanceof Error ? hfError.message : "Unknown error",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
        predicted_class: null,
        ai_available: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
