import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trophy, Calendar, Users } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { joinChallenge } from '@/app/actions/challenges';

// Force dynamic rendering to always show fresh participation data
export const dynamic = 'force-dynamic';

export default async function ChallengesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    // Fetch active challenges
    const { data: challenges, error: challengesError } = await supabase
        .from('challenges')
        .select('*')
        .eq('status', 'active');

    if (challengesError) {
        console.error('Challenges fetch error:', challengesError);
    }

    // Fetch user participation
    let participations: any[] = [];
    if (challenges && challenges.length > 0) {
        const challengeIds = challenges.map(c => c.id);
        console.log('Fetching participations for user:', user.id, 'challenges:', challengeIds);

        const { data: p, error: pError } = await supabase
            .from('challenge_participants')
            .select('*')
            .eq('user_id', user.id)
            .in('challenge_id', challengeIds);

        if (pError) {
            console.error('Participations fetch error:', pError);
        }
        console.log('Participations found:', p);
        participations = p || [];
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Challenges</h2>
                <p className="text-muted-foreground">
                    Join challenges to earn bonus points and badges!
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {challenges?.map((challenge) => {
                    const participation = participations.find(p => p.challenge_id === challenge.id);
                    const isEnrolled = !!participation;
                    const progress = participation
                        ? Math.min((participation.current_count / challenge.target_count) * 100, 100)
                        : 0;

                    return (
                        <Card key={challenge.id} className="flex flex-col">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-xl">{challenge.title}</CardTitle>
                                    <Badge variant="outline" className="flex items-center gap-1 border-nhs-amber text-nhs-amber">
                                        <Trophy className="h-3 w-3" />
                                        {challenge.reward_points} pts
                                    </Badge>
                                </div>
                                <CardDescription className="line-clamp-2">
                                    {challenge.description}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 space-y-4">
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        <span>Ends {formatDate(challenge.ends_at)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4" />
                                        <span>{challenge.neighborhood_id ? 'Neighborhood Exclusive' : 'Global Challenge'}</span>
                                    </div>
                                </div>

                                {isEnrolled && (
                                    <div className="space-y-1 pt-2">
                                        <div className="flex justify-between text-xs font-medium">
                                            <span>Progress</span>
                                            <span>{Math.round(progress)}%</span>
                                        </div>
                                        <Progress value={progress} className="h-2" />
                                        <p className="text-xs text-muted-foreground text-center pt-1">
                                            {participation.current_count} of {challenge.target_count} items reported
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="pt-0">
                                {isEnrolled ? (
                                    <Button className="w-full" variant="secondary" disabled>
                                        {progress >= 100 ? 'Completed' : 'Enrolled'}
                                    </Button>
                                ) : (
                                    <form action={(fd) => void joinChallenge(fd)} className="w-full">
                                        <input type="hidden" name="challengeId" value={challenge.id} />
                                        <Button type="submit" className="w-full">Join Challenge</Button>
                                    </form>
                                )}
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}

