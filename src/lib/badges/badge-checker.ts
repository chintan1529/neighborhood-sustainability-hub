import { createClient } from '@supabase/supabase-js';

// Admin client that bypasses RLS
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface BadgeDefinition {
    id: string;
    name: string;
    slug: string;
    description: string;
    icon_url?: string;
    color: string;
    requirements: {
        type: string;
        threshold: number;
        category?: string;
    };
    points_reward: number;
    tier: number;
}

export async function checkAndAwardBadges(userId: string) {
    try {
        const unlockedBadges: BadgeDefinition[] = [];

        // 1. Get user profile stats & reports
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('reports_count, current_streak, total_points')
            .eq('id', userId)
            .single();

        if (!profile) return [];

        // 2. Fetch all badges user doesn't have yet
        const { data: userBadges } = await supabaseAdmin
            .from('user_badges')
            .select('badge_id')
            .eq('user_id', userId);

        const earnedIds = userBadges?.map((b) => b.badge_id) || [];

        let query = supabaseAdmin.from('badges').select('*').eq('is_active', true);
        if (earnedIds.length > 0) {
            // using filter not.in instead of .not('id', 'in', ...) 
            query = query.not('id', 'in', `(${earnedIds.join(',')})`);
        }

        const { data: availableBadges, error: badgeError } = await query;
        if (badgeError || !availableBadges) {
            console.error('Fetch available badges error:', badgeError);
            return [];
        }

        // 3. Evaluate requirements
        for (const badge of availableBadges as BadgeDefinition[]) {
            let qualifies = false;
            const req = badge.requirements;

            if (req.type === 'reports_count') {
                qualifies = (profile.reports_count || 0) >= req.threshold;
            } else if (req.type === 'streak') {
                qualifies = (profile.current_streak || 0) >= req.threshold;
            } else if (req.type === 'category_count' && req.category) {
                // Fetch count for specific category
                const { count } = await supabaseAdmin
                    .from('waste_reports')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', userId)
                    .or(`confirmed_class.eq.${req.category},predicted_class.eq.${req.category}`);
                
                qualifies = (count || 0) >= req.threshold;
            }

            if (qualifies) {
                // Award the badge
                await supabaseAdmin.from('user_badges').insert({
                    user_id: userId,
                    badge_id: badge.id,
                    points_awarded: badge.points_reward,
                });

                // Add points
                await supabaseAdmin.from('profiles').update({
                    total_points: (profile.total_points || 0) + badge.points_reward
                }).eq('id', userId);

                // Re-fetch profile for accurate accumulation since we're in a loop
                profile.total_points += badge.points_reward;
                
                unlockedBadges.push(badge);
            }
        }

        return unlockedBadges;

    } catch (error) {
        console.error('Badge checker error:', error);
        return [];
    }
}
