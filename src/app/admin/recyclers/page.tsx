import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import RecyclerTable from './recycler-table';

export default async function AdminRecyclersPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if ((profile as any)?.role !== 'admin') redirect('/');

    // Fetch all recyclers
    const { data: recyclers, error } = await (supabase as any)
        .from('recycler_profiles')
        .select(`
            *,
            profiles!recycler_profiles_id_fkey(full_name, phone)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching recyclers:', error);
    }

    return (
        <div className="container max-w-6xl py-8 space-y-6 animate-in fade-in zoom-in-95 duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Recycler Network Management</h1>
                <p className="text-muted-foreground mt-1">Review, approve, and manage marketplace recyclers & scrap dealers.</p>
            </div>

            <div className="bg-white dark:bg-zinc-950 rounded-xl border shadow-sm overflow-hidden p-4">
                {error ? (
                    <div className="text-red-500 font-mono text-sm max-w-full overflow-auto">
                        <h4 className="font-bold">Database Error:</h4>
                        <pre>{JSON.stringify(error, null, 2)}</pre>
                    </div>
                ) : (
                    <RecyclerTable recyclers={recyclers || []} />
                )}
            </div>
        </div>
    );
}
