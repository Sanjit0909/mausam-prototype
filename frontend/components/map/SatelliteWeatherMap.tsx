"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  Activity,
  CloudRain,
  Compass,
  Eye,
  Layers,
  Maximize,
  Minimize,
  Navigation,
  Pause,
  Play,
  RotateCcw,
  Search,
  SkipBack,
  SkipForward,
  Sun,
  Wind,
  Zap,
} from "lucide-react";
import { useLocation } from "@/context/LocationContext";
import type { LocationSearchResult } from "@/lib/types";

// Free, reliable tile providers
const ESRI_SATELLITE = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const CARTO_KEY = process.env.NEXT_PUBLIC_CARTO_BASEMAP_KEY?.trim() || "";
const CARTO_QUERY = CARTO_KEY ? `?key=${CARTO_KEY}` : "";
const CARTO_VOYAGER_LABELS = [
  `https://a.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}@2x.png${CARTO_QUERY}`,
  `https://b.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}@2x.png${CARTO_QUERY}`,
  `https://c.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}@2x.png${CARTO_QUERY}`,
  `https://d.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}@2x.png${CARTO_QUERY}`,
];
const DEM_TERRAIN = "https://demotiles.maplibre.org/terrain-tiles/{z}/{x}/{y}.png";

// Popular Indian cities for instant exploration
const QUICK_CITIES: LocationSearchResult[] = [
  { name: "New Delhi", country: "India", admin1: "Delhi", lat: 28.6139, lon: 77.209 },
  { name: "Mumbai", country: "India", admin1: "Maharashtra", lat: 19.076, lon: 72.8777 },
  { name: "Bengaluru", country: "India", admin1: "Karnataka", lat: 12.9716, lon: 77.5946 },
  { name: "Chennai", country: "India", admin1: "Tamil Nadu", lat: 13.0827, lon: 80.2707 },
  { name: "Kolkata", country: "India", admin1: "West Bengal", lat: 22.5726, lon: 88.3639 },
  { name: "Hyderabad", country: "India", admin1: "Telangana", lat: 17.385, lon: 78.4867 },
  { name: "Shimla", country: "India", admin1: "Himachal Pradesh", lat: 31.1048, lon: 77.1734 },
  { name: "Goa", country: "India", admin1: "Goa", lat: 15.2993, lon: 74.124 },
];

export type LayerType = "radar" | "satellite" | "wind" | "temp" | "aqi";
export type ViewMode = "2d" | "3d";

interface RadarFrame {
  time: number;
  path: string;
  isForecast?: boolean;
}

export function SatelliteWeatherMap({
  height = "650px",
  className = "",
}: {
  height?: string;
  className?: string;
}) {
  const { location, setLocation } = useLocation();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // States
  const [viewMode, setViewMode] = useState<ViewMode>("2d");
  const [activeLayer, setActiveLayer] = useState<LayerType>("radar");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Radar playback timeline states
  const [radarFrames, setRadarFrames] = useState<RadarFrame[]>([]);
  const [radarHost, setRadarHost] = useState<string>("https://tilecache.rainviewer.com");
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [satelliteFrames, setSatelliteFrames] = useState<RadarFrame[]>([]);
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch RainViewer radar & satellite metadata
  useEffect(() => {
    let isMounted = true;
    async function loadRainViewerData() {
      try {
        const res = await fetch("https://api.rainviewer.com/public/weather-maps.json");
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;

        if (data.host) {
          setRadarHost(data.host);
        }

        const past: RadarFrame[] = (data.radar?.past || []).map((f: any) => ({
          time: f.time,
          path: f.path,
          isForecast: false,
        }));
        const nowcast: RadarFrame[] = (data.radar?.nowcast || []).map((f: any) => ({
          time: f.time,
          path: f.path,
          isForecast: true,
        }));

        const combined = [...past, ...nowcast];
        setRadarFrames(combined);

        if (past.length > 0) {
          // Default to the latest live frame (end of past frames)
          setCurrentFrameIndex(past.length - 1);
        }

        if (data.satellite?.infrared) {
          setSatelliteFrames(
            data.satellite.infrared.map((f: any) => ({
              time: f.time,
              path: f.path,
              isForecast: false,
            }))
          );
        }
      } catch (e) {
        console.error("RainViewer load error:", e);
      }
    }
    loadRainViewerData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize MapLibre
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      minZoom: 2,
      maxZoom: 18,
      style: {
        version: 8,
        sources: {
          "esri-satellite": {
            type: "raster",
            tiles: [ESRI_SATELLITE],
            tileSize: 256,
            maxzoom: 18,
            attribution: "© Esri, Maxar, Earthstar Geographics",
          },
          "carto-labels": {
            type: "raster",
            tiles: CARTO_VOYAGER_LABELS,
            tileSize: 256,
            maxzoom: 20,
            attribution: "© CARTO, © OpenStreetMap",
          },
          "dem-terrain": {
            type: "raster-dem",
            tiles: [DEM_TERRAIN],
            tileSize: 256,
            maxzoom: 12,
            encoding: "mapbox",
          },
        },
        layers: [
          {
            id: "satellite-layer",
            type: "raster",
            source: "esri-satellite",
            paint: { "raster-opacity": 1 },
          },
          {
            id: "labels-layer",
            type: "raster",
            source: "carto-labels",
            paint: { "raster-opacity": 0.95 },
          },
        ],
      },
      center: [location.lon, location.lat],
      zoom: 6,
      pitch: 0,
      bearing: 0,
    });

    map.on("load", () => {
      setMapLoaded(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync user location marker with pulsating beacon
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (markerRef.current) {
      markerRef.current.remove();
    }

    // Create custom pulsating beacon element
    const el = document.createElement("div");
    el.className = "relative flex items-center justify-center pointer-events-none";
    el.innerHTML = `
      <div class="absolute -inset-3 rounded-full bg-sky-400/30 animate-ping"></div>
      <div class="absolute -inset-1.5 rounded-full bg-sky-500/50 animate-pulse"></div>
      <div class="relative flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-sky-500 shadow-lg shadow-sky-500/50">
        <div class="h-2 w-2 rounded-full bg-white"></div>
      </div>
      <div class="absolute top-6 whitespace-nowrap rounded-md bg-navy-950/90 border border-sky-400/40 px-2 py-0.5 text-[10px] font-semibold text-sky-200 shadow-md">
        ${location.name}
      </div>
    `;

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([location.lon, location.lat])
      .addTo(map);

    markerRef.current = marker;
  }, [location.lat, location.lon, location.name]);

  // Handle 2D vs 3D View Toggle
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (viewMode === "3d") {
      // 3D Globe / Terrain elevation mode
      map.easeTo({
        pitch: 62,
        bearing: -15,
        duration: 1200,
      });
      try {
        map.setTerrain({ source: "dem-terrain", exaggeration: 1.8 });
      } catch {
        // terrain gracefully handled
      }
    } else {
      // 2D Flat Map mode
      map.easeTo({
        pitch: 0,
        bearing: 0,
        duration: 900,
      });
      try {
        map.setTerrain(null);
      } catch {
        // ignore
      }
    }
  }, [viewMode, mapLoaded]);

  // Update Weather Overlays (Radar, Infrared Satellite, Heatmap)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Helper to remove any existing dynamic weather raster layer
    const removeDynamicLayers = () => {
      if (map.getLayer("weather-overlay-layer")) {
        map.removeLayer("weather-overlay-layer");
      }
      if (map.getSource("weather-overlay-source")) {
        map.removeSource("weather-overlay-source");
      }
    };

    removeDynamicLayers();

    if (activeLayer === "radar" && radarFrames.length > 0) {
      const frame = radarFrames[currentFrameIndex];
      if (frame) {
        const tileUrl = `${radarHost}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`;
        map.addSource("weather-overlay-source", {
          type: "raster",
          tiles: [tileUrl],
          tileSize: 256,
          maxzoom: 12,
        });
        map.addLayer(
          {
            id: "weather-overlay-layer",
            type: "raster",
            source: "weather-overlay-source",
            paint: {
              "raster-opacity": 0.8,
              "raster-fade-duration": 150,
            },
          },
          "labels-layer" // place below labels so place names remain visible!
        );
      }
    } else if (activeLayer === "satellite" && satelliteFrames.length > 0) {
      const latestSat = satelliteFrames[satelliteFrames.length - 1];
      if (latestSat) {
        const tileUrl = `${radarHost}${latestSat.path}/256/{z}/{x}/{y}/0/0_0.png`;
        map.addSource("weather-overlay-source", {
          type: "raster",
          tiles: [tileUrl],
          tileSize: 256,
          maxzoom: 12,
        });
        map.addLayer(
          {
            id: "weather-overlay-layer",
            type: "raster",
            source: "weather-overlay-source",
            paint: {
              "raster-opacity": 0.75,
              "raster-fade-duration": 150,
            },
          },
          "labels-layer"
        );
      }
    }
  }, [activeLayer, currentFrameIndex, radarFrames, satelliteFrames, radarHost, mapLoaded]);

  // Doppler Radar Auto-Playback Loop
  useEffect(() => {
    if (isPlaying && radarFrames.length > 0) {
      playTimerRef.current = setInterval(() => {
        setCurrentFrameIndex((prev) => (prev + 1) % radarFrames.length);
      }, 700);
    } else if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
      playTimerRef.current = null;
    }
    return () => {
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
      }
    };
  }, [isPlaying, radarFrames.length]);

  // Wind Particle Flow Vector Animation on Canvas
  useEffect(() => {
    if (activeLayer !== "wind") {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 600);
    ctx.clearRect(0, 0, width, height);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        width = canvas.width = entry.contentRect.width;
        height = canvas.height = entry.contentRect.height;
        ctx.clearRect(0, 0, width, height);
      }
    });
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    // Generate rich streamline wind particles
    const particleCount = 500;
    const particles: Array<{
      x: number;
      y: number;
      speed: number;
      length: number;
      angle: number;
      alpha: number;
      color: string;
      lineWidth: number;
    }> = [];

    const palettes = [
      "rgba(45, 212, 191, ",  // Teal 400
      "rgba(56, 189, 248, ",  // Sky 400
      "rgba(125, 211, 252, ", // Sky 300
      "rgba(255, 255, 255, ", // Bright white glint
    ];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        speed: 1.2 + Math.random() * 2.4,
        length: 10 + Math.random() * 18,
        angle: 0.35 + (Math.random() - 0.5) * 0.25, // Indian monsoon southwest to northeast streamline flow
        alpha: 0.35 + Math.random() * 0.55,
        color: palettes[Math.floor(Math.random() * palettes.length)],
        lineWidth: 1.2 + Math.random() * 1.2,
      });
    }

    let running = true;
    const render = () => {
      if (!running) return;

      // Soft fade trail using destination-out to preserve 100% transparent canvas so the satellite map underneath stays vivid
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "source-over";

      for (const p of particles) {
        const dx = Math.cos(p.angle) * p.speed;
        const dy = Math.sin(p.angle) * p.speed;

        ctx.strokeStyle = `${p.color}${p.alpha})`;
        ctx.lineWidth = p.lineWidth;
        ctx.lineCap = "round";

        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + dx * p.length, p.y + dy * p.length);
        ctx.stroke();

        p.x += dx * 2;
        p.y += dy * 2;

        if (p.x > width || p.x < 0 || p.y > height || p.y < 0) {
          p.x = Math.random() * width;
          p.y = Math.random() * height;
        }
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      running = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      ctx.clearRect(0, 0, width, height);
      resizeObserver.disconnect();
    };
  }, [activeLayer]);

  // Recenter to user's location
  const handleRecenter = () => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({
      center: [location.lon, location.lat],
      zoom: 7,
      essential: true,
      duration: 1200,
    });
  };

  // Reset Bearing to North
  const handleResetNorth = () => {
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({
      bearing: 0,
      pitch: viewMode === "3d" ? 60 : 0,
      duration: 600,
    });
  };

  // Select quick city
  const handleCitySelect = (c: LocationSearchResult) => {
    setLocation(c);
    const map = mapRef.current;
    if (map) {
      map.flyTo({
        center: [c.lon, c.lat],
        zoom: 7,
        essential: true,
        duration: 1400,
      });
    }
  };

  // Format frame timestamp label
  const currentFrame = radarFrames[currentFrameIndex];
  const frameTimeLabel = currentFrame
    ? new Date(currentFrame.time * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div
      className={`relative w-full rounded-3xl border border-white/10 bg-navy-950 overflow-hidden shadow-2xl transition-all duration-300 ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none h-screen w-screen" : className
      }`}
      style={{ height: isFullscreen ? "100vh" : height }}
    >
      {/* MAP CANVAS CONTAINER */}
      <div ref={mapContainerRef} className="absolute inset-0 h-full w-full" />

      {/* 3D ATMOSPHERIC HAZE GRADIENT OVERLAY (Active in 3D mode) */}
      {viewMode === "3d" && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-sky-500/15 via-transparent to-navy-950/40" />
      )}

      {/* WIND VECTOR PARTICLES CANVAS */}
      <canvas
        ref={canvasRef}
        className={`pointer-events-none absolute inset-0 h-full w-full z-10 transition-opacity duration-300 ${
          activeLayer === "wind" ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* TEMPERATURE HEATMAP OVERLAY */}
      {activeLayer === "temp" && (
        <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-rose-500/25 via-amber-500/15 to-sky-400/20 mix-blend-overlay animate-in fade-in duration-300" />
      )}

      {/* TOP FLOATING HEADER CONTROLS */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* VIEW TOGGLE PILL: [ 2D Map | 3D Globe ] */}
        <div className="pointer-events-auto flex items-center rounded-2xl border border-white/15 bg-navy-950/85 p-1 backdrop-blur-xl shadow-xl">
          <button
            onClick={() => setViewMode("2d")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
              viewMode === "2d"
                ? "bg-sky-500 text-navy-950 shadow-md shadow-sky-500/30"
                : "text-mist-300 hover:text-mist-100 hover:bg-white/5"
            }`}
          >
            2D Map
          </button>
          <button
            onClick={() => setViewMode("3d")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
              viewMode === "3d"
                ? "bg-sky-500 text-navy-950 shadow-md shadow-sky-500/30"
                : "text-mist-300 hover:text-mist-100 hover:bg-white/5"
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            3D Globe / Terrain
          </button>
        </div>

        {/* LAYER SELECTOR PILLS */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-1 rounded-2xl border border-white/15 bg-navy-950/85 p-1 backdrop-blur-xl shadow-xl">
          <button
            onClick={() => setActiveLayer("radar")}
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-all ${
              activeLayer === "radar"
                ? "bg-sky-500/20 text-sky-300 border border-sky-400/40"
                : "text-mist-300 hover:bg-white/5"
            }`}
          >
            <CloudRain className="h-3.5 w-3.5 text-sky-400" />
            <span>Radar</span>
          </button>
          <button
            onClick={() => setActiveLayer("satellite")}
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-all ${
              activeLayer === "satellite"
                ? "bg-sky-500/20 text-sky-300 border border-sky-400/40"
                : "text-mist-300 hover:bg-white/5"
            }`}
          >
            <Eye className="h-3.5 w-3.5 text-indigo-400" />
            <span>Infrared Clouds</span>
          </button>
          <button
            onClick={() => setActiveLayer("wind")}
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-all ${
              activeLayer === "wind"
                ? "bg-sky-500/20 text-sky-300 border border-sky-400/40"
                : "text-mist-300 hover:bg-white/5"
            }`}
          >
            <Wind className="h-3.5 w-3.5 text-teal-400" />
            <span>Wind Vectors</span>
          </button>
          <button
            onClick={() => setActiveLayer("temp")}
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-all ${
              activeLayer === "temp"
                ? "bg-sky-500/20 text-sky-300 border border-sky-400/40"
                : "text-mist-300 hover:bg-white/5"
            }`}
          >
            <Sun className="h-3.5 w-3.5 text-amber-400" />
            <span>Heatmap</span>
          </button>
          <button
            onClick={() => setActiveLayer("aqi")}
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-all ${
              activeLayer === "aqi"
                ? "bg-sky-500/20 text-sky-300 border border-sky-400/40"
                : "text-mist-300 hover:bg-white/5"
            }`}
          >
            <Activity className="h-3.5 w-3.5 text-emerald-400" />
            <span>AQI</span>
          </button>
        </div>

        {/* RIGHT TOOLBAR: Center, North, Fullscreen */}
        <div className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-white/15 bg-navy-950/85 p-1 backdrop-blur-xl shadow-xl">
          <button
            onClick={handleRecenter}
            title="Center on My Location"
            className="flex h-8 w-8 items-center justify-center rounded-xl text-mist-300 hover:bg-white/10 hover:text-mist-100 transition-colors"
          >
            <Navigation className="h-4 w-4 text-sky-400" />
          </button>
          <button
            onClick={handleResetNorth}
            title="Reset North / Bearing"
            className="flex h-8 w-8 items-center justify-center rounded-xl text-mist-300 hover:bg-white/10 hover:text-mist-100 transition-colors"
          >
            <Compass className="h-4 w-4 text-mist-300" />
          </button>
          <button
            onClick={() => setIsFullscreen((prev) => !prev)}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-mist-300 hover:bg-white/10 hover:text-mist-100 transition-colors"
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* QUICK CITY JUMP CHIPS (Top left underneath toolbar) */}
      <div className="absolute top-18 left-4 z-20 hidden md:flex items-center gap-1.5 overflow-x-auto max-w-[80%] pointer-events-auto py-1">
        {QUICK_CITIES.map((city) => (
          <button
            key={city.name}
            onClick={() => handleCitySelect(city)}
            className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium backdrop-blur-md transition-all ${
              location.name === city.name
                ? "border-sky-400/60 bg-sky-500/25 text-sky-200"
                : "border-white/10 bg-navy-950/70 text-mist-300 hover:bg-navy-900/90 hover:text-mist-100"
            }`}
          >
            {city.name}
          </button>
        ))}
      </div>

      {/* DOPPLER RADAR PLAYBACK TIMELINE SCRUBBER (Bottom container) */}
      {activeLayer === "radar" && radarFrames.length > 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-[92%] max-w-xl rounded-2xl border border-white/15 bg-navy-950/90 p-3.5 backdrop-blur-2xl shadow-2xl">
          <div className="flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying((p) => !p)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500 text-navy-950 font-bold transition-transform hover:scale-105 active:scale-95"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
              </button>

              <button
                onClick={() =>
                  setCurrentFrameIndex((prev) => (prev > 0 ? prev - 1 : radarFrames.length - 1))
                }
                title="Step backward"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-mist-300 hover:bg-white/10 hover:text-mist-100"
              >
                <SkipBack className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={() =>
                  setCurrentFrameIndex((prev) => (prev + 1) % radarFrames.length)
                }
                title="Step forward"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-mist-300 hover:bg-white/10 hover:text-mist-100"
              >
                <SkipForward className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Current Frame Status Badge */}
            <div className="flex items-center gap-2">
              <span
                className={`rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                  currentFrame?.isForecast
                    ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                }`}
              >
                {currentFrame?.isForecast ? "Forecast" : "Live Radar"}
              </span>
              <span className="font-mono text-xs font-semibold text-mist-100">
                {frameTimeLabel}
              </span>
            </div>
          </div>

          {/* Interactive Timeline Scrubber Slider */}
          <div className="mt-2.5 flex items-center gap-3">
            <span className="text-[10px] font-medium text-mist-400 whitespace-nowrap">-2 hrs</span>
            <input
              type="range"
              min={0}
              max={radarFrames.length - 1}
              value={currentFrameIndex}
              onChange={(e) => {
                setIsPlaying(false);
                setCurrentFrameIndex(parseInt(e.target.value, 10));
              }}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-sky-400 focus:outline-none"
            />
            <span className="text-[10px] font-medium text-indigo-300 whitespace-nowrap">+1 hr</span>
          </div>

          {/* Color Scale Legend */}
          <div className="mt-2 flex items-center justify-between text-[10px] text-mist-400 border-t border-white/5 pt-1.5">
            <span>Light Rain</span>
            <div className="flex h-2 w-36 rounded-full bg-gradient-to-r from-sky-400 via-emerald-400 via-amber-400 to-rose-600 shadow-inner" />
            <span>Heavy Storm</span>
          </div>
        </div>
      )}

      {/* WIND VECTORS HUD / LEGEND */}
      {activeLayer === "wind" && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center gap-3 rounded-2xl border border-white/15 bg-navy-950/90 px-4 py-2.5 backdrop-blur-2xl shadow-xl text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-teal-300">
            <Wind className="h-4 w-4 animate-spin [animation-duration:8s]" />
            <span>Live Streamlines ({location.name})</span>
          </div>
          <div className="h-3.5 w-px bg-white/15 hidden sm:block" />
          <div className="flex items-center gap-3 text-[11px] text-mist-300">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-teal-400 shadow-[0_0_8px_#2dd4bf]" /> Light (&lt;15 km/h)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]" /> Moderate (15–35 km/h)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-indigo-400 shadow-[0_0_8px_#818cf8]" /> Gale (35+ km/h)
            </span>
          </div>
        </div>
      )}

      {/* SATELLITE INFRARED CLOUD HUD */}
      {activeLayer === "satellite" && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 rounded-2xl border border-white/15 bg-navy-950/90 px-4 py-2.5 backdrop-blur-2xl shadow-xl text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-indigo-300">
            <Eye className="h-4 w-4" />
            <span>Infrared Cloud Top</span>
          </div>
          <div className="h-3.5 w-px bg-white/15 hidden sm:block" />
          <div className="flex items-center gap-2 text-[11px] text-mist-300">
            <span>Low Cloud</span>
            <div className="flex h-2 w-24 rounded-full bg-gradient-to-r from-white/20 via-white/60 to-white shadow-inner" />
            <span>Deep Storm</span>
          </div>
        </div>
      )}

      {/* TEMPERATURE HEATMAP LEGEND */}
      {activeLayer === "temp" && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 rounded-2xl border border-white/15 bg-navy-950/90 px-4 py-2.5 backdrop-blur-2xl shadow-xl text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-amber-300">
            <Sun className="h-4 w-4" />
            <span>Thermal Heatmap</span>
          </div>
          <div className="h-3.5 w-px bg-white/15 hidden sm:block" />
          <div className="flex items-center gap-2 text-[11px] text-mist-300">
            <span className="text-sky-300">10°C</span>
            <div className="flex h-2 w-28 rounded-full bg-gradient-to-r from-sky-400 via-amber-400 to-rose-600 shadow-inner" />
            <span className="text-rose-400">45°C</span>
          </div>
        </div>
      )}

      {/* AQI LEGEND (when AQI layer is active) */}
      {activeLayer === "aqi" && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 rounded-2xl border border-white/15 bg-navy-950/90 px-4 py-2.5 backdrop-blur-2xl shadow-xl text-xs">
          <span className="font-semibold text-mist-200">AQI Index:</span>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-emerald-400" />
            <span className="text-[11px] text-mist-300">0-50 Good</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-amber-400" />
            <span className="text-[11px] text-mist-300">51-100 Mod</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-orange-500" />
            <span className="text-[11px] text-mist-300">101-200 Poor</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-rose-500" />
            <span className="text-[11px] text-mist-300">201+ Severe</span>
          </div>
        </div>
      )}
    </div>
  );
}
