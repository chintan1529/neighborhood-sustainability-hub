import { createClient } from "@/lib/supabase/server";
import { NeighborhoodLeaderboard } from "@/components/dashboard/neighborhood-leaderboard";
import { Trophy, Users, Leaf } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NeighborhoodsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch user's profile to find their neighborhood
  const { data: profile } = await supabase
    .from("profiles")
    .select("neighborhood_id, total_points")
    .eq("id", user.id)
    .single();

  // Fetch all active neighborhoods
  const { data: neighborhoods } = await supabase
    .from("neighborhoods")
    .select("id, name, city");

  const nhMap = new Map(
    neighborhoods?.map((n) => [
      n.id,
      { ...n, totalScore: 0, residents: 0, verifiedReports: 0 },
    ]),
  );

  // Fetch profile stats
  const { data: profiles } = await supabase
    .from("profiles")
    .select("neighborhood_id, total_points, reports_count")
    .eq("role", "resident");

  (profiles || []).forEach((p) => {
    if (p.neighborhood_id && nhMap.has(p.neighborhood_id)) {
      const nh = nhMap.get(p.neighborhood_id)!;
      nh.residents += 1;
      nh.totalScore += p.total_points || 0;
      nh.verifiedReports += p.reports_count || 0;
    }
  });

  const leaderboardRaw = Array.from(nhMap.values()).sort(
    (a, b) => b.totalScore - a.totalScore,
  );

  const myNeighborhoodRank =
    leaderboardRaw.findIndex((n) => n.id === profile?.neighborhood_id) + 1;
  const myNeighborhood = leaderboardRaw.find(
    (n) => n.id === profile?.neighborhood_id,
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
          Neighborhood Wars <Trophy className="h-7 w-7 text-amber-500" />
        </h2>
        <p className="text-muted-foreground mt-1">
          Compete collectively with your neighbors to be the greenest district
          in your city!
        </p>
      </div>

      {myNeighborhood && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute -right-4 -top-4 opacity-20">
              <Trophy className="w-32 h-32" />
            </div>
            <p className="text-amber-100 font-medium tracking-wide text-sm uppercase mb-1">
              Your Rank
            </p>
            <div className="flex items-end gap-2">
              <p className="text-5xl font-black">#{myNeighborhoodRank}</p>
              <p className="text-xl font-medium opacity-90 pb-1">
                of {leaderboardRaw.length}
              </p>
            </div>
            <p className="mt-4 font-medium text-lg text-white drop-shadow-sm">
              {myNeighborhood.name}, {myNeighborhood.city}
            </p>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute -right-4 -top-4 opacity-20">
              <Leaf className="w-32 h-32" />
            </div>
            <p className="text-emerald-100 font-medium tracking-wide text-sm uppercase mb-1">
              Total Impact Score
            </p>
            <p className="text-4xl font-black">
              {myNeighborhood.totalScore.toLocaleString()}
            </p>
            <p className="mt-4 text-emerald-50 text-sm">
              Combined points from {myNeighborhood.residents} residents
            </p>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute -right-4 -top-4 opacity-20">
              <Users className="w-32 h-32" />
            </div>
            <p className="text-blue-100 font-medium tracking-wide text-sm uppercase mb-1">
              Collective Cleanups
            </p>
            <p className="text-4xl font-black">
              {myNeighborhood.verifiedReports.toLocaleString()}
            </p>
            <p className="mt-4 text-blue-50 text-sm">
              Verified waste pickups completed
            </p>
          </div>
        </div>
      )}

      <NeighborhoodLeaderboard
        data={leaderboardRaw}
        userNeighborhoodId={profile?.neighborhood_id}
      />
    </div>
  );
}
