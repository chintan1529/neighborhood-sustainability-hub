import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDate, getInitials } from "@/lib/utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Users, UserCheck, Shield, Truck } from "lucide-react";
import Link from "next/link";
import { updateUserProfile } from "@/app/actions/admin";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Use admin client to fetch all profiles
  const adminClient = createAdminClient();

  const { data: profiles, error } = await adminClient
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Fetch profiles error:", error);
  }

  // Calculate stats
  const totalUsers = profiles?.length || 0;
  const residents = profiles?.filter((p) => p.role === "resident").length || 0;
  const collectors =
    profiles?.filter((p) => p.role === "collector").length || 0;
  const admins = profiles?.filter((p) => p.role === "admin").length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Users Management</h2>
        <Link href="/admin/export">
          <Button>Export CSV</Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Users</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              {totalUsers}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Residents</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-500" />
              {residents}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Collectors</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Truck className="h-5 w-5 text-amber-500" />
              {collectors}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Admins</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-500" />
              {admins}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Points</TableHead>
              <TableHead>Reports</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles?.map((profile: any) => (
              <TableRow key={profile.id}>
                <TableCell className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile.avatar_url || ""} />
                    <AvatarFallback>
                      {getInitials(profile.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {profile.full_name || "No Name"}
                    </span>
                    <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                      {profile.id.substring(0, 8)}...
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      profile.role === "admin"
                        ? "default"
                        : profile.role === "collector"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {profile.role}
                  </Badge>
                </TableCell>
                <TableCell>{profile.total_points || 0}</TableCell>
                <TableCell>{profile.reports_count || 0}</TableCell>
                <TableCell>{formatDate(profile.created_at)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {/* Role Change Buttons */}
                    {profile.role !== "admin" && (
                      <>
                        {profile.role !== "resident" && (
                          <form action={(fd) => void updateUserProfile(fd)}>
                            <input
                              type="hidden"
                              name="userId"
                              value={profile.id}
                            />
                            <input type="hidden" name="role" value="resident" />
                            <Button variant="outline" size="sm" type="submit">
                              → Resident
                            </Button>
                          </form>
                        )}
                        {profile.role !== "collector" && (
                          <form action={(fd) => void updateUserProfile(fd)}>
                            <input
                              type="hidden"
                              name="userId"
                              value={profile.id}
                            />
                            <input
                              type="hidden"
                              name="role"
                              value="collector"
                            />
                            <Button variant="outline" size="sm" type="submit">
                              → Collector
                            </Button>
                          </form>
                        )}
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(!profiles || profiles.length === 0) && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
