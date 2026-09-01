"use client";

import { useEffect, useRef } from "react";
import {
  AttributionControl,
  Map,
  NavigationControl,
  setWorkerUrl,
  type Map as MaplibreMap,
  type RequestTransformFunction,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

type MapViewProps = {
  className?: string;
};

const maptilerProxyTransform: RequestTransformFunction = (url) => {
  if (!url.includes("api.maptiler.com")) return { url };

  const parsed = new URL(url);
  parsed.searchParams.delete("key");
  const qs = parsed.searchParams.toString();

  return {
    url: `/api/maptiler${parsed.pathname}${qs ? `?${qs}` : ""}`,
  };
};

export function MapView({ className }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MaplibreMap | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    setWorkerUrl("/maplibre-gl-worker.mjs");

    const map = new Map({
      container: containerRef.current,
      style: "/api/maptiler/maps/dataviz-dark/style.json",
      center: [151.2093, -33.8688],
      zoom: 2,
      attributionControl: false,
      transformRequest: maptilerProxyTransform,
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
