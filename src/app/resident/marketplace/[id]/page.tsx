import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Calendar,
  CheckCircle2,
  Factory,
  Navigation,
} from "lucide-react";
import { AcceptOfferButton } from "./accept-offer-button";

export default async function ResidentListingReviewPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: listing, error } = await supabase
    .from("marketplace_listings")
    .select(
      `
            *,
            offers:marketplace_offers!marketplace_offers_listing_id_fkey(
                id,
                price_offered,
                proposed_pickup_time,
                status,
                created_at,
                recycler:recycler_profiles(business_name, total_rating, review_count, verification_status)
            )
        `,
    )
    .eq("id", params.id)
    .eq("resident_id", user.id)
    .single();

  if (error || !listing) {
    redirect("/resident/marketplace");
  }

  const offers = (listing.offers as unknown as any[]) || [];
  const pendingOffers = offers.filter((o: any) => o.status === "pending");

  // Sort descending by price
  const sortedOffers = [...pendingOffers].sort(
    (a: any, b: any) => b.price_offered - a.price_offered,
  );

  const acceptedOffer = offers.find((o: any) => o.status === "accepted");

  return (
    <div className="container max-w-5xl py-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Button asChild variant="ghost" className="mb-2 -ml-4">
        <Link href="/resident/marketplace">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Marketplace
        </Link>
      </Button>

      {/* Listing Header Section */}
      <div className="flex flex-col md:flex-row justify-between md:items-start gap-6 border-b pb-6">
        <div>
          <div className="flex items-center gap-3 border-b-0 pb-0">
            <Badge
              variant="outline"
              className="capitalize px-3 py-1 bg-muted/30"
            >
              {listing.category}
            </Badge>
            <Badge variant="secondary" className="px-3 py-1">
              {listing.status === "active"
                ? "Active Listed"
                : listing.status.toUpperCase()}
            </Badge>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mt-3 mb-2">
            {listing.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-muted-foreground mt-1">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" /> {listing.address_text}
            </span>
            <span className="flex items-center gap-1.5">
              <Navigation className="w-4 h-4 text-blue-500" />{" "}
              {listing.weight_kg} kg estimated
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> Listed{" "}
              {new Date(listing.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="bg-muted/40 p-5 rounded-xl border min-w-[200px] flex flex-col items-start shadow-sm">
          <p className="text-sm text-muted-foreground font-medium mb-1">
            Your Expectations
          </p>
          {listing.expected_price ? (
            <p className="font-bold text-2xl">
              ₹{listing.expected_price.toFixed(2)}
              <span className="text-base font-normal text-muted-foreground">
                /kg
              </span>
            </p>
          ) : (
            <p className="font-bold text-lg text-emerald-600">
              Open for highest bid
            </p>
          )}
          {listing.ai_suggested_price && (
            <div className="mt-2 pt-2 border-t w-full">
              <p className="text-xs text-blue-600 flex justify-between items-center">
                <span>AI Market Guide:</span>
                <span className="font-bold">
                  ₹{listing.ai_suggested_price}/kg
                </span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div className="grid grid-cols-1 gap-8 pt-4">
        {/* ── Status: Accepted State ── */}
        {listing.status === "accepted" ||
        listing.status === "completed" ||
        listing.status === "picked_up" ? (
          <Card className="border-green-200 bg-green-50/30 overflow-hidden relative shadow-lg shadow-green-900/5">
            <div className="absolute top-0 left-0 w-2 h-full bg-green-500" />
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl text-green-800 flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-green-600" /> Offer
                Formally Accepted!
              </CardTitle>
              <CardDescription className="text-green-700/80">
                This transaction is now locked. The recycler is preparing for
                scheduling and logistics.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {acceptedOffer && (
                <div className="flex flex-col md:flex-row justify-between md:items-center bg-white border p-6 rounded-xl shadow-sm gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                      Winning Recycler
                    </p>
                    <div className="flex items-center gap-2">
                      <Factory className="w-5 h-5 text-muted-foreground" />
                      <h3 className="text-xl font-bold">
                        {acceptedOffer.recycler.business_name}
                      </h3>
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full ml-1 font-medium">
                        ⭐ {acceptedOffer.recycler.total_rating}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-8 bg-green-50 px-5 py-3 rounded-lg border border-green-100">
                    <div>
                      <p className="text-xs text-green-800 font-semibold mb-0.5">
                        FINAL RATE
                      </p>
                      <p className="text-xl font-bold text-green-600">
                        ₹{acceptedOffer.price_offered.toFixed(2)}/kg
                      </p>
                    </div>
                    <div className="w-px h-10 bg-green-200" />
                    <div>
                      <p className="text-xs text-green-800 font-semibold mb-0.5">
                        ROUGH TOTAL
                      </p>
                      <p className="text-xl font-bold text-green-700">
                        ₹
                        {(
                          acceptedOffer.price_offered * listing.weight_kg
                        ).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          /* ── Status: Active (Reviewing Bids) ── */
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                Live Competitive Bids ({pendingOffers.length})
              </h2>
              {pendingOffers.length > 0 && (
                <Badge
                  variant="outline"
                  className="bg-orange-50 text-orange-600 border-orange-200 shadow-sm animate-pulse"
                >
                  Highest bid is ₹{sortedOffers[0].price_offered.toFixed(2)}/kg!
                </Badge>
              )}
            </div>

            {pendingOffers.length === 0 ? (
              <Card className="border-dashed bg-muted/20">
                <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                  <Clock className="w-10 h-10 mb-4 opacity-50 text-orange-500" />
                  <h3 className="text-lg font-semibold text-foreground">
                    Waiting for Recyclers
                  </h3>
                  <p className="max-w-md mt-2">
                    Verified local recyclers are currently reviewing your
                    listing. Check back shortly to see blind bids appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {sortedOffers.map((offer: any, index: number) => {
                  const isTopOffer = index === 0;

                  return (
                    <Card
                      key={offer.id}
                      className={`overflow-hidden transition-all duration-300 ${isTopOffer ? "border-2 border-green-500 shadow-md ring-4 ring-green-500/10" : "hover:border-foreground/30"}`}
                    >
                      {isTopOffer && (
                        <div className="bg-green-500 text-white text-xs font-bold uppercase tracking-widest text-center py-1.5 w-full">
                          ★ Highest Bid ★
                        </div>
                      )}
                      <CardContent className="p-0">
                        <div className="flex flex-col md:flex-row justify-between items-center p-5 md:p-6 gap-6">
                          {/* Recycler Info */}
                          <div className="flex-1 space-y-1 w-full text-center md:text-left">
                            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                              <Factory className="w-5 h-5 text-blue-500" />
                              <h3 className="text-xl font-bold">
                                {offer.recycler.business_name}
                              </h3>
                              {offer.recycler.verification_status ===
                                "approved" && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              )}
                            </div>
                            <div className="flex items-center justify-center md:justify-start gap-4 text-sm text-muted-foreground">
                              <span>
                                ⭐ {offer.recycler.total_rating} Rating (
                                {offer.recycler.review_count} reviews)
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                Prop. Pickup:{" "}
                                {new Date(
                                  offer.proposed_pickup_time,
                                ).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2 inline-block bg-muted px-2 py-1 rounded">
                              Bid placed{" "}
                              {new Date(offer.created_at).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </p>
                          </div>

                          {/* Bid Value & Call to action */}
                          <div className="flex flex-col items-center md:items-end w-full md:w-auto mt-4 md:mt-0 max-w-xs">
                            <div className="text-right mb-4">
                              <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground {isTopOffer ? 'text-green-600/80': ''}">
                                Offered Rate
                              </p>
                              <p
                                className={`text-4xl font-extrabold tracking-tight ${isTopOffer ? "text-green-600" : "text-foreground"}`}
                              >
                                ₹{offer.price_offered.toFixed(2)}
                                <span className="text-base font-normal text-muted-foreground">
                                  /kg
                                </span>
                              </p>
                            </div>

                            <div className="w-full">
                              <AcceptOfferButton
                                offerId={offer.id}
                                price={offer.price_offered}
                                businessName={offer.recycler.business_name}
                                isTopOffer={isTopOffer}
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
