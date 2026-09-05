import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile/profile-form";
import { ChangePasswordForm } from "@/components/profile/change-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, CheckCircle, Clock } from "lucide-react";

export default async function CollectorProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/auth/login");

  // Fetch collector stats
  const { data: completedJobs } = await supabase
    .from("waste_reports")
    .select("id")
    .eq("assigned_to", user.id)
    .eq("status", "completed");

  const { data: activeJobs } = await supabase
    .from("waste_reports")
    .select("id")
    .eq("assigned_to", user.id)
    .in("status", ["assigned", "in_progress"]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Profile</h2>
        <p className="text-muted-foreground">Manage your collector profile</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Role</CardDescription>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Collector
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={profile.is_available ? "default" : "secondary"}>
              {profile.is_available ? "Available" : "Unavailable"}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed Pickups</CardDescription>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              {completedJobs?.length || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Total completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Jobs</CardDescription>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              {activeJobs?.length || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">In progress</p>
          </CardContent>
        </Card>
      </div>

      <ProfileForm user={user} profile={profile} />

      <ChangePasswordForm />
    </div>
  );
}
