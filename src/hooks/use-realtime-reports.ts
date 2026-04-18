"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribes to real-time waste report INSERTs for live dashboard counters.
 */
export function useRealtimeReportCount(initialCount: number = 0) {
  const [totalToday, setTotalToday] = useState(initialCount);
  const [latestReport, setLatestReport] = useState<any>(null);

  useEffect(() => {
    setTotalToday(initialCount);
  }, [initialCount]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("report-count-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "waste_reports",
        },
        (payload) => {
          setTotalToday((prev) => prev + 1);
          setLatestReport(payload.new);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { totalToday, latestReport };
}
