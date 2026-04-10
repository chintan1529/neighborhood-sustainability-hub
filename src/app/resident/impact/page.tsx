import { createClient } from '@/lib/supabase/server';
import { ImpactDashboard } from '@/components/dashboard/impact-dashboard';
import { Leaf } from 'lucide-react';

export const metadata = {
    title: 'My Impact — Environmental Dashboard',
    description: 'Track your personal environmental contribution and sustainability impact',
};

export default async function ImpactPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    // Fetch profile stats
    const { data: profile } = await supabase
        .from('profiles')
        .select('total_points, current_streak, reports_count, full_name')
        .eq('id', user.id)
        .single();



    // Fetch category breakdown
    const { data: reports } = await supabase
        .from('waste_reports')
        .select('category')
        .eq('user_id', user.id);

    // Group by category
    const categoryMap: Record<string, number> = {};
    (reports || []).forEach((r: any) => {
        const cat = r.category || 'mixed';
        categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    });
    const categoryBreakdown = Object.entries(categoryMap)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);

    // Fetch monthly activity (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const { data: monthlyReports } = await supabase
        .from('waste_reports')
        .select('created_at')
        .eq('user_id', user.id)
        .gte('created_at', sixMonthsAgo.toISOString());

    // Group by month
    const monthlyMap: Record<string, number> = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        monthlyMap[key] = 0;
    }

    (monthlyReports || []).forEach((r: any) => {
        const d = new Date(r.created_at);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (key in monthlyMap) {
            monthlyMap[key]++;
        }
    });

    const monthlyActivity = Object.entries(monthlyMap).map(([key, count]) => {
        const [, monthIdx] = key.split('-');
        return { month: monthNames[parseInt(monthIdx)], count };
    });



    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-green-100 dark:bg-green-950/50 flex items-center justify-center">
                    <Leaf className="h-5 w-5 text-green-600" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">My Impact</h2>
                    <p className="text-muted-foreground text-sm">
                        Your personal environmental contribution
                    </p>
                </div>
            </div>

            <ImpactDashboard
                totalReports={profile?.reports_count || 0}
                totalPoints={profile?.total_points || 0}
                currentStreak={profile?.current_streak || 0}
                categoryBreakdown={categoryBreakdown}
                monthlyActivity={monthlyActivity}
            />
        </div>
    );
}
