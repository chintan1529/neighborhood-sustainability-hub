import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Award,
  Star,
  Users,
  Zap,
  Trophy,
  Target,
  Flame,
  Shield,
  Crown,
  Medal,
} from "lucide-react";

export const dynamic = "force-dynamic";

// Badge icon mapping
const BADGE_ICONS: Record<string, any> = {
  first_report: Star,
  recycler: Zap,
  community_hero: Trophy,
  streak_master: Flame,
  eco_warrior: Shield,
  neighborhood_champion: Crown,
  collector_star: Medal,
};

export default async function AdminBadgesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Use admin client to fetch all badge data
  const adminClient = createAdminClient();

  // Fetch all badge definitions
  const { data: badges } = await adminClient
    .from("badges")
    .select("*")
    .order("points_reward", { ascending: true });

  // Fetch badge awards count per badge
  const { data: badgeAwards } = await adminClient
    .from("user_badges")
    .select("badge_id");

  // Count awards per badge
  const awardCounts: Record<string, number> = {};
  badgeAwards?.forEach((award: any) => {
    awardCounts[award.badge_id] = (awardCounts[award.badge_id] || 0) + 1;
  });

  // Total unique users with badges
  const { data: uniqueUsers } = await adminClient
    .from("user_badges")
    .select("user_id")
    .limit(1000);

  const uniqueUserCount = new Set(uniqueUsers?.map((u: any) => u.user_id)).size;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Badges Management</h2>
        <p className="text-muted-foreground">
          View and manage achievement badges
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Badge Types</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              {badges?.length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Badges Awarded</CardDescription>
            <CardTitle className="text-2xl">
              {badgeAwards?.length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Users with Badges</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              {uniqueUserCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Most Popular Badge</CardDescription>
            <CardTitle className="text-2xl text-amber-600">
              {badges?.[0]?.name || "N/A"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Badge Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {badges?.map((badge) => {
          const IconComponent = BADGE_ICONS[badge.slug] || Award;
          const timesAwarded = awardCounts[badge.id] || 0;

          return (
            <Card key={badge.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white">
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{badge.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {(badge.requirements as any)?.type || "Achievement"}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {badge.tier === 5
                      ? "Legendary"
                      : badge.tier === 4
                        ? "Epic"
                        : badge.tier === 3
                          ? "Rare"
                          : badge.tier === 2
                            ? "Uncommon"
                            : "Common"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {badge.description}
                </p>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Target className="h-4 w-4" />
                    <span>{badge.points_reward} pts required</span>
                  </div>
                  <div className="flex items-center gap-1 font-medium">
                    <Users className="h-4 w-4" />
                    <span>{timesAwarded} awarded</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Awards Table */}
      <Card>
        <CardHeader>
          <CardTitle>Badge Definitions</CardTitle>
          <CardDescription>All available badges in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Badge</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Points Required</TableHead>
                <TableHead>Times Awarded</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {badges?.map((badge) => (
                <TableRow key={badge.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-amber-500" />
                      <span className="font-medium">{badge.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">
                    {(badge.requirements as any)?.type || "Achievement"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        badge.tier === 5
                          ? "border-purple-500 text-purple-600"
                          : badge.tier === 4
                            ? "border-blue-500 text-blue-600"
                            : badge.tier >= 3
                              ? "border-green-500 text-green-600"
                              : "border-gray-500 text-gray-600"
                      }
                    >
                      {badge.tier === 5
                        ? "Legendary"
                        : badge.tier === 4
                          ? "Epic"
                          : badge.tier === 3
                            ? "Rare"
                            : badge.tier === 2
                              ? "Uncommon"
                              : "Common"}
                    </Badge>
                  </TableCell>
                  <TableCell>{badge.points_reward}</TableCell>
                  <TableCell>{awardCounts[badge.id] || 0}</TableCell>
                </TableRow>
              ))}
              {(!badges || badges.length === 0) && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No badges configured in the system.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
