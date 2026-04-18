import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, MapPin, Clock } from "lucide-react";
import Link from "next/link";
import PickupActions from "./pickup-actions";

export default async function RecyclerPickupsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login/recycler");

  const { data: pickups, error } = await (supabase as any)
    .from("marketplace_transactions")
    .select(
      `
            *,
            listing:marketplace_listings(
                id, title, category, weight_kg, address_text, photos
            ),
            resident:profiles!marketplace_transactions_resident_id_fkey(full_name, phone)
        `,
    )
    .eq("recycler_id", user.id)
    .in("status", ["confirmed", "picked_up"])
    .order("scheduled_pickup_time", { ascending: true });

  if (error) console.error("Error fetching pickups:", error);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            Ready for Pickup
          </Badge>
        );
      case "picked_up":
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-200">
            In Progress
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Truck className="w-8 h-8 text-teal-600" /> Pickup Management
        </h2>
        <p className="text-muted-foreground">
          Manage your active pickups — start pickup, upload proof, and mark
          completion.
        </p>
      </div>

      {!pickups || pickups.length === 0 ? (
        <Card className="shadow-xl">
          <CardContent className="py-16 text-center">
            <Truck className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-bold">No Pending Pickups</h3>
            <p className="text-muted-foreground mb-4">
              All caught up! Browse the marketplace for new opportunities.
            </p>
            <Link
              href="/recycler/marketplace"
              className="text-teal-600 font-semibold hover:underline"
            >
              Open Marketplace →
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pickups.map((pickup: any) => (
            <Card
              key={pickup.id}
              className="shadow-lg hover:shadow-xl transition-shadow duration-300"
            >
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-lg font-bold">
                        {pickup.listing?.title || "Unknown Listing"}
                      </h3>
                      {getStatusBadge(pickup.status)}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4 text-teal-600 flex-shrink-0" />
                        <span className="truncate">
                          {pickup.listing?.address_text || "No address"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4 text-teal-600 flex-shrink-0" />
                        Pickup:{" "}
                        {new Date(
                          pickup.scheduled_pickup_time,
                        ).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <span className="bg-muted/50 px-3 py-1 rounded-full font-medium capitalize">
                        {pickup.listing?.category}
                      </span>
                      <span className="font-semibold">
                        {pickup.listing?.weight_kg}kg
                      </span>
                      <span className="font-bold text-teal-600">
                        ₹{Math.round(pickup.total_estimated_price)}
                      </span>
                    </div>

                    {pickup.resident && (
                      <p className="text-sm text-muted-foreground">
                        Resident:{" "}
                        <span className="font-medium text-foreground">
                          {pickup.resident.full_name || "N/A"}
                        </span>
                        {pickup.resident.phone && (
                          <>
                            {" "}
                            ·{" "}
                            <span className="font-mono">
                              {pickup.resident.phone}
                            </span>
                          </>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="lg:w-48 flex-shrink-0">
                    <PickupActions
                      transactionId={pickup.id}
                      status={pickup.status}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
