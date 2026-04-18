"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const LeafletMap = dynamic(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-md" />,
});

export default LeafletMap;
