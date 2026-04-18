"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { startPickup, completePickup } from "@/app/actions/marketplace";
import { Truck, CheckCircle2, Loader2 } from "lucide-react";

export default function PickupActions({
  transactionId,
  status,
}: {
  transactionId: string;
  status: string;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleStartPickup = async () => {
    setIsLoading(true);
    const result = await startPickup(transactionId);
    setIsLoading(false);
    if (result.success) {
      toast({
        title: "Pickup Started! 🚛",
        description:
          "The resident has been notified. Head to the pickup location.",
      });
      router.refresh();
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const handleCompletePickup = async () => {
    setIsLoading(true);
    const result = await completePickup(transactionId, "cash");
    setIsLoading(false);
    if (result.success) {
      toast({
        title: "Pickup Complete! 🎉",
        description: "Transaction marked as completed. Great work!",
      });
      router.refresh();
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-2">
      {status === "confirmed" && (
        <Button
          onClick={handleStartPickup}
          disabled={isLoading}
          className="w-full bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-500/20"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Truck className="mr-2 h-4 w-4" />
          )}
          Start Pickup
        </Button>
      )}
      {status === "picked_up" && (
        <Button
          onClick={handleCompletePickup}
          disabled={isLoading}
          className="w-full bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/20"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="mr-2 h-4 w-4" />
          )}
          Mark Complete
        </Button>
      )}
    </div>
  );
}
