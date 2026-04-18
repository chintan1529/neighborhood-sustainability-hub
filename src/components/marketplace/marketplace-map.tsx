"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix leaflet default icon issue reliably using unpkg CDNs
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Vibrant Custom Icons
const urgentIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const defaultCustomIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface MarketplaceMapProps {
  listings?: any[];
  onSelectListing?: (listing: any) => void;
  interactive?: boolean;
  onLocationSelect?: (lat: number, lng: number) => void;
  initialCenter?: [number, number];
  zoom?: number;
  height?: string;
  className?: string;
  showLocateMe?: boolean;
}

// Component to handle map clicks for dropping pins
function MapInteraction({
  onLocationSelect,
}: {
  onLocationSelect?: (lat: number, lng: number) => void;
}) {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const map = useMap();

  useMapEvents({
    click(e) {
      if (onLocationSelect) {
        setPosition([e.latlng.lat, e.latlng.lng]);
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      }
    },
    locationfound(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
      map.flyTo(e.latlng, map.getZoom());
      if (onLocationSelect) onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });

  return position && onLocationSelect ? (
    <Marker position={position} icon={defaultCustomIcon}>
      <Popup>Selected Location</Popup>
    </Marker>
  ) : null;
}

// Ensure the map centers when initialCenter prop updates statically
function MapCenterSync({ center }: { center?: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

// Locate Me Control Button
function LocateMeControl() {
  const map = useMap();
  return (
    <div
      className="leaflet-top leaflet-right"
      style={{
        pointerEvents: "auto",
        zIndex: 1000,
        position: "absolute",
        top: "10px",
        right: "10px",
      }}
    >
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          map.locate();
        }}
        className="bg-white hover:bg-gray-50 text-blue-600 shadow-md p-2 rounded-md font-medium flex items-center gap-1 border border-gray-200"
        title="Find my location"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2v4" />
          <path d="M12 18v4" />
          <path d="M4 12H2" />
          <path d="M22 12h-2" />
        </svg>
        <span className="text-xs">Locate Me</span>
      </button>
    </div>
  );
}

export default function MarketplaceMap({
  listings = [],
  onSelectListing,
  interactive = false,
  onLocationSelect,
  initialCenter = [20.5937, 78.9629], // Default center (India roughly)
  zoom = 13,
  height = "400px",
  className = "",
  showLocateMe = true,
}: MarketplaceMapProps) {
  // Parse PostGIS EWKT to [lat, lng] array
  const parseLocation = (wkt: string | undefined): [number, number] | null => {
    if (!wkt) return null;
    const match = wkt.match(/POINT\(([\d.-]+)\s+([\d.-]+)\)/);
    if (match) {
      // PostGIS uses POINT(LONGITUDE LATITUDE)
      return [parseFloat(match[2]), parseFloat(match[1])];
    }
    return null;
  };

  const getUrgencyScore = (createdAt: string) => {
    const daysOld =
      (new Date().getTime() - new Date(createdAt).getTime()) /
      (1000 * 3600 * 24);
    return daysOld > 3; // Example generic threshold
  };

  return (
    <div
      className={`rounded-xl overflow-hidden border border-border shadow-sm ${className}`}
      style={{ height }}
    >
      <MapContainer
        center={initialCenter}
        zoom={zoom}
        style={{ height: "100%", width: "100%", zIndex: 10 }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="map-tiles"
        />

        <MapCenterSync center={initialCenter} />

        {showLocateMe && <LocateMeControl />}

        {interactive && <MapInteraction onLocationSelect={onLocationSelect} />}

        {listings.map((listing) => {
          const coords = parseLocation(listing.location);
          if (!coords) return null;

          const isUrgent = getUrgencyScore(listing.created_at);

          return (
            <Marker
              key={listing.id}
              position={coords}
              icon={isUrgent ? urgentIcon : defaultCustomIcon}
              eventHandlers={{
                click: () => onSelectListing && onSelectListing(listing),
              }}
            >
              <Popup>
                <div className="p-1">
                  <h4 className="font-semibold text-sm">{listing.title}</h4>
                  <p className="text-xs text-muted-foreground">
                    {listing.weight_kg}kg • {listing.category}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
