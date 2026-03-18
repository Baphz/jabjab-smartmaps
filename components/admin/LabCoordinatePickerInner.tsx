"use client";

import { AimOutlined, EnvironmentOutlined } from "@ant-design/icons";
import { Button } from "antd";
import L from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  ZoomControl,
  useMap,
  useMapEvents,
} from "react-leaflet";
import MapAttributionBadge from "@/components/map/MapAttributionBadge";
import "leaflet/dist/leaflet.css";

type LabCoordinatePickerInnerProps = {
  latitude: number;
  longitude: number;
  onChange: (latitude: number, longitude: number) => void;
  title?: string;
  helperText?: string;
  resetLabel?: string;
  height?: number;
  showOverlay?: boolean;
  showCoordinateBadge?: boolean;
};

function isValidCoordinate(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function normalizeCoordinate(value: number) {
  return Number(value.toFixed(6));
}

function createPickerIcon() {
  return L.divIcon({
    className: "",
    html: `
      <div class="coordinate-picker-pin">
        <div class="coordinate-picker-pin-core"></div>
      </div>
    `,
    iconSize: [34, 44],
    iconAnchor: [17, 40],
  });
}

function CoordinateViewportController({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  const map = useMap();
  const hasInitializedRef = useRef(false);
  const previousKeyRef = useRef("");

  useEffect(() => {
    if (!isValidCoordinate(latitude, longitude)) {
      return;
    }

    const nextKey = `${latitude}:${longitude}`;
    const shouldZoomIn = !hasInitializedRef.current;
    const zoom = shouldZoomIn ? 13 : Math.max(map.getZoom(), 13);

    if (!hasInitializedRef.current || previousKeyRef.current !== nextKey) {
      map.flyTo([latitude, longitude], zoom, {
        animate: true,
        duration: 0.8,
      });
      previousKeyRef.current = nextKey;
      hasInitializedRef.current = true;
    }
  }, [latitude, longitude, map]);

  return null;
}

function CoordinatePickerEvents({
  onPick,
}: {
  onPick: (latitude: number, longitude: number) => void;
}) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

export default function LabCoordinatePickerInner({
  latitude,
  longitude,
  onChange,
  title = "Titik Lokasi",
  helperText = "Klik peta atau geser pin ke posisi yang tepat.",
  resetLabel = "Reset titik",
  height = 320,
  showOverlay = true,
  showCoordinateBadge = true,
}: LabCoordinatePickerInnerProps) {
  const [isMapReady, setIsMapReady] = useState(false);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const fallbackCenter = useMemo<[number, number]>(() => [-6.9, 107.6], []);
  const markerPosition = useMemo<[number, number]>(() => {
    if (isValidCoordinate(latitude, longitude)) {
      return [latitude, longitude];
    }

    return fallbackCenter;
  }, [fallbackCenter, latitude, longitude]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setIsMapReady(true);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const handleChange = (nextLatitude: number, nextLongitude: number) => {
    onChange(normalizeCoordinate(nextLatitude), normalizeCoordinate(nextLongitude));
  };

  return (
    <div className="relative overflow-hidden rounded-[20px] border border-sky-100 bg-sky-50/80 p-1.5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
      {showOverlay ? (
        <div className="pointer-events-none absolute left-3 top-3 z-500 flex max-w-[calc(100%-24px)] flex-wrap gap-2">
          <div className="pointer-events-auto rounded-2xl border border-slate-200 bg-white/92 px-3 py-2 text-[11px] text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {title}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <AimOutlined className="text-slate-400" />
              <span>{helperText}</span>
            </div>
          </div>

          <Button
            size="small"
            className="pointer-events-auto"
            onClick={() => handleChange(...fallbackCenter)}
          >
            {resetLabel}
          </Button>
        </div>
      ) : (
        <div className="pointer-events-none absolute left-3 top-3 z-500">
          <Button
            size="small"
            className="pointer-events-auto"
            onClick={() => handleChange(...fallbackCenter)}
          >
            {resetLabel}
          </Button>
        </div>
      )}

      {showCoordinateBadge ? (
        <div className="pointer-events-none absolute bottom-3 left-3 z-500">
          <div className="pointer-events-auto rounded-[14px] border border-slate-200 bg-white/90 px-3 py-2 text-[11px] text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="inline-flex items-center gap-2">
              <EnvironmentOutlined className="text-sky-600" />
              <span>
                {markerPosition[0].toFixed(6)}, {markerPosition[1].toFixed(6)}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none absolute bottom-3 right-3 z-500">
        <MapAttributionBadge />
      </div>

      <div
        className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white"
        style={{ height }}
      >
        {isMapReady ? (
          <MapContainer
            key="lab-coordinate-picker"
            ref={(map) => {
              mapInstanceRef.current = map ?? null;
            }}
            center={markerPosition}
            zoom={11}
            minZoom={5}
            maxZoom={18}
            attributionControl={false}
            scrollWheelZoom
            zoomControl={false}
            className="h-full w-full"
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            <ZoomControl position="topright" />
            <CoordinateViewportController latitude={markerPosition[0]} longitude={markerPosition[1]} />
            <CoordinatePickerEvents onPick={handleChange} />
            <Marker
              position={markerPosition}
              icon={createPickerIcon()}
              draggable
              eventHandlers={{
                dragend(event) {
                  const latlng = event.target.getLatLng();
                  handleChange(latlng.lat, latlng.lng);
                },
              }}
            />
          </MapContainer>
        ) : (
          <div className="h-full w-full bg-slate-50" />
        )}
      </div>
    </div>
  );
}
