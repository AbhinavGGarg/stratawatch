"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cellToBoundary } from "h3-js";
import { Info } from "lucide-react";
import type { RegionState } from "@/lib/types";

interface MapPanelProps {
  regions: RegionState[];
  selectedRegionId: string | null;
  onSelectRegion: (regionId: string) => void;
  isLoading: boolean;
}

interface HoverDetails {
  x: number;
  y: number;
  name: string;
  risk: number;
  drivers: string;
}

interface MapFeature {
  properties?: Record<string, unknown>;
}

interface MapPointerEvent {
  point: {
    x: number;
    y: number;
  };
  features?: MapFeature[];
}

interface MapSourceLike {
  setData: (data: GeoJSON.FeatureCollection<GeoJSON.Polygon>) => void;
}

interface MapLike {
  addControl: (control: unknown, position?: string) => void;
  addSource: (id: string, source: Record<string, unknown>) => void;
  getSource: (id: string) => unknown;
  addLayer: (layer: Record<string, unknown>) => void;
  getLayer: (id: string) => unknown;
  on: {
    (event: string, listener: (event: MapPointerEvent) => void): void;
    (event: string, layerId: string, listener: (event: MapPointerEvent) => void): void;
  };
  setFilter: (layerId: string, filter: unknown[]) => void;
  getCanvas: () => HTMLCanvasElement;
  remove: () => void;
}

interface MapLibrary {
  Map: new (options: {
    container: HTMLElement;
    style: string;
    center: [number, number];
    zoom: number;
    projection: "mercator";
    attributionControl: boolean;
    dragRotate: boolean;
    dragPan?: boolean;
    scrollZoom?: boolean;
    doubleClickZoom?: boolean;
    touchZoomRotate?: boolean;
    minZoom?: number;
    maxZoom?: number;
    renderWorldCopies?: boolean;
  }) => MapLike;
  NavigationControl: new (options: { showCompass: boolean }) => unknown;
  accessToken?: string;
}

const SOURCE_ID = "risk-hex-source";
const FILL_LAYER_ID = "risk-hex-fill";
const OUTLINE_LAYER_ID = "risk-hex-outline";
const HIGHLIGHT_LAYER_ID = "risk-hex-highlight";

const defaultStyle = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

const clamp = (value: number, min = 0, max = 1): number => Math.max(min, Math.min(max, value));

const riskToPercent = (value: number): string => `${Math.round(clamp(value) * 100)}%`;

const toGeoJson = (regions: RegionState[]): GeoJSON.FeatureCollection<GeoJSON.Polygon> => ({
  type: "FeatureCollection",
  features: regions.map((region) => {
    const boundary = cellToBoundary(region.hexId, true) as Array<[number, number]>;
    const closedBoundary = [...boundary, boundary[0]];

    return {
      type: "Feature",
      id: region.id,
      properties: {
        id: region.id,
        name: region.name,
        risk: Number(region.risk.toFixed(4)),
        drivers:
          region.drivers.length > 0
            ? region.drivers
                .map((driver) => driver.replaceAll("_", " "))
                .join(", ")
            : "No dominant drivers",
      },
      geometry: {
        type: "Polygon",
        coordinates: [closedBoundary],
      },
    };
  }),
});

const readStringProp = (props: Record<string, unknown>, key: string, fallback: string): string => {
  const value = props[key];
  return typeof value === "string" ? value : fallback;
};

const readNumberProp = (props: Record<string, unknown>, key: string, fallback = 0): number => {
  const value = props[key];
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
};

const loadMapLibrary = async (
  token: string | undefined,
): Promise<{ library: MapLibrary; provider: "mapbox" | "maplibre"; style: string }> => {
  if (token) {
    const mapboxModule = (await import("mapbox-gl")).default as unknown as MapLibrary;
    mapboxModule.accessToken = token;

    return {
      library: mapboxModule,
      provider: "mapbox",
      style: "mapbox://styles/mapbox/dark-v11",
    };
  }

  const mapLibreModule = (await import("maplibre-gl")).default as unknown as MapLibrary;
  return {
    library: mapLibreModule,
    provider: "maplibre",
    style: defaultStyle,
  };
};

export function MapPanel({ regions, selectedRegionId, onSelectRegion, isLoading }: MapPanelProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLike | null>(null);
  const onSelectRegionRef = useRef(onSelectRegion);
  const [hoverDetails, setHoverDetails] = useState<HoverDetails | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapProvider, setMapProvider] = useState<"mapbox" | "maplibre" | null>(null);

  const geojson = useMemo(() => toGeoJson(regions), [regions]);
  const geojsonRef = useRef(geojson);
  const selectedRegionIdRef = useRef(selectedRegionId);

  useEffect(() => {
    onSelectRegionRef.current = onSelectRegion;
  }, [onSelectRegion]);

  useEffect(() => {
    geojsonRef.current = geojson;
  }, [geojson]);

  useEffect(() => {
    selectedRegionIdRef.current = selectedRegionId;
  }, [selectedRegionId]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    let disposed = false;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim();

    const initMap = async () => {
      const runtime = await loadMapLibrary(token);

      if (disposed || !mapContainerRef.current) {
        return;
      }

      const map = new runtime.library.Map({
        container: mapContainerRef.current,
        style: runtime.style,
        center: [18, 20],
        zoom: 1.3,
        projection: "mercator",
        attributionControl: false,
        dragRotate: false,
        dragPan: true,
        scrollZoom: true,
        doubleClickZoom: true,
        touchZoomRotate: true,
        minZoom: 1,
        maxZoom: 8,
        renderWorldCopies: true,
      });

      map.addControl(new runtime.library.NavigationControl({ showCompass: false }), "bottom-right");
      setMapProvider(runtime.provider);

      const addLayers = () => {
        if (!map.getSource(SOURCE_ID)) {
          map.addSource(SOURCE_ID, {
            type: "geojson",
            data: geojsonRef.current,
          });
        }

        if (!map.getLayer(FILL_LAYER_ID)) {
          map.addLayer({
            id: FILL_LAYER_ID,
            type: "fill",
            source: SOURCE_ID,
            paint: {
              "fill-color": [
                "interpolate",
                ["linear"],
                ["get", "risk"],
                0,
                "#1D9B6C",
                0.45,
                "#EAB308",
                0.68,
                "#F97316",
                1,
                "#EF4444",
              ],
              "fill-opacity": 0.64,
              "fill-color-transition": { duration: 700, delay: 0 },
            },
          });
        }

        if (!map.getLayer(OUTLINE_LAYER_ID)) {
          map.addLayer({
            id: OUTLINE_LAYER_ID,
            type: "line",
            source: SOURCE_ID,
            paint: {
              "line-width": 0.8,
              "line-color": "rgba(255,255,255,0.15)",
            },
          });
        }

        if (!map.getLayer(HIGHLIGHT_LAYER_ID)) {
          map.addLayer({
            id: HIGHLIGHT_LAYER_ID,
            type: "line",
            source: SOURCE_ID,
            paint: {
              "line-width": 2,
              "line-color": "#FACC15",
            },
            filter: ["==", ["get", "id"], selectedRegionIdRef.current ?? ""],
          });
        }

        map.on("mousemove", FILL_LAYER_ID, (event) => {
          const feature = event.features?.[0];
          const properties = feature?.properties;

          if (!properties) {
            setHoverDetails(null);
            return;
          }

          setHoverDetails({
            x: event.point.x,
            y: event.point.y,
            name: readStringProp(properties, "name", "Unknown Region"),
            risk: readNumberProp(properties, "risk", 0),
            drivers: readStringProp(properties, "drivers", "No dominant drivers"),
          });
        });

        map.on("mouseleave", FILL_LAYER_ID, () => {
          setHoverDetails(null);
        });

        map.on("click", FILL_LAYER_ID, (event) => {
          const feature = event.features?.[0];
          const properties = feature?.properties;
          if (!properties) {
            return;
          }

          const regionId = properties.id;
          if (typeof regionId === "string") {
            onSelectRegionRef.current(regionId);
          }
        });

        map.on("mouseenter", FILL_LAYER_ID, () => {
          map.getCanvas().style.cursor = "pointer";
        });

        map.on("mouseleave", FILL_LAYER_ID, () => {
          map.getCanvas().style.cursor = "";
        });

        setMapReady(true);
      };

      map.on("load", addLayers);
      mapRef.current = map;
    };

    void initMap();

    return () => {
      disposed = true;
      setMapReady(false);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) {
      return;
    }

    const source = map.getSource(SOURCE_ID) as MapSourceLike | undefined;
    if (source && typeof source.setData === "function") {
      source.setData(geojson);
    }

    if (map.getLayer(HIGHLIGHT_LAYER_ID)) {
      map.setFilter(HIGHLIGHT_LAYER_ID, ["==", ["get", "id"], selectedRegionId ?? ""]);
    }
  }, [geojson, mapReady, selectedRegionId]);

  return (
    <section className="relative h-full min-h-0 overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/70 shadow-2xl shadow-black/30">
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between border-b border-white/10 bg-black/30 px-4 py-3 backdrop-blur">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Conflict Early-Warning Heatmap</h2>
          <p className="text-xs text-zinc-400">Live regional threat pressure for civilian awareness</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-zinc-300">
          <Info className="h-3 w-3" />
          {mapProvider === "mapbox" ? "Mapbox" : mapProvider === "maplibre" ? "MapLibre fallback" : "Loading"}
        </div>
      </div>

      <div ref={mapContainerRef} className="h-full w-full" />

      {(isLoading || !mapReady) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/35 backdrop-blur-sm">
          <div className="rounded-xl border border-white/15 bg-zinc-900/80 px-4 py-2 text-sm text-zinc-200">
            Loading conflict layers...
          </div>
        </div>
      )}

      {hoverDetails && (
        <div
          className="pointer-events-none absolute z-20 w-56 rounded-xl border border-white/10 bg-zinc-950/95 p-3 shadow-lg shadow-black/50"
          style={{
            left: hoverDetails.x + 18,
            top: hoverDetails.y + 66,
          }}
        >
          <p className="text-sm font-semibold text-zinc-100">{hoverDetails.name}</p>
          <p className="mt-1 text-xs text-zinc-400">Risk score: {riskToPercent(hoverDetails.risk)}</p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-300">Drivers: {hoverDetails.drivers}</p>
        </div>
      )}

      <div className="absolute bottom-4 left-4 z-10 rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-[11px] text-zinc-300 backdrop-blur">
        <div className="mb-1 font-medium text-zinc-200">Risk Gradient</div>
        <div className="flex items-center gap-1">
          <span className="h-2.5 w-8 rounded bg-[#1D9B6C]" />
          <span className="h-2.5 w-8 rounded bg-[#EAB308]" />
          <span className="h-2.5 w-8 rounded bg-[#F97316]" />
          <span className="h-2.5 w-8 rounded bg-[#EF4444]" />
        </div>
      </div>
    </section>
  );
}
