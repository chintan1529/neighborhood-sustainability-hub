import { createClient, createAdminClient } from '@/lib/supabase/server';
import { TransferStationsClient } from './client';

export const dynamic = 'force-dynamic';

export default async function TransferStationsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const admin = createAdminClient();

    const { data: stations } = await admin
        .from('transfer_stations')
        .select('*')
        .order('code', { ascending: true });

    // Get recent waste reports for load estimation
    const { data: recentReports } = await admin
        .from('waste_reports')
        .select('latitude, longitude, confirmed_class, created_at')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .eq('status', 'completed');

    return (
        <TransferStationsClient
            stations={stations as any || []}
            recentReports={recentReports as any || []}
        />
    );
}
