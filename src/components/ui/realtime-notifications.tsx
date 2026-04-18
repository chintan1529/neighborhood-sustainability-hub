"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { BellRing, CheckCircle, Truck } from "lucide-react";

export function RealtimeNotifications({ userId }: { userId: string }) {
  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();

    // Subscribe to changes in waste_reports where user_id equals current user
    const channel = supabase
      .channel("realtime_reports_status")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "waste_reports",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const oldStatus = payload.old.status;
          const newStatus = payload.new.status;

          if (oldStatus !== newStatus) {
            // Play a gentle notification sound
            try {
              const audio = new Audio("/notification.mp3"); // We'll assume they can drop an mp3 later or browser default dings
              audio.volume = 0.5;
              audio.play().catch(() => {}); // catch autoplay restrictions
            } catch (e) {}

            // Show beautiful toast
            if (newStatus === "assigned") {
              toast("Collector Dispatched! 🚛", {
                description:
                  "A collector has claimed your waste report and is on their way.",
                duration: 5000,
                icon: <Truck className="h-5 w-5 text-blue-500" />,
              });
            } else if (newStatus === "completed") {
              toast.success("Pickup Completed! ✨", {
                description:
                  "Your waste has been collected. You can now leave a review!",
                duration: 6000,
                icon: <CheckCircle className="h-5 w-5 text-emerald-500" />,
              });
            } else if (newStatus === "verified") {
              toast("Verification Complete ✅", {
                description:
                  "Your latest report has been officially verified by the admin.",
                duration: 5000,
              });
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <div className="fixed bottom-4 right-4 z-50 pointer-events-none opacity-0">
      {/* Invisible mount point for the listener */}
      <BellRing className="h-4 w-4" />
    </div>
  );
}
