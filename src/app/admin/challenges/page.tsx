import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { Trash2, Trophy, Users } from "lucide-react";
import { updateChallengeStatus, deleteChallenge } from "@/app/actions/admin";
import { ChallengeFormDialog } from "@/components/admin/challenge-form-dialog";

export const dynamic = "force-dynamic";

export default async function AdminChallengesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Use admin client to fetch all challenges regardless of RLS
  const adminClient = createAdminClient();

  // Fetch all challenges with participant count
  const { data: challenges, error } = await adminClient
    .from("challenges")
    .select(
      `
            *,
            challenge_participants(count)
        `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Fetch challenges error:", error);
  }

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    active: "bg-green-100 text-green-800",
    completed: "bg-blue-100 text-blue-800",
    cancelled: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Challenges Management
          </h2>
          <p className="text-muted-foreground">
            Create and manage community challenges
          </p>
        </div>
        <ChallengeFormDialog />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Challenges</CardDescription>
            <CardTitle className="text-2xl">
              {challenges?.length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {challenges?.filter((c) => c.status === "active").length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Draft</CardDescription>
            <CardTitle className="text-2xl text-gray-600">
              {challenges?.filter((c) => c.status === "draft").length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-2xl text-blue-600">
              {challenges?.filter((c) => c.status === "completed").length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Challenges Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Challenges</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Challenge</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Reward</TableHead>
                <TableHead>Participants</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {challenges?.map((challenge) => (
                <TableRow key={challenge.id}>
                  <TableCell>
                    <div className="font-medium">{challenge.title}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {challenge.description}
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">{challenge.type}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[challenge.status]}>
                      {challenge.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{challenge.target_count} items</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="border-amber-500 text-amber-600"
                    >
                      <Trophy className="h-3 w-3 mr-1" />
                      {challenge.reward_points} pts
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {(challenge.challenge_participants as any)?.[0]?.count ||
                        0}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div>{formatDate(challenge.starts_at)}</div>
                    <div className="text-muted-foreground">
                      to {formatDate(challenge.ends_at)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {challenge.status === "draft" && (
                        <form action={(fd) => void updateChallengeStatus(fd)}>
                          <input
                            type="hidden"
                            name="challengeId"
                            value={challenge.id}
                          />
                          <input type="hidden" name="status" value="active" />
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600"
                          >
                            Activate
                          </Button>
                        </form>
                      )}
                      {challenge.status === "active" && (
                        <form action={(fd) => void updateChallengeStatus(fd)}>
                          <input
                            type="hidden"
                            name="challengeId"
                            value={challenge.id}
                          />
                          <input
                            type="hidden"
                            name="status"
                            value="completed"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-blue-600"
                          >
                            Complete
                          </Button>
                        </form>
                      )}
                      <form action={(fd) => void deleteChallenge(fd)}>
                        <input
                          type="hidden"
                          name="challengeId"
                          value={challenge.id}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!challenges || challenges.length === 0) && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No challenges yet. Create one to get started!
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
