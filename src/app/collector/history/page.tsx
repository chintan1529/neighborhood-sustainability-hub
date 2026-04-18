import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { CheckCircle, XCircle } from "lucide-react";

export default async function CollectorHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch completed/cancelled claims for this collector
  const { data: completedJobs } = await supabase
    .from("waste_reports")
    .select("*")
    .eq("assigned_to", user.id)
    .in("status", ["completed", "cancelled"])
    .order("completed_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Collection History
        </h2>
        <p className="text-muted-foreground">
          View your past completed and cancelled pickups
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Past Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {!completedJobs || completedJobs.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No completed jobs yet. Start claiming pickups!
            </p>
          ) : (
            <div className="space-y-4">
              {completedJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex justify-between items-center border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <div className="font-medium capitalize flex items-center gap-2">
                      {job.confirmed_class || job.predicted_class || "Waste"}
                      {job.status === "completed" ? (
                        <Badge
                          variant="outline"
                          className="text-green-600 border-green-200 flex items-center gap-1"
                        >
                          <CheckCircle className="h-3 w-3" />
                          Completed
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-red-600 border-red-200 flex items-center gap-1"
                        >
                          <XCircle className="h-3 w-3" />
                          Cancelled
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                      {job.address_text || "No address provided"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {job.completed_at
                        ? formatDate(job.completed_at)
                        : formatDate(job.updated_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    {job.status === "completed" && job.points_awarded > 0 && (
                      <Badge className="bg-nhs-green">
                        +{job.points_awarded} pts
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
