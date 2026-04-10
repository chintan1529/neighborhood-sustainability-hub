import { NextResponse } from 'next/dist/server/web/spec-extension/response';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const adminSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        );
        const { data, error } = await adminSupabase.from('recycler_profiles').select('*');
        return NextResponse.json({ success: true, data, error });
    } catch (e: any) {
        return NextResponse.json({ success: false, e: e.message });
    }
}
