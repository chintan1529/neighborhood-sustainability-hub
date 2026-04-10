'use client';

import { useEffect, useMemo } from 'react';
import { GeoJSON, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import L from 'leaflet';
import 'leaflet.markercluster';
import { Badge } from '@/components/ui/badge';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapMarker {
    id: string;
    latitude: number;
    longitude: number;
    status: string;
    label: string;
    address?: string;
}

interface HeatmapFeatureCollection {
    type: 'FeatureCollection';
    features: Array<{
        type: 'Feature';
        geometry: {
            type: 'Point';
            coordinates: [number, number];
        };
        properties: {
            id: string;
            zoneId?: string;
            confidence?: number;
            weight?: number;
            predictedCategory?: string;
            reason?: string;
        };
    }>;
}

interface MapProps {
    center: [number, number];
    zoom?: number;
    onLocationSelect?: (lat: number, lng: number) => void;
    markerPosition?: [number, number] | null;
    markers?: MapMarker[];
    heatmapGeoJson?: HeatmapFeatureCollection | null;
}

function LocationMarker({
    onSelect,
    position,
}: {
    onSelect?: (lat: number, lng: number) => void;
    position?: [number, number] | null;
}) {
    const map = useMapEvents({
        click(e) {
            if (onSelect) {
                onSelect(e.latlng.lat, e.latlng.lng);
                map.flyTo(e.latlng, map.getZoom());
            }
        },
    });

    useEffect(() => {
        map.invalidateSize();
    }, [map]);

    useEffect(() => {
        if (position) {
            map.flyTo(position, map.getZoom());
        }
    }, [position, map]);

    return position ? <Marker position={position} /> : null;
}

function ClusteredMarkers({ markers = [] }: { markers?: MapMarker[] }) {
    const map = useMap();

    useEffect(() => {
        const clusterGroup = (L as any).markerClusterGroup();
        markers.forEach((marker) => {
            const leafletMarker = L.marker([marker.latitude, marker.longitude]);
            leafletMarker.bindPopup(`
                <div style="min-width:160px">
                    <strong>${marker.label}</strong><br/>
                    <small>${marker.status}</small><br/>
                    <small>${marker.address || ''}</small>
                </div>
            `);
            clusterGroup.addLayer(leafletMarker);
        });

        map.addLayer(clusterGroup);
        return () => {
            map.removeLayer(clusterGroup);
        };
    }, [map, markers]);

    return null;
}

export default function LeafletMap({
    center,
    zoom = 15,
    onLocationSelect,
    markerPosition,
    markers,
    heatmapGeoJson,
}: MapProps) {
    const heatmapStyle = useMemo(
        () => ({
            pointToLayer: (_feature: any, latlng: L.LatLng) => {
                const confidence = Number(_feature?.properties?.confidence ?? 0.5);
                return L.circleMarker(latlng, {
                    radius: 18,
                    fillColor: confidence >= 0.8 ? '#ef4444' : confidence >= 0.65 ? '#f59e0b' : '#3b82f6',
                    color: '#ffffff',
                    weight: 1,
                    opacity: 0.9,
                    fillOpacity: Math.max(0.25, confidence),
                });
            },
            onEachFeature: (feature: any, layer: any) => {
                layer.bindPopup(`
                    <div style="min-width:180px">
                        <strong>Predicted hotspot</strong><br/>
                        <small>Zone: ${feature.properties?.zoneId || 'n/a'}</small><br/>
                        <small>Confidence: ${Math.round((feature.properties?.confidence || 0) * 100)}%</small><br/>
                        <small>${feature.properties?.reason || ''}</small>
                    </div>
                `);
            },
        }),
        []
    );

    return (
        <div className="h-full w-full relative">
            <MapContainer
                center={center}
                zoom={zoom}
                scrollWheelZoom={true}
                className="h-full w-full rounded-md z-0"
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <LocationMarker onSelect={onLocationSelect} position={markerPosition} />
                <ClusteredMarkers markers={markers} />

                {heatmapGeoJson && heatmapGeoJson.features.length > 0 && (
                    <GeoJSON data={heatmapGeoJson as any} {...heatmapStyle} />
                )}

                {markers && markers.length > 0 && (
                    <div className="hidden">
                        {markers.map((marker) => (
                            <Marker key={marker.id} position={[marker.latitude, marker.longitude]}>
                                <Popup>
                                    <div className="p-1">
                                        <strong className="block capitalize mb-1">{marker.label}</strong>
                                        <Badge variant="outline" className="mb-2">
                                            {marker.status}
                                        </Badge>
                                        <p className="text-xs text-muted-foreground">{marker.address}</p>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </div>
                )}
            </MapContainer>
        </div>
    );
}
