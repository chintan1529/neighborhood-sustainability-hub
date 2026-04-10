import { NextRequest, NextResponse } from 'next/server';
import { getPredictionSummary } from '@/lib/predictive-engine';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = Number(searchParams.get('limit') ?? '6');
        const status = searchParams.get('status');
        const { predictions, metrics } = await getPredictionSummary();

        const filtered = (predictions as Array<{ status: string }>)
            .filter((prediction) => (status ? prediction.status === status : true))
            .slice(0, Math.max(1, limit));

        const feedbackStatement =
            metrics.accuracy !== null
                ? `Closed-loop feedback active: ${metrics.accuracy}% of generated hotspots have been verified so far.`
                : 'Closed-loop feedback active: waiting for more verified reports to stabilize hotspot accuracy.';

        return NextResponse.json({
            success: true,
            predictions: filtered,
            metrics,
            feedbackStatement,
        });
    } catch (error: any) {
        console.error('Predicted hotspots fetch error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
