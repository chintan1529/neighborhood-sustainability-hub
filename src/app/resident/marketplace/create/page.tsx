"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, ArrowRight, Loader2, Info } from "lucide-react";
import { WasteCategory } from "@/types/database";
import { createListing, CreateListingInput } from "@/app/actions/marketplace";
import MapLoader from "@/components/marketplace/map-loader";
import { useToast } from "@/hooks/use-toast";

export default function CreateListingWizard() {
  const router = useRouter();
  const { toast } = useToast();

  // UI State
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<CreateListingInput>>({});

  const handleNext = () => {
    if (step === 1 && (!formData.category || !formData.weight_kg)) {
      toast({
        title: "Incomplete",
        description: "Select category and weight.",
        variant: "destructive",
      });
      return;
    }
    if (step === 2 && (!formData.latitude || !formData.longitude)) {
      toast({
        title: "Location Missing",
        description: "Drop a pin on the map to set pickup location.",
        variant: "destructive",
      });
      return;
    }
    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.address_text) {
      toast({
        title: "Final Details",
        description: "Title and Address are required.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createListing(formData as CreateListingInput);

      if (result.success) {
        toast({
          title: "Listing Published!",
          description:
            "Your waste is now live on the marketplace. AI price guidance has been applied.",
        });
        router.push("/resident/marketplace");
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create listing.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container max-w-3xl py-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Sell Your Waste</h1>
        <p className="text-muted-foreground mt-2">
          Follow the steps to list your recyclable waste and get bids from
          verified collectors.
        </p>

        {/* Progress Bar */}
        <div className="flex gap-2 mt-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full flex-1 transition-colors duration-300 ${s <= step ? "bg-green-500" : "bg-muted"}`}
            />
          ))}
        </div>
      </div>

      <Card className="shadow-lg border-muted/50">
        {step === 1 && (
          <>
            <CardHeader>
              <CardTitle>What are you recycling?</CardTitle>
              <CardDescription>
                Selecting accurate categories helps recyclers bid fairly.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Waste Category</Label>
                <Select
                  onValueChange={(val) =>
                    setFormData((p) => ({
                      ...p,
                      category: val as WasteCategory,
                    }))
                  }
                  value={formData.category}
                >
                  <SelectTrigger className="h-12 text-lg focus:ring-green-500">
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plastic">Plastic (PET, HDPE)</SelectItem>
                    <SelectItem value="paper">Paper & Cardboard</SelectItem>
                    <SelectItem value="metal">Scrap Metal</SelectItem>
                    <SelectItem value="glass">Glass Bottles</SelectItem>
                    <SelectItem value="mixed">Mixed Recyclables</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 relative">
                <Label>Estimated Weight (kg)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="1"
                    placeholder="e.g. 15"
                    className="h-12 text-lg pl-4 pr-12 focus-visible:ring-green-500"
                    value={formData.weight_kg || ""}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        weight_kg: parseFloat(e.target.value),
                      }))
                    }
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                    kg
                  </div>
                </div>
              </div>
            </CardContent>
          </>
        )}

        {step === 2 && (
          <>
            <CardHeader>
              <CardTitle>Pickup Location</CardTitle>
              <CardDescription>
                Drop a pin exactly where the recycler should back up their
                truck.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 rounded-lg flex items-start gap-2 border border-blue-100 dark:border-blue-900 mb-2">
                <Info className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <p className="text-sm">
                  Click anywhere on the map to drop your pickup pin. Zoom in for
                  higher accuracy.
                </p>
              </div>

              <div className="rounded-xl overflow-hidden border-2 border-border focus-within:border-green-500 transition-colors shadow-sm relative">
                <MapLoader
                  interactive={true}
                  onLocationSelect={(lat, lng) =>
                    setFormData((p) => ({
                      ...p,
                      latitude: lat,
                      longitude: lng,
                    }))
                  }
                  height="350px"
                />
                {formData.latitude && (
                  <div className="absolute bottom-4 left-4 z-[400] bg-background/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-border text-xs font-semibold flex items-center gap-1.5 animate-in slide-in-from-bottom-2">
                    <MapPin className="h-3 w-3 text-green-500" /> Pin Dropped
                    Successfully
                  </div>
                )}
              </div>
            </CardContent>
          </>
        )}

        {step === 3 && (
          <>
            <CardHeader>
              <CardTitle>Final Details & Pricing</CardTitle>
              <CardDescription>
                Give it a catchy title so recyclers notice it in the feed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Listing Title</Label>
                <Input
                  placeholder="e.g. 15kg Clean Clear PET Bottles"
                  className="focus-visible:ring-green-500"
                  value={formData.title || ""}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, title: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Rough Address Text</Label>
                <Input
                  placeholder="e.g. 123 Main St, Back Alley"
                  className="focus-visible:ring-green-500"
                  value={formData.address_text || ""}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, address_text: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Expected Price per kg (Optional)</Label>
                <div className="p-4 bg-muted/40 border border-border rounded-lg mb-2 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                  <div>
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <span className="bg-primary/10 text-primary p-1 rounded">
                        🤖 AI Suggestion
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Based on recent {formData.category} deals in your 20km
                      radius.
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">Dynamic</p>
                    <p className="text-[10px] text-muted-foreground">
                      Calculated on submit
                    </p>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                    ₹
                  </div>
                  <Input
                    type="number"
                    placeholder="Leave blank for open bids"
                    className="pl-8 focus-visible:ring-green-500"
                    value={formData.expected_price || ""}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        expected_price: parseFloat(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </>
        )}

        <CardFooter className="bg-muted/10 border-t p-6 flex justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1 || isSubmitting}
          >
            Back
          </Button>

          {step < 3 ? (
            <Button
              onClick={handleNext}
              className="bg-green-600 hover:bg-green-700 text-white min-w-[120px]"
            >
              Next Step <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700 text-white min-w-[140px] shadow-lg shadow-green-500/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                  Publishing...
                </>
              ) : (
                "Publish Listing"
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
