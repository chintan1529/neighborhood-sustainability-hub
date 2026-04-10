'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

// Dynamically import Map with no SSR
const LeafletMap = dynamic(() => import('@/components/ui/leaflet-map'), {
    ssr: false,
    loading: () => <Skeleton className="h-[600px] w-full rounded-md" />,
});

// We need to fetch markers data. 
// Ideally passed from server component page wrapper, or fetched client-side.
// Let's assume page wrapper passes data.

interface MapPageProps {
    markers: Array<{
        id: string;
        latitude: number;
        longitude: number;
        status: string;
        label: string;
    }>;
}

export default function CollectorMapClient({ markers }: MapPageProps) {
    // Center map on first marker or default to Bangalore
    const center: [number, number] = markers.length > 0
        ? [markers[0].latitude, markers[0].longitude]
        : [12.9716, 77.5946];

    return (
        <div className="h-[calc(100vh-120px)] w-full relative">
            <Card className="h-full w-full p-0 overflow-hidden">
                <LeafletMap
                    center={center}
                    zoom={13}
                // Logic to show multiple markers would require upgrading LeafletMap component
                // For now, LeafletMap only supports single marker or selection.
                // I need to update LeafletMap to support `markers` prop.
                />
                {/* Overlay info */}
                <div className="absolute bottom-4 left-4 z-[1000] bg-white p-4 rounded-lg shadow-lg max-w-sm">
                    <h3 className="font-bold">Active Reports Map</h3>
                    <p className="text-sm text-muted-foreground">Showing {markers.length} pending pickups</p>
                </div>
            </Card>
        </div>
    );
}
