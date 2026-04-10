'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Route,
    Navigation,
    Clock,
    MapPin,
    Loader2,
    ChevronRight,
    Sparkles,
    TrendingDown,
    ExternalLink,
    AlertTriangle,
    LocateFixed,
} from 'lucide-react';
import { WASTE_CATEGORIES } from '@/lib/constants';

// Dynamic Leaflet imports (no SSR)
const MapContainer = dynamic(
    () => import('react-leaflet').then((mod) => mod.MapContainer),
    { ssr: false }
);
const TileLayer = dynamic(
    () => import('react-leaflet').then((mod) => mod.TileLayer),
    { ssr: false }
);
const Marker = dynamic(
    () => import('react-leaflet').then((mod) => mod.Marker),
    { ssr: false }
);
const Popup = dynamic(
    () => import('react-leaflet').then((mod) => mod.Popup),
    { ssr: false }
);
const Polyline = dynamic(
    () => import('react-leaflet').then((mod) => mod.Polyline),
    { ssr: false }
);

interface ReportData {
    id: string;
    latitude: number;
    longitude: number;
    status: string;
    predicted_class: string | null;
    confirmed_class: string | null;
    address_text: string | null;
    quantity_estimate: string | null;
    created_at: string;
    notes: string | null;
}

interface OptimizedStop {
    index: number;
    report: {
        id: string;
        latitude: number;
        longitude: number;
        wasteType: string;
        address: string;
    };
    distanceFromPrev: number;
    estimatedTimeFromPrev: number;
    cumulativeDistance: number;
    cumulativeTime: number;
    priorityScore: number;
    priorityReason: string;
}

interface RouteResult {
    stops: OptimizedStop[];
    totalStops: number;
    totalDistance: number;
    totalTime: number;
    naiveDistance: number;
    timeSaved: number;
    distanceSaved: number;
    optimizationMethod: string;
}

interface Props {
    reports: ReportData[];
    defaultCenter: [number, number];
}

export default function RouteOptimizerMap({ reports, defaultCenter }: Props) {
    const [route, setRoute] = useState<RouteResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [collectorPos, setCollectorPos] = useState<[number, number] | null>(null);
    const [selectedStop, setSelectedStop] = useState<number | null>(null);

    // Get collector's current location
    const getLocation = useCallback(() => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setCollectorPos([pos.coords.latitude, pos.coords.longitude]);
                    setError(null);
                },
                () => {
                    // Fallback to default center
                    setCollectorPos(defaultCenter);
                    setError(null);
                }
            );
        } else {
            setCollectorPos(defaultCenter);
        }
    }, [defaultCenter]);

    // Optimize route
    const optimizeRoute = useCallback(async () => {
        const startPos = collectorPos || defaultCenter;
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/optimize-route', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    collectorLat: startPos[0],
                    collectorLng: startPos[1],
                    reports: reports.map((r) => ({
                        id: r.id,
                        latitude: r.latitude,
                        longitude: r.longitude,
                        wasteType: r.confirmed_class || r.predicted_class || 'mixed',
                        quantity: r.quantity_estimate,
                        createdAt: r.created_at,
                        address: r.address_text || 'Unknown',
                        status: r.status,
                    })),
                }),
            });

            const data = await response.json();
            if (data.success) {
                setRoute(data.route);
            } else {
                setError(data.error || 'Failed to optimize route');
            }
        } catch (err: any) {
            setError(err.message || 'Network error');
        } finally {
            setLoading(false);
        }
    }, [collectorPos, defaultCenter, reports]);

    // Build polyline coordinates
    const polylineCoords: [number, number][] = route
        ? [
              collectorPos || defaultCenter,
              ...route.stops.map((s) => [s.report.latitude, s.report.longitude] as [number, number]),
          ]
        : [];

    // Google Maps navigation URL
    const getGoogleMapsUrl = () => {
        if (!route || route.stops.length === 0) return '#';
        const start = collectorPos || defaultCenter;
        const waypoints = route.stops
            .slice(0, -1)
            .map((s) => `${s.report.latitude},${s.report.longitude}`)
            .join('|');
        const last = route.stops[route.stops.length - 1];
        const dest = `${last.report.latitude},${last.report.longitude}`;
        return `https://www.google.com/maps/dir/?api=1&origin=${start[0]},${start[1]}&destination=${dest}&waypoints=${waypoints}&travelmode=driving`;
    };

    const getPriorityColor = (score: number) => {
        if (score >= 0.8) return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800';
        if (score >= 0.6) return 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800';
        return 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800';
    };

    return (
        <div className="space-y-6">
            {/* ── Controls Bar ── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Button
                    variant="outline"
                    onClick={getLocation}
                    className="gap-2"
                    disabled={loading}
                >
                    <LocateFixed className="h-4 w-4" />
                    {collectorPos ? 'Location Set' : 'Set My Location'}
                </Button>

                <Button
                    onClick={optimizeRoute}
                    disabled={loading || reports.length === 0}
                    className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/25 border-0"
                >
                    {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Sparkles className="h-4 w-4" />
                    )}
                    {loading ? 'AI Optimizing...' : 'Generate Optimal Route'}
                </Button>

                {route && (
                    <Button
                        asChild
                        variant="outline"
                        className="gap-2 border-blue-300 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                    >
                        <a href={getGoogleMapsUrl()} target="_blank" rel="noopener noreferrer">
                            <Navigation className="h-4 w-4" />
                            Start Navigation
                            <ExternalLink className="h-3 w-3" />
                        </a>
                    </Button>
                )}

                <div className="ml-auto text-sm text-muted-foreground">
                    {reports.length} pickup{reports.length !== 1 ? 's' : ''} available
                </div>
            </div>

            {/* ── Error ── */}
            {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-600 text-sm border border-red-200 dark:border-red-800">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* ── Optimization Stats ── */}
            {route && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-slide-up">
                    <Card className="border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
                        <CardContent className="pt-4 pb-3 px-4">
                            <div className="flex items-center gap-2 mb-1">
                                <MapPin className="h-4 w-4 text-emerald-600" />
                                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Total Stops</span>
                            </div>
                            <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">{route.totalStops}</div>
                        </CardContent>
                    </Card>
                    <Card className="border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
                        <CardContent className="pt-4 pb-3 px-4">
                            <div className="flex items-center gap-2 mb-1">
                                <Route className="h-4 w-4 text-blue-600" />
                                <span className="text-xs font-medium text-blue-700 dark:text-blue-400">Distance</span>
                            </div>
                            <div className="text-2xl font-extrabold text-blue-700 dark:text-blue-400">{route.totalDistance} km</div>
                        </CardContent>
                    </Card>
                    <Card className="border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                        <CardContent className="pt-4 pb-3 px-4">
                            <div className="flex items-center gap-2 mb-1">
                                <Clock className="h-4 w-4 text-amber-600" />
                                <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Est. Time</span>
                            </div>
                            <div className="text-2xl font-extrabold text-amber-700 dark:text-amber-400">{route.totalTime} min</div>
                        </CardContent>
                    </Card>
                    <Card className="border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20">
                        <CardContent className="pt-4 pb-3 px-4">
                            <div className="flex items-center gap-2 mb-1">
                                <TrendingDown className="h-4 w-4 text-purple-600" />
                                <span className="text-xs font-medium text-purple-700 dark:text-purple-400">Time Saved</span>
                            </div>
                            <div className="text-2xl font-extrabold text-purple-700 dark:text-purple-400">{route.timeSaved} min</div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ── Map + Stop List ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Map */}
                <div className="lg:col-span-2 h-[550px] rounded-xl overflow-hidden border border-border/60 shadow-soft relative">
                    <MapContainer
                        center={collectorPos || defaultCenter}
                        zoom={13}
                        scrollWheelZoom={true}
                        className="h-full w-full z-0"
                        style={{ height: '100%', width: '100%' }}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        {/* Route polyline */}
                        {route && polylineCoords.length > 1 && (
                            <Polyline
                                positions={polylineCoords}
                                pathOptions={{
                                    color: '#10B981',
                                    weight: 4,
                                    opacity: 0.8,
                                    dashArray: '10, 6',
                                }}
                            />
                        )}

                        {/* Collector position marker */}
                        {collectorPos && (
                            <Marker position={collectorPos}>
                                <Popup>
                                    <div className="p-1 text-center">
                                        <strong>📍 Your Location</strong>
                                        <p className="text-xs text-gray-500">Route starts here</p>
                                    </div>
                                </Popup>
                            </Marker>
                        )}

                        {/* Stop markers (unoptimized — all reports) */}
                        {!route &&
                            reports.map((r) => {
                                const wasteType = r.confirmed_class || r.predicted_class || 'mixed';
                                const cat = WASTE_CATEGORIES[wasteType as keyof typeof WASTE_CATEGORIES];
                                return (
                                    <Marker key={r.id} position={[r.latitude, r.longitude]}>
                                        <Popup>
                                            <div className="p-1">
                                                <strong className="capitalize">{cat?.label || wasteType}</strong>
                                                <p className="text-xs text-gray-500 mt-1">{r.address_text || 'Unknown'}</p>
                                                <span className="text-xs capitalize text-blue-600">{r.status}</span>
                                            </div>
                                        </Popup>
                                    </Marker>
                                );
                            })}

                        {/* Optimized route markers */}
                        {route?.stops.map((stop) => (
                            <Marker key={stop.report.id} position={[stop.report.latitude, stop.report.longitude]}>
                                <Popup>
                                    <div className="p-1 min-w-[180px]">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">
                                                {stop.index}
                                            </span>
                                            <strong className="capitalize">{stop.report.wasteType}</strong>
                                        </div>
                                        <p className="text-xs text-gray-500">{stop.report.address}</p>
                                        <div className="flex items-center gap-2 mt-2 text-xs">
                                            <span>📏 {stop.distanceFromPrev} km</span>
                                            <span>⏱ {stop.estimatedTimeFromPrev} min</span>
                                        </div>
                                        <div className="text-xs text-amber-600 mt-1">
                                            Priority: {Math.round(stop.priorityScore * 100)}%
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>

                    {/* Map overlay: AI optimizing indicator */}
                    {loading && (
                        <div className="absolute inset-0 z-[1000] bg-background/60 backdrop-blur-sm flex items-center justify-center">
                            <div className="flex flex-col items-center gap-3 p-6 rounded-2xl glass">
                                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                                <span className="text-sm font-medium">AI is optimizing your route...</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Stop List Sidebar */}
                <div className="lg:col-span-1">
                    <Card className="shadow-subtle overflow-hidden border border-border/60 h-[550px] flex flex-col">
                        <CardHeader className="pb-3 flex-shrink-0">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <Route className="h-4 w-4 text-emerald-600" />
                                {route ? 'Optimized Route' : 'Pending Pickups'}
                            </CardTitle>
                            {route && (
                                <p className="text-xs text-muted-foreground">
                                    {route.optimizationMethod}
                                </p>
                            )}
                        </CardHeader>

                        <CardContent className="flex-1 overflow-y-auto p-3 pt-0 space-y-2">
                            {route ? (
                                <>
                                    {/* Collector start */}
                                    <div className="flex items-center gap-3 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                                        <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
                                            ★
                                        </div>
                                        <div>
                                            <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">Start</span>
                                            <p className="text-[10px] text-muted-foreground">Your location</p>
                                        </div>
                                    </div>

                                    {route.stops.map((stop) => {
                                        const wasteType = stop.report.wasteType;
                                        const cat = WASTE_CATEGORIES[wasteType as keyof typeof WASTE_CATEGORIES];

                                        return (
                                            <div
                                                key={stop.report.id}
                                                className={`group flex items-start gap-3 p-3 rounded-lg border transition-all duration-200 cursor-pointer hover:bg-muted/40 ${
                                                    selectedStop === stop.index
                                                        ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
                                                        : 'border-border/50'
                                                }`}
                                                onClick={() => setSelectedStop(stop.index === selectedStop ? null : stop.index)}
                                            >
                                                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
                                                    {stop.index}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-sm capitalize truncate">
                                                            {cat?.icon} {cat?.label || wasteType}
                                                        </span>
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-[9px] px-1.5 py-0 ${getPriorityColor(stop.priorityScore)}`}
                                                        >
                                                            {Math.round(stop.priorityScore * 100)}%
                                                        </Badge>
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                                        {stop.report.address}
                                                    </p>
                                                    <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                                                        <span className="flex items-center gap-0.5">
                                                            <Route className="h-3 w-3" />
                                                            {stop.distanceFromPrev} km
                                                        </span>
                                                        <span className="flex items-center gap-0.5">
                                                            <Clock className="h-3 w-3" />
                                                            {stop.estimatedTimeFromPrev} min
                                                        </span>
                                                    </div>
                                                    {selectedStop === stop.index && (
                                                        <p className="text-[10px] text-amber-600 mt-1 italic">
                                                            {stop.priorityReason}
                                                        </p>
                                                    )}
                                                </div>
                                                <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground transition-colors flex-shrink-0 mt-1" />
                                            </div>
                                        );
                                    })}
                                </>
                            ) : reports.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center">
                                    <MapPin className="h-12 w-12 text-muted-foreground/30 mb-3" />
                                    <p className="text-sm font-medium text-muted-foreground">No pickups available</p>
                                    <p className="text-xs text-muted-foreground/70 mt-1">
                                        Check back when residents report waste
                                    </p>
                                </div>
                            ) : (
                                reports.map((r) => {
                                    const wasteType = r.confirmed_class || r.predicted_class || 'mixed';
                                    const cat = WASTE_CATEGORIES[wasteType as keyof typeof WASTE_CATEGORIES];
                                    return (
                                        <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/40 hover:bg-muted/30 transition-colors">
                                            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs">
                                                {cat?.icon || '🗑️'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className="text-xs font-medium capitalize">{cat?.label || wasteType}</span>
                                                <p className="text-[10px] text-muted-foreground truncate">{r.address_text || 'Unknown'}</p>
                                            </div>
                                            <Badge variant="secondary" className="text-[9px] capitalize">{r.status}</Badge>
                                        </div>
                                    );
                                })
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
