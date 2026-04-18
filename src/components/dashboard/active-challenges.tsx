import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Trophy, Target, Sparkles } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface ActiveChallengesProps {
  challenges: any[];
}

export function ActiveChallenges({ challenges }: ActiveChallengesProps) {
  return (
    <Card className="col-span-1 shadow-subtle hover:shadow-soft transition-all duration-300 overflow-hidden border border-border/60 relative">
      {/* Header gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 opacity-60" />

      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md">
            <Trophy className="h-4 w-4 text-white" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">
              Active Challenges
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Earn bonus points
            </p>
          </div>
        </div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-xs hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:text-amber-600"
        >
          <Link href="/resident/challenges">
            View All <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-4">
          {challenges.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center mb-4">
                <Target className="h-8 w-8 text-amber-500/50" />
              </div>
              <p className="font-medium text-sm text-muted-foreground mb-1">
                No active challenges
              </p>
              <p className="text-xs text-muted-foreground/70 max-w-[200px]">
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
                  className="group relative rounded-xl border border-border/50 p-4 hover:border-border hover:bg-muted/20 transition-all duration-200"
                >
                  {/* Challenge header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm truncate">
                        {challenge.title}
                      </h4>
                      <span className="text-xs text-muted-foreground">
                        Ends {formatDate(challenge.ends_at)}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1 border-amber-400/50 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 text-xs font-semibold px-2.5 shadow-sm"
                    >
                      <Sparkles className="h-3 w-3" />
                      {challenge.reward_points} pts
                    </Badge>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="h-2.5 rounded-full bg-muted/80 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${
                          isCompleted
                            ? "bg-gradient-to-r from-emerald-500 to-green-500"
                            : "bg-gradient-to-r from-amber-500 to-orange-500"
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground font-medium">
                        {participation?.current_count || 0}
                        <span className="text-muted-foreground/60">
                          {" "}
                          / {challenge.target_count} items
                        </span>
                      </span>
                      <span
                        className={`font-semibold ${isCompleted ? "text-emerald-600" : "text-muted-foreground"}`}
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
