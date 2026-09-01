"use client";

import { useEffect, useRef } from "react";
import {
  AttributionControl,
  Map,
  NavigationControl,
  type Map as MaplibreMap,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

type MapViewProps = {
  className?: string;
};

export function MapView({ className }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MaplibreMap | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
    const style = key
      ? `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${key}`
      : {
          version: 8 as const,
          sources: {},
          layers: [
            {
              id: "background",
              type: "background" as const,
              paint: { "background-color": "#0f1419" },
            },
          ],
        };

    const map = new Map({
      container: containerRef.current,
      style,
      center: [151.2093, -33.8688],
      zoom: 2,
      attributionControl: false,
    });

    map.addControl(new NavigationControl(), "top-right");
    map.addControl(
      new AttributionControl({ compact: true }),
      "bottom-right"
    );

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className ?? "h-full w-full"}
      aria-label="Live runner map"
    />
  );
}
