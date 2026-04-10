import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfileForm } from '@/components/profile/profile-form';

export default async function ProfilePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    const { data: userBadges } = await supabase
        .from('user_badges')
        .select('*, badges(*)')
        .eq('user_id', user.id);

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Profile</h2>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Left Column: Interactive Form */}
                <ProfileForm user={user} profile={profile} />

                {/* Right Column: Read-only Stats & Badges */}
                <div className="space-y-6">
                    {/* Badges Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle>My Badges</CardTitle>
                            <CardDescription>Achievements you've earned</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-3 gap-4">
                                {userBadges?.length === 0 ? (
                                    <p className="text-sm text-muted-foreground col-span-3 text-center py-4">
                                        No badges earned yet. Keep reporting!
                                    </p>
                                ) : (
                                    (userBadges as any[])?.map((ub) => (
                                        <div key={ub.id} className="flex flex-col items-center text-center p-2 border rounded-lg bg-muted/20">
                                            <div className="relative h-12 w-12 mb-2">
                                                <div className="w-full h-full rounded-full bg-primary/20 flex items-center justify-center text-xl">
                                                    🏆
                                                </div>
                                            </div>
                                            <span className="text-xs font-semibold">{ub.badges?.name}</span>
                                            <span className="text-[10px] text-muted-foreground">{ub.badges?.tier} Tier</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Stats Summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Account Stats</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col items-center p-4 bg-muted/20 rounded-lg">
                                <span className="text-2xl font-bold">{profile?.total_points || 0}</span>
                                <span className="text-xs text-muted-foreground uppercase">Points</span>
                            </div>
                            <div className="flex flex-col items-center p-4 bg-muted/20 rounded-lg">
                                <span className="text-2xl font-bold">{profile?.reports_count || 0}</span>
                                <span className="text-xs text-muted-foreground uppercase">Reports</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
