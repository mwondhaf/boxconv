"use client";

import { useConvexQuery } from "@convex-dev/react-query";
import { Map, MapPin } from "lucide-react";
import * as React from "react";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "convex/_generated/api";

// =============================================================================
// Constants
// =============================================================================

// Mapbox access token - should be moved to env in production
const MAPBOX_ACCESS_TOKEN =
  "pk.eyJ1IjoiYm94a3Vib3giLCJhIjoiY21ldzk0cXp0MGo1ZzJrcjEzbWk2Z29yaSJ9.06cX9ffhjzSRbLpc3yKzWA";

// Zone colors for the map
const ZONE_COLORS = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#84cc16", // lime
];

// =============================================================================
// Types
// =============================================================================

type IsochroneFeature = {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: {
    type: "Polygon";
    coordinates: [number, number][][];
  };
};

type IsochroneResponse = {
  type: "FeatureCollection";
  features: IsochroneFeature[];
};

// =============================================================================
// Helpers
// =============================================================================

/**
 * Fetch isochrone polygon from Mapbox API based on driving distance
 */
async function fetchIsochrone(
  lng: number,
  lat: number,
  distanceMeters: number
): Promise<[number, number][][] | null> {
  try {
    // Mapbox Isochrone API has a limit of ~60 minutes driving time
    // For distance, they use contours_meters with max around 100km
    // If distance is too large, we might need to cap it
    const cappedDistance = Math.min(distanceMeters, 100000); // Cap at 100km

    const url = new URL(
      `https://api.mapbox.com/isochrone/v1/mapbox/driving/${lng},${lat}`
    );
    url.searchParams.set("contours_meters", String(cappedDistance));
    url.searchParams.set("polygons", "true");
    url.searchParams.set("generalize", "500");
    url.searchParams.set("access_token", MAPBOX_ACCESS_TOKEN);

    const response = await fetch(url.toString());
    if (!response.ok) return null;

    const data: IsochroneResponse = await response.json();
    if (data.features.length > 0) {
      return data.features[0].geometry.coordinates;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Generate circle polygon coordinates (fallback when isochrone fails)
 */
function generateCircleCoordinates(
  centerLat: number,
  centerLng: number,
  maxDistanceMeters: number,
  points = 64
): [number, number][] {
  const coordinates: [number, number][] = [];
  const earthRadius = 6371000;

  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const latOffset =
      (maxDistanceMeters / earthRadius) * Math.cos(angle) * (180 / Math.PI);
    const lngOffset =
      ((maxDistanceMeters / earthRadius) * Math.sin(angle) * (180 / Math.PI)) /
      Math.cos((centerLat * Math.PI) / 180);

    coordinates.push([centerLng + lngOffset, centerLat + latOffset]);
  }

  return coordinates;
}

/**
 * Format distance for display
 */
function formatDistance(meters: number): string {
  return `${(meters / 1000).toFixed(1)} km`;
}

// =============================================================================
// Component
// =============================================================================

export function AdminCoveragePage() {
  const mapContainer = React.useRef<HTMLDivElement>(null);
  // biome-ignore lint/suspicious/noExplicitAny: Mapbox GL JS loaded dynamically from CDN
  const map = React.useRef<any>(null);
  const mapInitialized = React.useRef(false);
  const [mapLoaded, setMapLoaded] = React.useState(false);
  const [isochronesLoading, setIsochronesLoading] = React.useState(true);
  const [zoneIsochrones, setZoneIsochrones] = React.useState<
    globalThis.Map<string, [number, number][][]>
  >(new globalThis.Map());

  // Fetch all zones (not just active ones)
  const zones = useConvexQuery(api.deliveryZones.list, {});
  const zonesLoading = zones === undefined;

  // Stable zone IDs for dependency tracking
  const zoneIds = zones?.map((z) => z._id).join(",") ?? "";

  // Fetch isochrones for all zones based on driving distance
  React.useEffect(() => {
    if (!zones || zones.length === 0) {
      setIsochronesLoading(false);
      return;
    }

    let cancelled = false;

    const fetchAllIsochrones = async () => {
      setIsochronesLoading(true);
      const newIsochrones = new globalThis.Map<string, [number, number][][]>();

      await Promise.all(
        zones.map(async (zone) => {
          const coords = await fetchIsochrone(
            zone.centerLng,
            zone.centerLat,
            zone.maxDistanceMeters
          );
          if (coords && !cancelled) {
            newIsochrones.set(zone._id, coords);
          }
        })
      );

      if (!cancelled) {
        setZoneIsochrones(newIsochrones);
        setIsochronesLoading(false);
      }
    };

    fetchAllIsochrones();

    return () => {
      cancelled = true;
    };
  }, [zoneIds]);

  // Calculate map center from zones
  const mapCenter =
    zones && zones.length > 0
      ? {
          lng: zones.reduce((sum, z) => sum + z.centerLng, 0) / zones.length,
          lat: zones.reduce((sum, z) => sum + z.centerLat, 0) / zones.length,
        }
      : { lng: 32.55, lat: 0.2 }; // Default: Uganda

  // Initialize map
  React.useEffect(() => {
    if (
      !mapContainer.current ||
      mapInitialized.current ||
      !zones ||
      zones.length === 0 ||
      isochronesLoading
    )
      return;

    mapInitialized.current = true;

    // Dynamically load Mapbox GL JS
    const loadMapbox = () => {
      // Check if already loaded
      // biome-ignore lint/suspicious/noExplicitAny: Mapbox GL JS loaded dynamically
      if ((window as any).mapboxgl) {
        initializeMap();
        return;
      }

      // Add Mapbox CSS
      const link = document.createElement("link");
      link.href = "https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css";
      link.rel = "stylesheet";
      document.head.appendChild(link);

      // Add Mapbox JS
      const script = document.createElement("script");
      script.src = "https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js";
      script.async = true;
      script.onload = () => {
        initializeMap();
      };
      document.head.appendChild(script);
    };

    const initializeMap = () => {
      // biome-ignore lint/suspicious/noExplicitAny: Mapbox GL JS loaded dynamically
      const mapboxgl = (window as any).mapboxgl;

      mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [mapCenter.lng, mapCenter.lat],
        zoom: 10,
      });

      map.current.on("load", () => {
        if (!map.current || !zones) return;

        // Generate GeoJSON with isochrone polygons or fallback circles
        const geojson = {
          type: "FeatureCollection" as const,
          features: zones.map((zone, index) => {
            const isochroneCoords = zoneIsochrones.get(zone._id);
            const color =
              zone.color || ZONE_COLORS[index % ZONE_COLORS.length];
            return {
              type: "Feature" as const,
              properties: {
                id: zone._id,
                name: zone.name,
                color,
                maxDistanceKm: (zone.maxDistanceMeters / 1000).toFixed(0),
              },
              geometry: {
                type: "Polygon" as const,
                coordinates: isochroneCoords ?? [
                  generateCircleCoordinates(
                    zone.centerLat,
                    zone.centerLng,
                    zone.maxDistanceMeters
                  ),
                ],
              },
            };
          }),
        };

        // Add zones source
        map.current.addSource("zones", {
          type: "geojson",
          data: geojson,
        });

        // Add fill layer for zones
        map.current.addLayer({
          id: "zones-fill",
          type: "fill",
          source: "zones",
          paint: {
            "fill-color": ["get", "color"],
            "fill-opacity": 0.2,
          },
        });

        // Add outline layer for zones
        map.current.addLayer({
          id: "zones-outline",
          type: "line",
          source: "zones",
          paint: {
            "line-color": ["get", "color"],
            "line-width": 2,
            "line-opacity": 0.8,
          },
        });

        // Add markers for zone centers
        for (const [index, zone] of zones.entries()) {
          const color = zone.color || ZONE_COLORS[index % ZONE_COLORS.length];
          const hasIsochrone = zoneIsochrones.has(zone._id);
          const el = document.createElement("div");
          el.className = "zone-marker";
          el.style.cssText = `
            width: 24px;
            height: 24px;
            background-color: ${color};
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            cursor: pointer;
          `;

          const maxDistanceKm = (zone.maxDistanceMeters / 1000).toFixed(0);
          const boundaryType = hasIsochrone ? "Driving distance" : "Radius";

          new mapboxgl.Marker(el)
            .setLngLat([zone.centerLng, zone.centerLat])
            .setPopup(
              new mapboxgl.Popup({ offset: 25 }).setHTML(`
                <div style="padding: 8px;">
                  <h3 style="margin: 0 0 4px 0; font-weight: 600; color: ${color};">${zone.name}</h3>
                  <p style="margin: 0; font-size: 14px; color: #666;">${zone.city}</p>
                  <p style="margin: 4px 0 0 0; font-size: 12px; color: #999;">${boundaryType}: ${maxDistanceKm}km max</p>
                </div>
              `)
            )
            .addTo(map.current);
        }

        // Add navigation controls
        map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

        setMapLoaded(true);
      });
    };

    loadMapbox();

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
        mapInitialized.current = false;
      }
    };
  }, [zoneIds, isochronesLoading]);

  // Loading state
  if (zonesLoading) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="mt-2 h-4 w-96" />
        </div>
        <div className="grid gap-6 lg:grid-cols-4">
          <Skeleton className="h-125 lg:col-span-3 lg:h-150" />
          <div className="space-y-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 font-bold text-2xl">
          <Map className="size-6" />
          Delivery Coverage Areas
        </h1>
        <p className="mt-1 text-muted-foreground">
          All delivery zones shown on the map. Zones use driving distance
          isochrones when available.
        </p>
      </div>

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Map */}
        <Card className="relative overflow-hidden p-0 lg:col-span-3">
          <div className="h-125 w-full lg:h-150" ref={mapContainer} />
          {(!mapLoaded || isochronesLoading) && zones && zones.length > 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
              <div className="text-muted-foreground">
                {isochronesLoading
                  ? "Calculating driving distances..."
                  : "Loading map..."}
              </div>
            </div>
          )}
          {(!zones || zones.length === 0) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/50">
              <MapPin className="mb-2 size-12 text-muted-foreground/50" />
              <div className="text-muted-foreground">
                No active zones configured
              </div>
              <p className="mt-1 text-muted-foreground/75 text-sm">
                Add zones in the Pricing section
              </p>
            </div>
          )}
        </Card>

        {/* Zone list */}
        <Card className="h-fit lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Coverage Zones</CardTitle>
            <CardDescription>
              {zones?.length ?? 0}{" "}
              {(zones?.length ?? 0) === 1 ? "zone" : "zones"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {zones?.map((zone, index) => (
              <div
                className={`rounded-lg border p-3 transition-colors hover:bg-accent ${!zone.active ? "opacity-60" : ""}`}
                key={zone._id}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="size-3 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          zone.color || ZONE_COLORS[index % ZONE_COLORS.length],
                      }}
                    />
                    <h3 className="font-medium">{zone.name}</h3>
                    {!zone.active && (
                      <Badge variant="outline" className="text-xs">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <Badge
                    variant={
                      zoneIsochrones.has(zone._id) ? "default" : "secondary"
                    }
                  >
                    {formatDistance(zone.maxDistanceMeters)}
                  </Badge>
                </div>
                <p className="mt-1 text-muted-foreground text-xs">
                  {zone.city} •{" "}
                  {zoneIsochrones.has(zone._id)
                    ? "Driving distance"
                    : "Radius fallback"}
                </p>
              </div>
            ))}

            {(!zones || zones.length === 0) && (
              <p className="text-muted-foreground text-sm">
                No zones configured yet. Add zones in the Pricing section.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Map Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="size-4 rounded-sm bg-blue-500/20 ring-2 ring-blue-500" />
              <span>Zone coverage area (driving distance)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-4 rounded-full bg-blue-500 ring-2 ring-white" />
              <span>Zone center point</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default">5.0 km</Badge>
              <span>Max delivery distance</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Radius fallback</Badge>
              <span>When isochrone unavailable</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminCoveragePage;
