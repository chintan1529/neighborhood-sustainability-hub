import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";


const RouteOptimizerMap = dynamic(
  () => import("@/components/dashboard/route-optimizer-map"),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[550px] rounded-xl" />
      </div>
    ),
  },
);

export default async function SmartRoutesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Verify collector role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, neighborhood_id")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "collector") redirect("/");

  // Fetch active reports in the collector's neighborhood
  const query = supabase
    .from("waste_reports")
    .select(
      "id, latitude, longitude, status, predicted_class, confirmed_class, address_text, quantity_estimate, created_at, notes",
    )
    .in("status", ["pending", "assigned", "in_progress"])
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .order("created_at", { ascending: true });

  if (profile?.neighborhood_id) {
    query.eq("neighborhood_id", profile.neighborhood_id);
  }

  const { data: reports } = await query;

  // Default center: first report or Bangalore
  const defaultCenter: [number, number] =
    reports && reports.length > 0
      ? [reports[0].latitude, reports[0].longitude]
      : [12.9716, 77.5946];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Smart Routes
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-lg">
          AI-optimized collection routes based on waste urgency, proximity, and report age.
        </p>
      </div>

      {/* Route Optimizer */}
      <RouteOptimizerMap
        reports={reports || []}
        defaultCenter={defaultCenter}
      />
    </div>
  );
}
