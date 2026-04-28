import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Tag, MapPin, Clock, CheckCircle } from "lucide-react";
import { ListingStatus } from "@/types/database";

// Format currency
const formatMoney = (amount: number) => `₹${amount.toFixed(2)}`;

// Get fancy status badges
const getStatusBadge = (status: ListingStatus) => {
  switch (status) {
    case "active":
      return (
        <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">
          Active
        </Badge>
      );
    case "negotiating":
      return (
        <Badge
          variant="secondary"
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          Negotiating
        </Badge>
      );
    case "accepted":
      return (
        <Badge variant="outline" className="text-green-600 border-green-600">
          Accepted
        </Badge>
      );
    case "picked_up":
      return (
        <Badge variant="outline" className="text-purple-600 border-purple-600">
          Logistics phase
        </Badge>
      );
    case "completed":
      return (
        <Badge
          variant="secondary"
          className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
        >
          Completed
        </Badge>
      );
    case "cancelled":
      return <Badge variant="destructive">Cancelled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export default async function ResidentMarketplacePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch resident's listings and their nested offers!
  const { data: listings, error } = await (supabase as any)
    .from("marketplace_listings")
    .select(
      `
            *,
            offers:marketplace_offers!marketplace_offers_listing_id_fkey(
                id,
                price_offered,
                proposed_pickup_time,
                status,
                recycler:recycler_profiles(business_name, total_rating)
            )
        `,
    )
    .eq("resident_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
  }

  const hasListings = listings && listings.length > 0;

  return (
    <div className="container max-w-5xl py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-green-600 to-emerald-400 bg-clip-text text-transparent">
            Waste-to-Value Marketplace
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your recyclable waste listings and offers.
          </p>
        </div>
        <Button
          asChild
          size="lg"
          className="shadow-lg shadow-green-500/20 hover:shadow-green-500/40 transition-shadow"
        >
          <Link href="/resident/marketplace/create">
            <Plus className="mr-2 h-5 w-5" /> Sell Waste
          </Link>
        </Button>
      </div>

      {!hasListings ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed border-2 bg-muted/30">
          <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <Tag className="h-10 w-10 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold mb-2">
            You haven&apos;t listed anything yet!
          </h3>
          <p className="text-muted-foreground max-w-sm mb-6">
            Turn your segregated recyclable waste into real value. List plastic,
            paper, or e-waste for nearby recyclers to bid on.
          </p>
          <Button asChild variant="outline">
            <Link href="/resident/marketplace/create">
              Create your first listing
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing: any) => {
            const pendingOffers =
              listing.offers?.filter((o: any) => o.status === "pending") || [];
            const topOffer = pendingOffers.sort(
              (a: any, b: any) => b.price_offered - a.price_offered,
            )[0];

            return (
              <Card
                key={listing.id}
                className="overflow-hidden hover:shadow-md transition-shadow flex flex-col"
              >
                <CardHeader className="pb-3 border-b bg-muted/20">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline" className="capitalize">
                      {listing.category}
                    </Badge>
                    {getStatusBadge(listing.status)}
                  </div>
                  <CardTitle className="text-lg line-clamp-1">
                    {listing.title}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1 mt-1 font-medium">
                    <MapPin className="h-3 w-3" /> {listing.weight_kg}kg load
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 flex-grow space-y-4">
                  {/* Expected Pricing Context */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-muted/50 p-2 rounded-md">
                      <p className="text-muted-foreground text-xs">
                        You expect
                      </p>
                      <p className="font-semibold">
                        {listing.expected_price
                          ? formatMoney(listing.expected_price)
                          : "Open bid"}
                        /kg
                      </p>
                    </div>
                    <div className="bg-blue-50/50 dark:bg-blue-950/20 p-2 rounded-md border border-blue-100 dark:border-blue-900">
                      <p className="text-blue-600 dark:text-blue-400 text-xs flex items-center gap-1">
                        AI Guideline
                      </p>
                      <p className="font-semibold text-blue-700 dark:text-blue-300">
                        {listing.ai_suggested_price
                          ? formatMoney(listing.ai_suggested_price)
                          : "N/A"}
                        /kg
                      </p>
                    </div>
                  </div>

                  {/* Live Bids Overview */}
                  {listing.status === "active" && (
                    <div className="border rounded-lg p-3 bg-card relative overflow-hidden">
                      {pendingOffers.length > 0 ? (
                        <>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium flex items-center gap-1">
                              <Clock className="w-3 h-3 text-orange-500" />{" "}
                              {pendingOffers.length} Active Bids
                            </span>
                            <span className="text-lg font-bold text-green-600">
                              {formatMoney(topOffer.price_offered)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            Top bidder: {topOffer.recycler?.business_name} (⭐
                            {topOffer.recycler?.total_rating})
                          </p>
                        </>
                      ) : (
                        <div className="text-center py-2 relative z-10">
                          <p className="text-sm text-muted-foreground italic">
                            Waiting for recyclers...
                          </p>
                        </div>
                      )}
                      {/* Decorative loading sweep */}
                      {pendingOffers.length === 0 && (
                        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-muted/40 to-transparent" />
                      )}
                    </div>
                  )}

                  {/* Accepted View */}
                  {listing.status === "accepted" && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 rounded-lg border border-green-200 dark:border-green-900">
                      <CheckCircle className="h-5 w-5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-semibold">Offer Accepted!</p>
                        <p className="text-xs opacity-90">
                          Awaiting scheduling & pickup.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="pt-0 pb-4 px-6 border-t mt-auto">
                  <Button
                    asChild
                    variant={
                      pendingOffers.length > 0 && listing.status === "active"
                        ? "default"
                        : "secondary"
                    }
                    className="w-full mt-4"
                  >
                    <Link href={`/resident/marketplace/${listing.id}`}>
                      {listing.status === "active"
                        ? "Review Offers"
                        : "View Details"}
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}

          {/* Post Another Listing Card */}
          <Card className="flex flex-col items-center justify-center p-6 text-center border-dashed border-2 bg-muted/10 hover:bg-muted/30 transition-colors min-h-[300px]">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <Plus className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="font-semibold mb-2">Have more to sell?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              List additional recyclable waste for incoming bids.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/resident/marketplace/create">
                Post Another Listing
              </Link>
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
