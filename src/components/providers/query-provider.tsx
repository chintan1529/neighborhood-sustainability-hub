"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale time of 1 minute
            staleTime: 60 * 1000,
            // Retry once on failure
            retry: 1,
            // Don't refetch on window focus in development
            refetchOnWindowFocus: process.env.NODE_ENV === "production",
          },
          mutations: {
            // Retry once on failure
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
