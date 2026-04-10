import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { expireMissedPredictions, getPredictionSummary } from '@/lib/predictive-engine';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const summary = await getPredictionSummary();
        const admin = createAdminClient();

        const adminAny = admin as any;
        const [{ data: feedbackRecords }, { data: cycleMetrics }, { data: thresholds }, { data: routeRuns }] =
            await Promise.all([
                adminAny.from('prediction_feedback_records').select('*').order('evaluated_at', { ascending: false }).limit(50),
                adminAny.from('prediction_cycle_metrics').select('*').order('cycle_ended_at', { ascending: false }).limit(20),
                adminAny.from('prediction_thresholds').select('*').order('updated_at', { ascending: false }),
                adminAny.from('route_run_metrics').select('*').order('created_at', { ascending: false }).limit(20),
            ]);

        return NextResponse.json({
            success: true,
            metrics: summary.metrics,
            feedbackRecords: feedbackRecords ?? [],
            cycleMetrics: cycleMetrics ?? [],
            thresholds: thresholds ?? [],
            routeRuns: routeRuns ?? [],
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
        const typedProfile = profile as { role?: string } | null;

        if (typedProfile?.role !== 'admin') {
            return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
        }

        const result = await expireMissedPredictions();
        return NextResponse.json({ success: true, ...result });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
