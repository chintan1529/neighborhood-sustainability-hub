import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const PriorityQueueClient = dynamic(
    () => import('@/components/dashboard/priority-queue-client'),
    {
        ssr: false,
        loading: () => (
            <div className="space-y-6">
                <Skeleton className="h-10 w-64" />
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-20 rounded-xl" />
                    ))}
                </div>
                <Skeleton className="h-10 w-full" />
                <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-24 rounded-xl" />
                    ))}
                </div>
            </div>
        ),
    }
);

import { PredictedHotspots } from '@/components/collector/predicted-hotspots';

export default function CollectorQueuePage() {
    return (
        <div className="space-y-8">
            <header className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Collector Pickup Queue</h1>
                <p className="text-muted-foreground">Manage and optimize your daily waste collection route.</p>
            </header>

            {/* AI Proactive Recommendations Section */}
            <PredictedHotspots />

            <div className="bg-white dark:bg-slate-950 rounded-xl border border-border shadow-sm p-6">
                <PriorityQueueClient />
            </div>
        </div>
    );
}
