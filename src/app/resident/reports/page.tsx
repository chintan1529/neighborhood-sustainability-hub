import { createClient } from '@/lib/supabase/server';
import { ReportsTable } from '@/components/dashboard/reports-table';

export default async function MyReportsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: reports } = await supabase
        .from('waste_reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">My Reports</h2>
                    <p className="text-muted-foreground">
                        History of your waste reports and their status.
                    </p>
                </div>
            </div>
            <ReportsTable reports={reports || []} />
        </div>
    );
}
