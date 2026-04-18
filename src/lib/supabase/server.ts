import { createServerClient, type CookieOptions } from "@supabase/ssr";
import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { publicEnv, serverEnv } from "@/lib/env";

// Create a Supabase client for use in Server Components
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Handle cookie setting error in Server Component
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Handle cookie removal error in Server Component
          }
        },
      },
    },
  );
}

/**
 * Create a Supabase admin client (bypasses RLS).
 * Returns `SupabaseClient<any>` because the handwritten `Database` interface uses
 * recursive self-referential `Omit` patterns that cause `insert`/`update` generics
 * to evaluate to `never` in TS 5+. This centralized typing prevents needing
 * `as any` casts on every admin db call.
 */
export function createAdminClient(): SupabaseClient<Database> {
  return createSupabaseClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv().SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
