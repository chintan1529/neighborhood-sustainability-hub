"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { WasteCategory } from "@/types/database";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export interface CreateListingInput {
  category: WasteCategory;
  weight_kg: number;
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  address_text: string;
  expected_price?: number;
  photos?: string[];
}

export async function createListing(input: CreateListingInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Fetch AI Suggestion to attach to the listing
    const { data: suggestedPrice, error: rpcError } = await (
      supabase as any
    ).rpc("get_suggested_price", {
      p_category: input.category,
      p_location: `POINT(${input.longitude} ${input.latitude})`,
      p_radius_km: 20,
    });

    // Insert listing with PostGIS location
    const { data, error } = await (supabase as any)
      .from("marketplace_listings")
      .insert({
        resident_id: user.id,
        category: input.category,
        weight_kg: input.weight_kg,
        title: input.title,
        description: input.description || null,
        address_text: input.address_text,
        expected_price: input.expected_price || null,
        ai_suggested_price: rpcError ? null : suggestedPrice || null,
        photos: input.photos || [],
        location: `SRID=4326;POINT(${input.longitude} ${input.latitude})`,
        status: "active",
        fraud_flag: false,
        selected_offer_id: null,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/resident/marketplace");
    return { success: true, listing: data };
  } catch (error: any) {
    console.error("Failed to create listing:", error);
    return { success: false, error: error.message };
  }
}

export async function getMarketplaceFeed(options: {
  radius_km?: number;
  category?: WasteCategory;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Find recycler's base location
    const { data: profile } = await (supabase as any)
      .from("recycler_profiles")
      .select("base_location, verification_status")
      .eq("id", user.id)
      .single();

    if (!profile || (profile as any).verification_status !== "approved") {
      return {
        success: false,
        error: "Only verified recyclers can access the feed",
      };
    }

    let query = (supabase as any)
      .from("marketplace_listings")
      .select("*, profiles(full_name, avatar_url)")
      .eq("status", "active");

    if (options.category) {
      query = query.eq("category", options.category);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { success: true, listings: data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function makeOffer(
  listingId: string,
  priceOffered: number,
  proposedPickupTime: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Unauthorized" };

  console.log("[makeOffer] Starting for user:", user.id, "listing:", listingId);

  try {
    const { data: profile } = await (supabase as any)
      .from("recycler_profiles")
      .select("verification_status")
      .eq("id", user.id)
      .single();

    console.log("[makeOffer] Recycler profile:", profile);

    if (!profile || (profile as any).verification_status !== "approved") {
      throw new Error("You must be a verified recycler to make an offer.");
    }

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const insertPayload = {
      listing_id: listingId,
      recycler_id: user.id,
      price_offered: priceOffered,
      proposed_pickup_time: proposedPickupTime,
      status: "pending",
      message: null,
    };
    console.log("[makeOffer] Inserting:", insertPayload);

    const { data, error } = await adminSupabase
      .from("marketplace_offers")
      .insert(insertPayload)
      .select();

    console.log("[makeOffer] Insert result — data:", data, "error:", error);

    if (error) throw error;

    revalidatePath("/recycler/marketplace");
    revalidatePath("/recycler/offers");
    return { success: true };
  } catch (error: any) {
    console.error("[makeOffer] FAILED:", error);
    return { success: false, error: error.message };
  }
}

export async function acceptOffer(offerId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Unauthorized" };

  try {
    // Execute the concurrency-safe RPC
    const { data: transactionId, error } = await (supabase as any).rpc(
      "accept_marketplace_offer",
      {
        p_offer_id: offerId,
        p_resident_id: user.id,
      },
    );

    if (error) throw error;

    revalidatePath("/resident/marketplace");
    return { success: true, transactionId };
  } catch (error: any) {
    console.error("Failed to accept offer:", error);
    return { success: false, error: error.message };
  }
}

export async function completeTransaction(
  transactionId: string,
  paymentMode: "cash" | "upi" | "bank_transfer",
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Unauthorized" };

  try {
    // Verify user is part of transaction
    const { data: tx } = await (supabase as any)
      .from("marketplace_transactions")
      .select("id")
      .eq("id", transactionId)
      .or(`resident_id.eq.${user.id},recycler_id.eq.${user.id}`)
      .single();

    if (!tx) throw new Error("Transaction not found or unauthorized");

    const { error } = await (supabase as any)
      .from("marketplace_transactions")
      .update({
        status: "completed",
        payment_status: "completed",
        payment_mode: paymentMode,
        completed_at: new Date().toISOString(),
      })
      .eq("id", transactionId);

    if (error) throw error;

    revalidatePath("/recycler/transactions");
    revalidatePath("/recycler/pickups");
    revalidatePath("/resident/marketplace");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to complete transaction:", error);
    return { success: false, error: error.message };
  }
}

export async function startPickup(transactionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const { data: tx } = await (supabase as any)
      .from("marketplace_transactions")
      .select("id")
      .eq("id", transactionId)
      .eq("recycler_id", user.id)
      .eq("status", "confirmed")
      .single();

    if (!tx)
      throw new Error("Transaction not found or not in confirmed status");

    const { error } = await (supabase as any)
      .from("marketplace_transactions")
      .update({
        status: "picked_up",
        pickup_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", transactionId);

    if (error) throw error;

    // Also update listing status
    const { data: txData } = await (supabase as any)
      .from("marketplace_transactions")
      .select("listing_id")
      .eq("id", transactionId)
      .single();

    if (txData?.listing_id) {
      await (supabase as any)
        .from("marketplace_listings")
        .update({ status: "picked_up", updated_at: new Date().toISOString() })
        .eq("id", txData.listing_id);
    }

    revalidatePath("/recycler/pickups");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to start pickup:", error);
    return { success: false, error: error.message };
  }
}

export async function completePickup(
  transactionId: string,
  paymentMode: "cash" | "upi" | "bank_transfer",
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const { data: tx } = await (supabase as any)
      .from("marketplace_transactions")
      .select("id, listing_id")
      .eq("id", transactionId)
      .eq("recycler_id", user.id)
      .eq("status", "picked_up")
      .single();

    if (!tx)
      throw new Error("Transaction not found or not in picked_up status");

    const { error } = await (supabase as any)
      .from("marketplace_transactions")
      .update({
        status: "completed",
        payment_mode: paymentMode,
        payment_status: "completed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", transactionId);

    if (error) throw error;

    // Update listing status
    if (tx.listing_id) {
      await (supabase as any)
        .from("marketplace_listings")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", tx.listing_id);
    }

    revalidatePath("/recycler/pickups");
    revalidatePath("/recycler/transactions");
    revalidatePath("/recycler");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to complete pickup:", error);
    return { success: false, error: error.message };
  }
}

export async function verifyRecycler(
  recyclerId: string,
  status: "approved" | "rejected" | "suspended",
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Unauthorized" };

  try {
    // Very basic admin check
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if ((profile as any)?.role !== "admin") {
      throw new Error("Only admins can verify recyclers");
    }

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { error } = await adminSupabase
      .from("recycler_profiles")
      .update({
        verification_status: status,
        verified_at: status === "approved" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", recyclerId);

    if (error) throw error;

    revalidatePath("/admin/recyclers");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to verify recycler:", error);
    return { success: false, error: error.message };
  }
}

export interface VerificationFormData {
  business_name: string;
  tax_id?: string;
  service_radius_km: number;
  accepted_categories: WasteCategory[];
  latitude: number;
  longitude: number;
}

export async function requestRecyclerVerification(data: VerificationFormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Unauthorized" };

  // Instantiate an admin client bypassing RLS for the upsert since the initial schema missed an INSERT policy
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    const { error } = await adminSupabase.from("recycler_profiles").upsert({
      id: user.id, // Primary key
      business_name: data.business_name,
      tax_id: data.tax_id || null,
      service_radius_km: data.service_radius_km,
      accepted_categories: data.accepted_categories,
      base_location: `SRID=4326;POINT(${data.longitude} ${data.latitude})`,
      verification_status: "pending", // Overwrite back to pending for review
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;

    revalidatePath("/recycler/marketplace");
    revalidatePath("/recycler/verification");
    revalidatePath("/admin/recyclers");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to request verification:", error);
    return { success: false, error: error.message };
  }
}
