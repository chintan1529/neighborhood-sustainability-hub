// ============================================================================
// Centralized Authentication & Authorization Helpers
// Use these in Server Actions and API Routes to eliminate boilerplate.
// ============================================================================

import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

export interface AuthenticatedUser {
  id: string;
  email: string;
}

export interface AuthenticatedProfile {
  user: AuthenticatedUser;
  profile: {
    role: UserRole;
    neighborhood_id: string | null;
    full_name: string | null;
  };
}

export type AuthResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Require an authenticated user. Returns the user or an error object.
 * Use in any server action or API route.
 *
 * @example
 * const auth = await requireAuth();
 * if (!auth.success) return { error: auth.error };
 * const { user, profile } = auth.data;
 */
export async function requireAuth(): Promise<AuthResult<AuthenticatedProfile>> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Not authenticated" };
  }

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("role, neighborhood_id, full_name")
    .eq("id", user.id)
    .single();

  const profile = profileData as {
    role: string;
    neighborhood_id: string | null;
    full_name: string | null;
  } | null;

  if (profileError || !profile) {
    return { success: false, error: "Profile not found" };
  }

  return {
    success: true,
    data: {
      user: { id: user.id, email: user.email! },
      profile: {
        role: profile.role as UserRole,
        neighborhood_id: profile.neighborhood_id,
        full_name: profile.full_name,
      },
    },
  };
}

/**
 * Require an authenticated admin user. Returns the user+profile or an error.
 * Also returns a typed admin Supabase client that bypasses RLS.
 *
 * @example
 * const auth = await requireAdmin();
 * if (!auth.success) return { error: auth.error };
 * const { adminClient, user, profile } = auth.data;
 */
export async function requireAdmin(): Promise<
  AuthResult<
    AuthenticatedProfile & { adminClient: ReturnType<typeof createAdminClient> }
  >
> {
  const authResult = await requireAuth();

  if (!authResult.success) {
    return authResult;
  }

  if (authResult.data.profile.role !== "admin") {
    return { success: false, error: "Unauthorized — Admin access required" };
  }

  return {
    success: true,
    data: {
      ...authResult.data,
      adminClient: createAdminClient(),
    },
  };
}

/**
 * Require a specific role. Returns the user+profile or an error.
 *
 * @example
 * const auth = await requireRole('collector');
 * if (!auth.success) return { error: auth.error };
 */
export async function requireRole(
  role: UserRole,
): Promise<AuthResult<AuthenticatedProfile>> {
  const authResult = await requireAuth();

  if (!authResult.success) {
    return authResult;
  }

  if (authResult.data.profile.role !== role) {
    return {
      success: false,
      error: `Unauthorized — ${role.charAt(0).toUpperCase() + role.slice(1)} access required`,
    };
  }

  return authResult;
}
