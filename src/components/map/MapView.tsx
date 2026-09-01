"use client";

import { useEffect, useRef } from "react";
import {
  AttributionControl,
  Map,
  NavigationControl,
  setWorkerUrl,
  type Map as MaplibreMap,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getTheme, THEME_EVENT, type Theme } from "@/lib/theme";

function styleUrl(theme: Theme): string {
  const mapId = theme === "dark" ? "dataviz-dark" : "dataviz";
  return `${window.location.origin}/api/maptiler/maps/${mapId}/style.json`;
}

type MapViewProps = {
  className?: string;
  /** Inline styles win over maplibre-gl.css, which forces `position: relative` on the container. */
  style?: React.CSSProperties;
  onMapReady?: (map: MaplibreMap) => void;
};

export function MapView({ className, style, onMapReady }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const onMapReadyRef = useRef(onMapReady);
  onMapReadyRef.current = onMapReady;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    setWorkerUrl("/maplibre-gl-worker.mjs");

    const map = new Map({
      container: containerRef.current,
      style: styleUrl(getTheme()),
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
      onMapReadyRef.current?.(map);
    });

    map.on("error", (event) => {
      console.error("MapLibre error:", event.error);
    });

    mapRef.current = map;

    const onResize = () => map.resize();
    window.addEventListener("resize", onResize);

    // Consumers re-add their sources/layers on the map's "style.load" event.
    const onThemeChange = (event: Event) => {
      const theme = (event as CustomEvent<Theme>).detail;
      map.setStyle(styleUrl(theme));
    };
    window.addEventListener(THEME_EVENT, onThemeChange);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener(THEME_EVENT, onThemeChange);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: "absolute", inset: 0, ...style }}
      aria-label="Live runner map"
    />
  );
}
