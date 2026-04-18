import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Star, MessageSquare } from "lucide-react";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const adminClient = createAdminClient();

  // Fetch reports that have ratings, along with resident and collector details
  const { data: reviews, error } = await adminClient
    .from("waste_reports")
    .select(
      `
            id,
            collector_rating,
            collector_review,
            completed_at,
            resident:profiles!waste_reports_user_id_fkey(full_name),
            collector:profiles!waste_reports_assigned_to_fkey(full_name)
        `,
    )
    .not("collector_rating", "is", null)
    .order("completed_at", { ascending: false });

  if (error) {
    console.error("Fetch reviews error:", error);
  }

  const avgRating =
    reviews && reviews.length > 0
      ? (
          reviews.reduce((acc, r) => acc + (r.collector_rating || 0), 0) /
          reviews.length
        ).toFixed(1)
      : "0.0";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">
            Collector Reviews
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Feedback left by residents for completed collections
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 px-3 py-1.5 rounded-full text-sm font-medium border border-amber-200 dark:border-amber-900/50">
            <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
            <span>{avgRating} Average</span>
            <span className="text-amber-700/60 dark:text-amber-400/60 ml-1">
              ({reviews?.length || 0} reviews)
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[180px]">Date</TableHead>
                <TableHead>Collector</TableHead>
                <TableHead>Resident</TableHead>
                <TableHead className="w-[120px]">Rating</TableHead>
                <TableHead>Review</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviews && reviews.length > 0 ? (
                reviews.map((review: any) => (
                  <TableRow key={review.id} className="hover:bg-muted/30">
                    <TableCell className="text-sm text-muted-foreground">
                      {review.completed_at
                        ? formatDate(review.completed_at)
                        : "Unknown"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {review.collector?.full_name || "Unknown Collector"}
                    </TableCell>
                    <TableCell>
                      {review.resident?.full_name || "Unknown Resident"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${i < review.collector_rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground/30"}`}
                          />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {review.collector_review ? (
                        <div className="flex items-start gap-2">
                          <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <span className="text-sm italic text-muted-foreground line-clamp-2">
                            "{review.collector_review}"
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground/50">
                          —
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-12 text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Star className="h-8 w-8 text-muted-foreground/30" />
                      <p>No reviews have been submitted yet.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
