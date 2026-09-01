"use client";

import { useEffect, useRef } from "react";
import {
  AttributionControl,
  Map,
  NavigationControl,
  setWorkerCount,
  setWorkerUrl,
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

    setWorkerUrl("/maplibre-gl-worker.mjs");
    setWorkerCount(0);

    const style = `${window.location.origin}/api/maptiler/maps/dataviz-dark/style.json`;

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

    map.on("load", () => {
      map.resize();
    });

    map.on("error", (event) => {
      console.error("MapLibre error:", event.error);
    });

    mapRef.current = map;

    const onResize = () => map.resize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className ?? "h-full w-full min-h-screen"}
      aria-label="Live runner map"
    />
  );
}
