import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Trophy, Target } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface ActiveChallengesProps {
  challenges: any[];
}

export function ActiveChallenges({ challenges }: ActiveChallengesProps) {
  return (
    <Card className="col-span-1">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-2.5">
          <Trophy className="h-4 w-4 text-muted-foreground" />
          <div>
            <CardTitle>Active Challenges</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Earn bonus points
            </p>
          </div>
        </div>
        <Button asChild variant="ghost" size="sm" className="text-xs">
          <Link href="/resident/challenges">
            View All <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {challenges.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-3">
                <Target className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="font-medium text-sm text-muted-foreground mb-1">
                No active challenges
              </p>
              <p className="text-xs text-muted-foreground max-w-[200px]">
                Check back soon for new sustainability challenges!
              </p>
            </div>
          ) : (
            challenges.map((challenge) => {
              const participation = challenge.participation;
              const progress = participation
                ? Math.min(
                    (participation.current_count / challenge.target_count) *
                      100,
                    100,
                  )
                : 0;
              const isCompleted = progress >= 100;

              return (
                <div
                  key={challenge.id}
                  className="rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors duration-150"
                >
                  {/* Challenge header */}
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">
                        {challenge.title}
                      </h4>
                      <span className="text-xs text-muted-foreground">
                        Ends {formatDate(challenge.ends_at)}
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-[11px]">
                      {challenge.reward_points} pts
                    </Badge>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCompleted
                            ? "bg-emerald-500"
                            : "bg-foreground/20"
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground tabular-nums">
                        {participation?.current_count || 0} / {challenge.target_count}
                      </span>
                      <span
                        className={`font-medium tabular-nums ${isCompleted ? "text-emerald-600" : "text-muted-foreground"}`}
                      >
                        {Math.round(progress)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
