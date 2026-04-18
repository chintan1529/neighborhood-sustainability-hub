"use client";

import { Trophy, TrendingUp, Users, Leaf, Medal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface NeighborhoodData {
  id: string;
  name: string;
  city: string;
  totalScore: number;
  residents: number;
  verifiedReports: number;
}

interface LeaderboardProps {
  data: NeighborhoodData[];
  userNeighborhoodId?: string | null;
}

export function NeighborhoodLeaderboard({
  data,
  userNeighborhoodId,
}: LeaderboardProps) {
  if (!data || data.length === 0) return null;

  return (
    <Card className="border border-border/50 shadow-sm overflow-hidden">
      <CardContent className="p-0">
        <div className="divide-y divide-border/50">
          <div className="grid grid-cols-12 gap-4 p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
            <div className="col-span-1 text-center">Rank</div>
            <div className="col-span-4 pl-2">Neighborhood</div>
            <div className="col-span-3 justify-end flex">Impact Score</div>
            <div className="col-span-2 justify-end flex">Residents</div>
            <div className="col-span-2 justify-end flex pr-4">Reports</div>
          </div>

          {data.map((neighborhood, index) => {
            const isUserNh = neighborhood.id === userNeighborhoodId;
            const isTop3 = index < 3;

            return (
              <div
                key={neighborhood.id}
                className={`grid grid-cols-12 gap-4 p-4 items-center transition-colors hover:bg-muted/40 ${isUserNh ? "bg-primary/5 dark:bg-primary/10" : ""}`}
              >
                {/* Rank */}
                <div className="col-span-1 flex justify-center">
                  {index === 0 ? (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                      <Trophy className="w-4 h-4 text-white" />
                    </div>
                  ) : index === 1 ? (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center shadow-md">
                      <Medal className="w-4 h-4 text-white" />
                    </div>
                  ) : index === 2 ? (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-700 flex items-center justify-center shadow-md">
                      <Medal className="w-4 h-4 text-white" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                      {index + 1}
                    </div>
                  )}
                </div>

                {/* Neighborhood Name */}
                <div className="col-span-4 pl-2 flex flex-col justify-center">
                  <div className="flex items-center gap-2">
                    <p
                      className={`font-semibold ${isTop3 ? "text-foreground" : "text-muted-foreground"} ${isUserNh ? "text-primary" : ""}`}
                    >
                      {neighborhood.name}
                    </p>
                    {isUserNh && (
                      <Badge
                        variant="default"
                        className="bg-primary/20 text-primary border-primary/30 text-[9px] px-1.5 py-0 h-4 min-w-[40px] flex items-center justify-center"
                      >
                        YOURS
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {neighborhood.city}
                  </p>
                </div>

                {/* Impact Score */}
                <div className="col-span-3 text-right font-black tracking-tight flex items-center justify-end gap-1.5">
                  <TrendingUp
                    className={`w-4 h-4 ${isTop3 ? "text-emerald-500" : "text-muted-foreground/50"}`}
                  />
                  <span
                    className={
                      isTop3
                        ? "text-lg text-emerald-600 dark:text-emerald-400"
                        : "text-foreground"
                    }
                  >
                    {neighborhood.totalScore.toLocaleString()}
                  </span>
                </div>

                {/* Residents */}
                <div className="col-span-2 text-right text-sm text-muted-foreground flex items-center justify-end gap-1">
                  <Users className="w-3.5 h-3.5 opacity-50" />
                  {neighborhood.residents}
                </div>

                {/* Verified Reports */}
                <div className="col-span-2 text-right pr-4 text-sm text-muted-foreground flex items-center justify-end gap-1">
                  <Leaf className="w-3.5 h-3.5 opacity-50" />
                  {neighborhood.verifiedReports}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
