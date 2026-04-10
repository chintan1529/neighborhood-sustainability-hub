import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Brain } from 'lucide-react';

const RouteOptimizerMap = dynamic(
    () => import('@/components/dashboard/route-optimizer-map'),
    {
        ssr: false,
        loading: () => (
            <div className="space-y-6">
                <Skeleton className="h-10 w-72" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-24 rounded-xl" />
                    ))}
                </div>
                <Skeleton className="h-[550px] rounded-xl" />
            </div>
        ),
    }
);

export default async function SmartRoutesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/auth/login');

    // Verify collector role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, neighborhood_id')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'collector') redirect('/');

    // Fetch active reports in the collector's neighborhood
    const query = supabase
        .from('waste_reports')
        .select('id, latitude, longitude, status, predicted_class, confirmed_class, address_text, quantity_estimate, created_at, notes')
        .in('status', ['pending', 'assigned', 'in_progress'])
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .order('created_at', { ascending: true });

    if (profile?.neighborhood_id) {
        query.eq('neighborhood_id', profile.neighborhood_id);
    }

    const { data: reports } = await query;

    // Default center: first report or Bangalore
    const defaultCenter: [number, number] =
        reports && reports.length > 0
            ? [reports[0].latitude, reports[0].longitude]
            : [12.9716, 77.5946];

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="relative overflow-hidden rounded-2xl gradient-mesh border border-border/40 p-6 md:p-8">
                <div className="absolute -top-16 -right-16 w-48 h-48 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg flex-shrink-0">
                        <Brain className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                                AI Smart Routes
                            </h2>
                            <Sparkles className="h-5 w-5 text-emerald-500 animate-pulse" />
                        </div>
                        <p className="text-muted-foreground text-sm max-w-lg leading-relaxed">
                            Let AI optimize your collection route. It analyzes waste urgency, location proximity, and report age to find the fastest path through all pickups.
                        </p>
                    </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-px shimmer-line" />
            </div>

            {/* Route Optimizer */}
            <RouteOptimizerMap
                reports={reports || []}
                defaultCenter={defaultCenter}
            />
        </div>
    );
}
