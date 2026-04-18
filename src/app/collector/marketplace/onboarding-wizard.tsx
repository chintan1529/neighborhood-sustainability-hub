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
  ArrowRight,
  Loader2,
  Store,
  MapPin,
  ShieldCheck,
  Info,
} from "lucide-react";
import { WasteCategory } from "@/types/database";
import {
  requestRecyclerVerification,
  VerificationFormData,
} from "@/app/actions/marketplace";
import MapLoader from "@/components/marketplace/map-loader";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES: { id: WasteCategory; label: string }[] = [
  { id: "plastic", label: "Plastic (PET, HDPE)" },
  { id: "paper", label: "Paper & Cardboard" },
  { id: "metal", label: "Scrap Metal" },
  { id: "glass", label: "Glass Bottles" },
  { id: "organic", label: "Organic Waste" },
  { id: "mixed", label: "Mixed Recyclables" },
];

export default function OnboardingWizard() {
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<Partial<VerificationFormData>>({
    accepted_categories: [],
    service_radius_km: 10,
  });

  const toggleCategory = (cat: WasteCategory) => {
    setFormData((prev) => {
      const current = prev.accepted_categories || [];
      if (current.includes(cat)) {
        return {
          ...prev,
          accepted_categories: current.filter((c) => c !== cat),
        };
      } else {
        return { ...prev, accepted_categories: [...current, cat] };
      }
    });
  };

  const handleNext = () => {
    if (step === 1) {
      if (
        !formData.business_name ||
        (formData.accepted_categories?.length || 0) === 0
      ) {
        toast({
          title: "Incomplete",
          description: "Business name and at least 1 category are required.",
          variant: "destructive",
        });
        return;
      }
    }
    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    if (!formData.latitude || !formData.longitude) {
      toast({
        title: "Location Missing",
        description: "Please drop a pin on the map.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await requestRecyclerVerification(
        formData as VerificationFormData,
      );

      if (result.success) {
        toast({
          title: "Application Submitted!",
          description:
            "Your business is now pending verification. An admin will review it shortly.",
        });
        // router.refresh() will automatically kick them out of this wizard screen since status is 'pending' now
        router.refresh();
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
        description: "Failed to submit application.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container max-w-3xl py-12 animate-in fade-in zoom-in-95 duration-500">
      <div className="mb-8 text-center">
        <div className="mx-auto w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          Become a Verified Recycler
        </h1>
        <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
          Join the local marketplace to buy high-quality, pre-sorted recyclable
          waste directly from residents.
        </p>

        {/* Progress Bar */}
        <div className="flex gap-2 mt-8 max-w-sm mx-auto">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full flex-1 transition-colors duration-300 ${s <= step ? "bg-blue-600" : "bg-muted"}`}
            />
          ))}
        </div>
      </div>

      <Card className="shadow-xl border-muted/50">
        {step === 1 && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5 text-blue-600" /> Business Profile
              </CardTitle>
              <CardDescription>
                Tell us about your recycling operations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Registered Business Name *</Label>
                  <Input
                    placeholder="e.g. Green Earth Scrap Dealers"
                    className="focus-visible:ring-blue-500"
                    value={formData.business_name || ""}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        business_name: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tax ID / GST Number (Optional)</Label>
                  <Input
                    placeholder="Fast-tracks your verification"
                    className="focus-visible:ring-blue-500"
                    value={formData.tax_id || ""}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, tax_id: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <Label className="text-base">What do you buy? *</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  You will only be alerted about listings matching these
                  categories.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CATEGORIES.map((cat) => (
                    <div
                      key={cat.id}
                      className={`flex items-center space-x-3 border p-3 rounded-lg cursor-pointer transition-colors ${
                        formData.accepted_categories?.includes(cat.id)
                          ? "bg-blue-50/50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => toggleCategory(cat.id)}
                    >
                      <input
                        type="checkbox"
                        checked={
                          formData.accepted_categories?.includes(cat.id) ||
                          false
                        }
                        readOnly
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <Label className="cursor-pointer flex-grow">
                        {cat.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </>
        )}

        {step === 2 && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" /> Operating Location
              </CardTitle>
              <CardDescription>
                Where do you send your trucks from?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Service Radius (km)</Label>
                  <span className="font-bold text-blue-600">
                    {formData.service_radius_km} km
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="50"
                  step="1"
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-blue-600"
                  value={formData.service_radius_km}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      service_radius_km: parseInt(e.target.value),
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground mt-1 text-right">
                  Maximum distance you're willing to travel for pickups.
                </p>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <Label className="text-base">Base Location *</Label>
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 rounded-lg flex items-start gap-2 border border-blue-100 dark:border-blue-900 mb-2">
                  <Info className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">
                    Click anywhere on the map to drop your scrapyard/office
                    location.
                  </p>
                </div>
                <div className="rounded-xl overflow-hidden border-2 border-border focus-within:border-blue-500 transition-colors shadow-sm relative">
                  <MapLoader
                    interactive={true}
                    onLocationSelect={(lat, lng) =>
                      setFormData((p) => ({
                        ...p,
                        latitude: lat,
                        longitude: lng,
                      }))
                    }
                    height="300px"
                  />
                  {formData.latitude && (
                    <div className="absolute bottom-4 left-4 z-[400] bg-background/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-border text-xs font-semibold flex items-center gap-1.5 animate-in slide-in-from-bottom-2">
                      <MapPin className="h-3 w-3 text-blue-600" /> Location
                      Captured
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </>
        )}

        <CardFooter className="bg-muted/20 border-t p-6 flex justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1 || isSubmitting}
          >
            Back
          </Button>

          {step === 1 ? (
            <Button
              onClick={handleNext}
              className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
            >
              Next Step <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px] shadow-lg shadow-blue-500/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                  Submitting...
                </>
              ) : (
                "Submit Application"
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
