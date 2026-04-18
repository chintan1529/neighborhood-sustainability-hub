import { createClient } from "@/lib/supabase/server";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { getPredictionGeoJson } from "@/lib/predictive-engine";

// Dynamic import of the map client component (it wraps LeafletMap)
// Actually we can reuse `Map` component with `markers` prop if we pass it through.
// Let's use a simpler approach: Re-export the Map component locally as client component,
// or create a page wrapper that loads the map.

const LeafletMap = dynamic(() => import("@/components/ui/leaflet-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-[80vh] w-full rounded-md" />,
});

export default async function CollectorMapPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch pending or assigned reports
  const { data: reports } = await supabase
    .from("waste_reports")
    .select(
      "id, latitude, longitude, status, predicted_class, confirmed_class, address_text",
    )
    // Filter for active status
    .in("status", ["pending", "assigned", "in_progress"])
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  const { data: predictedHotspotsRaw } = await supabase
    .from("predicted_reports")
    .select("id, latitude, longitude, predicted_category, status")
    .eq("status", "active");
  const predictedHotspots = predictedHotspotsRaw as Array<{
    id: string;
    latitude: number;
    longitude: number;
    predicted_category: string | null;
    status: string;
  }> | null;
  const heatmapGeoJson = await getPredictionGeoJson();

  const reportMarkers =
    (
      (reports ?? []) as Array<{
        id: string;
        latitude: number;
        longitude: number;
        status: string;
        predicted_class: string | null;
        confirmed_class: string | null;
        address_text: string | null;
      }>
    ).map((r) => ({
      id: r.id,
      latitude: r.latitude,
      longitude: r.longitude,
      status: r.status,
      label: r.confirmed_class || r.predicted_class || "Waste",
      address: r.address_text || "Unknown location",
    })) || [];

  const hotspotMarkers = (
    (predictedHotspots ?? []) as Array<{
      id: string;
      latitude: number;
      longitude: number;
      predicted_category: string | null;
      status: string;
    }>
  ).map((prediction) => ({
    id: `pred-${prediction.id}`,
    latitude: prediction.latitude,
    longitude: prediction.longitude,
    status: "predicted",
    label: `Predicted ${prediction.predicted_category || "waste"} hotspot`,
    address: "AI hotspot",
  }));

  const markers = [...reportMarkers, ...hotspotMarkers];

  // Default center (Bangalore)
  const center: [number, number] =
    markers.length > 0
      ? [markers[0].latitude, markers[0].longitude]
      : [12.9716, 77.5946];

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Pickup Map</h2>
        <p className="text-muted-foreground md:block hidden">
          Visualizing {reportMarkers.length} active reports and{" "}
          {hotspotMarkers.length} predicted hotspots
        </p>
      </div>

      <div className="flex-1 min-h-[600px] border rounded-lg overflow-hidden relative">
        <LeafletMap
          center={center}
          zoom={13}
          markers={markers}
          heatmapGeoJson={heatmapGeoJson as any}
        />
      </div>
    </div>
  );
}
