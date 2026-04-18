"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { acceptOffer } from "@/app/actions/marketplace";

interface AcceptOfferButtonProps {
  offerId: string;
  price: number;
  businessName: string;
  isTopOffer?: boolean;
}

export function AcceptOfferButton({
  offerId,
  price,
  businessName,
  isTopOffer,
}: AcceptOfferButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isAccepting, setIsAccepting] = useState(false);

  const handleAccept = async () => {
    setIsAccepting(true);
    const result = await acceptOffer(offerId);
    setIsAccepting(false);

    if (result.success) {
      toast({
        title: "Transaction Locked! 🎉",
        description: `You accepted ${businessName}'s offer at ₹${price}/kg. They have been notified for pickup.`,
      });
      startTransition(() => {
        router.refresh();
      });
    } else {
      toast({
        title: "Failed to accept offer",
        description: result.error || "Please try again later.",
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      onClick={handleAccept}
      disabled={isPending || isAccepting}
      className={`w-full ${isTopOffer ? "bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/20" : "bg-blue-600 hover:bg-blue-700"}`}
    >
      {isPending || isAccepting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Locking Deal...
        </>
      ) : (
        <>
          {isTopOffer ? (
            <Award className="mr-2 h-4 w-4" />
          ) : (
            <CheckCircle2 className="mr-2 h-4 w-4" />
          )}
          Accept Offer @ ₹{price}
        </>
      )}
    </Button>
  );
}
