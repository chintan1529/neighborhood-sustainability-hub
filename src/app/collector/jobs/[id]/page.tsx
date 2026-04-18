import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { revalidatePath } from "next/cache";
import {
  MapPin,
  Clock,
  Package,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Play,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

interface JobDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Fetch the job details
  const { data: job, error } = await supabase
    .from("waste_reports")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !job) {
    notFound();
  }

  // Verify this job is assigned to the current collector
  if (job.assigned_to !== user.id) {
    redirect("/collector");
  }

  const statusColors: Record<string, string> = {
    assigned: "bg-blue-100 text-blue-800",
    in_progress: "bg-purple-100 text-purple-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/collector">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight capitalize">
            {job.confirmed_class || job.predicted_class || "Waste"} Pickup
          </h2>
          <p className="text-muted-foreground">
            Job ID: {job.id.slice(0, 8)}...
          </p>
        </div>
        <Badge className={statusColors[job.status] || "bg-gray-100"}>
          {job.status === "in_progress" ? "In Progress" : job.status}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Job Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Pickup Details</CardTitle>
            <CardDescription>
              Information about this waste pickup
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Location</p>
                <p className="text-sm text-muted-foreground">
                  {job.address_text || "No address provided"}
                </p>
                {job.landmark && (
                  <p className="text-sm text-muted-foreground">
                    Landmark: {job.landmark}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Waste Type</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {job.confirmed_class || job.predicted_class || "Unknown"}
                </p>
                {job.quantity_estimate && (
                  <p className="text-sm text-muted-foreground">
                    Quantity: {job.quantity_estimate}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Timeline</p>
                <p className="text-sm text-muted-foreground">
                  Reported: {formatDate(job.created_at)}
                </p>
                {job.assigned_at && (
                  <p className="text-sm text-muted-foreground">
                    Assigned: {formatDate(job.assigned_at)}
                  </p>
                )}
              </div>
            </div>
            {job.notes && (
              <div className="pt-2 border-t">
                <p className="font-medium mb-1">Notes from Reporter</p>
                <p className="text-sm text-muted-foreground">{job.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>Update the status of this job</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {job.status === "assigned" && (
              <form
                action={async () => {
                  "use server";
                  const sb = await createClient();
                  await sb
                    .from("waste_reports")
                    .update({ status: "in_progress" })
                    .eq("id", id);
                  revalidatePath(`/collector/jobs/${id}`);
                }}
              >
                <Button className="w-full" size="lg">
                  <Play className="h-4 w-4 mr-2" />
                  Start Pickup (Mark In Progress)
                </Button>
              </form>
            )}

            {job.status === "in_progress" && (
              <form
                action={async () => {
                  "use server";
                  const sb = await createClient();
                  const {
                    data: { user: currentUser },
                  } = await sb.auth.getUser();
                  if (!currentUser) return;

                  // Call the complete_report RPC function
                  await sb.rpc("complete_report", {
                    p_report_id: id,
                    p_collector_id: currentUser.id,
                    p_completion_photo_url: null,
                    p_completion_notes: "Completed via collector dashboard",
                  });

                  // Clear the collector's active claim
                  await sb
                    .from("profiles")
                    .update({ active_claim_id: null })
                    .eq("id", currentUser.id);

                  revalidatePath("/collector");
                  redirect("/collector");
                }}
              >
                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete Pickup
                </Button>
              </form>
            )}

            {(job.status === "assigned" || job.status === "in_progress") && (
              <form
                action={async () => {
                  "use server";
                  const sb = await createClient();
                  const {
                    data: { user: currentUser },
                  } = await sb.auth.getUser();
                  if (!currentUser) return;

                  await sb
                    .from("waste_reports")
                    .update({
                      status: "pending",
                      assigned_to: null,
                      assigned_at: null,
                    })
                    .eq("id", id);

                  // Clear active claim
                  await sb
                    .from("collector_claims")
                    .update({
                      is_active: false,
                      cancelled_at: new Date().toISOString(),
                    })
                    .eq("report_id", id)
                    .eq("collector_id", currentUser.id);

                  await sb
                    .from("profiles")
                    .update({ active_claim_id: null })
                    .eq("id", currentUser.id);

                  revalidatePath("/collector");
                  redirect("/collector");
                }}
              >
                <Button
                  variant="outline"
                  className="w-full text-red-600 border-red-200 hover:bg-red-50"
                  size="lg"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel & Release Job
                </Button>
              </form>
            )}

            {job.status === "completed" && (
              <div className="text-center py-4">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
                <p className="font-medium text-green-600">
                  This job has been completed
                </p>
                {job.completed_at && (
                  <p className="text-sm text-muted-foreground">
                    Completed on {formatDate(job.completed_at)}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Photo Preview */}
      {job.photo_url && (
        <Card>
          <CardHeader>
            <CardTitle>Waste Photo</CardTitle>
          </CardHeader>
          <CardContent>
            <img
              src={job.photo_url}
              alt="Waste photo"
              className="rounded-lg max-h-96 w-auto mx-auto"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
