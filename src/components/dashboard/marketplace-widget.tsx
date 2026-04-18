import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Store, ArrowRight, Tag } from "lucide-react";
import Link from "next/link";

export function MarketplaceWidget({ listings }: { listings: any[] }) {
  if (!listings || listings.length === 0) {
    return (
      <Card className="h-full border-dashed bg-muted/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Store className="w-5 h-5 text-muted-foreground" /> Marketplace
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
          <Tag className="w-8 h-8 mb-2 opacity-50 text-green-600" />
          <p className="text-sm font-medium">No Active Listings</p>
          <p className="text-xs mt-1 px-4">
            Got recyclables? Sell them to local verified recyclers for cash.
          </p>
          <Link
            href="/resident/marketplace/create"
            className="text-sm text-green-600 font-semibold mt-4 hover:underline"
          >
            Start Selling &rarr;
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full shadow-lg shadow-green-900/5">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center gap-2">
            <Store className="w-5 h-5 text-green-600" /> My Active Listings
          </CardTitle>
          <Link
            href="/resident/marketplace"
            className="text-sm font-semibold text-green-600 hover:text-green-700 flex items-center gap-1 group"
          >
            View All{" "}
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {listings.map((listing) => {
            const offerCount =
              listing.offers?.filter((o: any) => o.status === "pending")
                .length || 0;
            const hasAccepted = listing.status === "accepted";

            return (
              <Link
                key={listing.id}
                href={`/resident/marketplace/${listing.id}`}
                className="block block group"
              >
                <div className="flex justify-between items-center p-3 rounded-lg border bg-card hover:border-green-300 hover:bg-green-50/30 transition-colors relative overflow-hidden">
                  {hasAccepted && (
                    <div className="absolute left-0 top-0 w-1 h-full bg-emerald-500" />
                  )}
                  <div className="ml-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm line-clamp-1">
                        {listing.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Badge
                        variant="outline"
                        className="capitalize text-[10px] px-1.5 py-0 h-4"
                      >
                        {listing.category}
                      </Badge>
                      <span className="text-muted-foreground">
                        {listing.weight_kg}kg load
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    {hasAccepted ? (
                      <Badge
                        variant="secondary"
                        className="bg-emerald-100 text-emerald-700"
                      >
                        Accepted
                      </Badge>
                    ) : offerCount > 0 ? (
                      <Badge
                        variant="outline"
                        className="bg-orange-50 text-orange-600 border-orange-200"
                      >
                        {offerCount} {offerCount === 1 ? "Bid" : "Bids"}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground mr-1">
                        No bids yet
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        {listings.length >= 3 && (
          <div className="mt-4 pt-3 border-t text-center">
            <Link
              href="/resident/marketplace"
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              See older listings in Marketplace
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
