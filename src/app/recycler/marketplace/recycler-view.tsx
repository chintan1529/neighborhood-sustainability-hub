"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Flame, Clock, Navigation, Store, Send, Search } from "lucide-react";
import MapLoader from "@/components/marketplace/map-loader";
import { useToast } from "@/hooks/use-toast";
import { makeOffer } from "@/app/actions/marketplace";

export default function RecyclerView({
  initialListings,
}: {
  initialListings: any[];
  currentUserId?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [listings, setListings] = useState(initialListings);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal State
  const [isOfferOpen, setIsOfferOpen] = useState(false);
  const [offerPrice, setOfferPrice] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getUrgencyScore = (createdAt: string) => {
    const daysOld =
      (new Date().getTime() - new Date(createdAt).getTime()) /
      (1000 * 3600 * 24);
    return daysOld > 3;
  };

  const handleMakeOffer = async () => {
    if (!offerPrice || !pickupTime || !selectedListing) {
      toast({
        title: "Missing parameters",
        description: "Fill out price and time.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const result = await makeOffer(
      selectedListing.id,
      parseFloat(offerPrice),
      new Date(pickupTime).toISOString(),
    );
    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: "Offer Sent! 🎉",
        description: `Your ₹${offerPrice}/kg offer was sent blindly to the resident. Keep an eye on your status!`,
      });
      setIsOfferOpen(false);
      setListings((prev) => prev.filter((l) => l.id !== selectedListing.id));
      setSelectedListing(null);
      router.refresh();
    } else {
      toast({
        title: "Submission Failed",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const filteredFeed = listings.filter(
    (l) =>
      l.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.category.includes(searchTerm),
  );

  return (
    <>
      {/* Left Sidebar Feed */}
      <div className="w-full md:w-1/3 max-w-sm lg:max-w-md bg-background border-r flex flex-col z-20 shadow-xl overflow-hidden animate-in slide-in-from-left duration-500">
        <div className="p-4 border-b bg-muted/20">
          <h2 className="text-xl font-bold tracking-tight">Nearby Leads</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Discover verified raw materials.
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter plastic, metal..."
              className="pl-9 bg-background focus-visible:ring-teal-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {filteredFeed.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Store className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">
                No nearby recyclables found matching your search.
              </p>
            </div>
          ) : (
            filteredFeed.map((listing: any) => {
              const isUrgent = getUrgencyScore(listing.created_at);
              const isSelected = selectedListing?.id === listing.id;

              return (
                <Card
                  key={listing.id}
                  className={`cursor-pointer transition-all duration-200 border-2 ${isSelected ? "border-teal-500 ring-2 ring-teal-500/20 bg-teal-50/50 dark:bg-teal-950/20 shadow-md" : "border-transparent hover:border-teal-500/30"} ${isUrgent ? "shadow-[0_0_15px_-3px_rgba(249,115,22,0.2)]" : ""}`}
                  onClick={() => setSelectedListing(listing)}
                >
                  <div className="p-4 flex flex-col gap-2 relative overflow-hidden">
                    <div className="flex justify-between items-start">
                      <Badge
                        variant="outline"
                        className="capitalize text-xs font-semibold"
                      >
                        {listing.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(listing.created_at).toLocaleDateString(
                          "en-IN",
                        )}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-base line-clamp-1">
                        {listing.title}
                      </h3>
                      <p className="text-sm text-muted-foreground bg-muted w-fit px-2 py-0.5 rounded flex items-center gap-1 mt-1">
                        <Navigation className="w-3 h-3 text-blue-500" />{" "}
                        {listing.weight_kg} kg Approx
                      </p>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      {listing.expected_price ? (
                        <span className="font-bold text-lg text-teal-600">
                          ₹{listing.expected_price}
                          <span className="text-xs font-normal text-muted-foreground">
                            /kg expect
                          </span>
                        </span>
                      ) : (
                        <span className="font-bold text-lg text-teal-600">
                          Open Bid
                        </span>
                      )}
                    </div>
                    {isUrgent && (
                      <div className="absolute top-0 right-0 p-1 bg-orange-500 text-white rounded-bl-lg transform origin-top-right rotate-12 -mr-3 -mt-3 scale-75">
                        <Flame className="w-5 h-5 ml-1 mt-1" />
                      </div>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Right Map Pane */}
      <div className="flex-1 relative bg-blue-50">
        <MapLoader
          listings={listings}
          onSelectListing={(l: any) => setSelectedListing(l)}
          height="100%"
          className="border-none rounded-none w-full !h-full"
          initialCenter={
            selectedListing?.location?.match(/([\d.-]+)\s+([\d.-]+)/)
              ? [
                  parseFloat(
                    selectedListing.location.match(/([\d.-]+)\s+([\d.-]+)/)![2],
                  ),
                  parseFloat(
                    selectedListing.location.match(/([\d.-]+)\s+([\d.-]+)/)![1],
                  ),
                ]
              : [20.5937, 78.9629]
          }
          zoom={selectedListing ? 15 : 12}
        />

        {/* Floating Bottom Panel */}
        {selectedListing && !isOfferOpen && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur-md shadow-2xl rounded-2xl p-4 md:p-6 w-[90%] max-w-xl z-[500] border shadow-teal-900/10 animate-in slide-in-from-bottom flex flex-col sm:flex-row gap-4 justify-between items-center whitespace-nowrap overflow-hidden">
            <div className="flex items-center gap-4 w-full">
              <div className="h-12 w-12 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                <Store className="h-6 w-6 text-teal-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-0.5">
                  {selectedListing.category}
                </p>
                <h3 className="font-bold text-lg truncate">
                  {selectedListing.title}
                </h3>
              </div>
            </div>
            <Button
              size="lg"
              className="bg-teal-600 hover:bg-teal-700 w-full sm:w-auto shadow-lg shadow-teal-500/30"
              onClick={() => setIsOfferOpen(true)}
            >
              Make Offer
            </Button>
          </div>
        )}
      </div>

      {/* Negotiation Modal */}
      <Dialog open={isOfferOpen} onOpenChange={setIsOfferOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Send className="w-5 h-5 text-teal-500" /> Blind Bid Offer
            </DialogTitle>
            <DialogDescription>
              Submit a competitive price. The resident cannot see competing bids
              until they accept.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="p-3 bg-muted/30 border border-border rounded-lg flex justify-between items-center">
              <div>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {selectedListing?.title}
                </p>
                <p className="font-bold">{selectedListing?.weight_kg}kg</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Expected</p>
                <p className="font-bold text-teal-600">
                  {selectedListing?.expected_price
                    ? `₹${selectedListing.expected_price}`
                    : "None"}
                </p>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="price" className="font-bold flex justify-between">
                Your Offer (per kg)
                {selectedListing?.ai_suggested_price && (
                  <span className="font-normal text-teal-600 text-xs bg-teal-50 dark:bg-teal-950/30 px-2 py-0.5 rounded">
                    Median Area Rate: ₹{selectedListing.ai_suggested_price}
                  </span>
                )}
              </Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
                  ₹
                </div>
                <Input
                  id="price"
                  type="number"
                  className="pl-8 h-12 text-lg focus-visible:ring-teal-500"
                  placeholder="Enter your highest price"
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="date" className="font-bold">
                Proposed Pickup Time
              </Label>
              <Input
                id="date"
                type="datetime-local"
                className="h-12 focus-visible:ring-teal-500"
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="default"
              className="w-full h-12 text-md font-bold bg-teal-600 hover:bg-teal-700 shadow-xl shadow-teal-500/20"
              onClick={handleMakeOffer}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Securing Bid..." : "Submit Binding Offer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
