import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

// Create a Supabase client for use in the browser (Client Components)
// Note: @supabase/ssr's createBrowserClient handles internal deduplication,
// so there is no need for a manual singleton pattern.
export function createClient() {
    return createBrowserClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
}
