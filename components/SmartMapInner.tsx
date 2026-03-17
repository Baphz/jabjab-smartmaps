"use client";

import {
  EnvironmentOutlined,
  GlobalOutlined,
  PhoneOutlined,
} from "@ant-design/icons";
import { Button, Card, Descriptions, Drawer, Empty, Grid, Space, Typography } from "antd";
import Image from "next/image";
import L from "leaflet";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  ZoomControl,
  useMap,
} from "react-leaflet";
import MapAttributionBadge from "@/components/map/MapAttributionBadge";
import { resolveStoredPhotoUrl } from "@/lib/drive-file";
import type { ActivitySourceItem } from "@/lib/activity-calendar";
import type { LabCityTypeValue, LabVillageTypeValue } from "@/lib/lab-address";
import "leaflet/dist/leaflet.css";

const { Paragraph: TypographyParagraph, Text: TypographyText, Title: TypographyTitle } =
  Typography;

export type LabTypeDTO = {
  id: string;
  name: string;
};

export type LabWithTypes = {
  id: string;
  name: string;
  address: string;
  addressDetail?: string | null;
  provinceName?: string | null;
  cityName?: string | null;
  cityType?: LabCityTypeValue | null;
  districtName?: string | null;
  villageName?: string | null;
  villageType?: LabVillageTypeValue | null;
  latitude: number;
  longitude: number;
  labPhotoUrl: string;
  head1Name: string | null;
  head1PhotoUrl: string | null;
  head2Name: string | null;
  head2PhotoUrl: string | null;
  types: LabTypeDTO[];
  phone: string | null;
  websiteUrl: string | null;
};

export type SmartMapInnerProps = {
  labs: LabWithTypes[];
  highlightedLabIds?: string[];
  activeLabIds?: string[];
  focusedLabIds?: string[];
  mutedLabIds?: string[];
  focusedActivity?: ActivitySourceItem | null;
  selectedLabId?: string | null;
  onSelectLab?: (labId: string | null) => void;
};

function hasValidEventCoordinates(item: ActivitySourceItem | null | undefined) {
  return Boolean(
    item &&
      typeof item.eventLatitude === "number" &&
      Number.isFinite(item.eventLatitude) &&
      typeof item.eventLongitude === "number" &&
      Number.isFinite(item.eventLongitude)
  );
}

function MapViewportController({
  selectedLab,
  focusedActivity,
  labsBounds,
  focusedLabsBounds,
  focusKey,
}: {
  selectedLab: LabWithTypes | null;
  focusedActivity: ActivitySourceItem | null;
  labsBounds: L.LatLngBounds | null;
  focusedLabsBounds: L.LatLngBounds | null;
  focusKey: string;
}) {
  const map = useMap();
  const hasInitializedRef = useRef(false);
  const previousSelectedLabIdRef = useRef<string | null>(null);
  const previousActivityFocusKeyRef = useRef("");
  const previousFocusKeyRef = useRef("");

  useEffect(() => {
    const activityFocusKey =
      focusedActivity && hasValidEventCoordinates(focusedActivity)
        ? `${focusedActivity.id}:${focusedActivity.eventLatitude}:${focusedActivity.eventLongitude}`
        : "";

    if (activityFocusKey && focusedActivity && hasValidEventCoordinates(focusedActivity)) {
      if (
        !hasInitializedRef.current ||
        previousActivityFocusKeyRef.current !== activityFocusKey
      ) {
        map.flyTo([focusedActivity.eventLatitude!, focusedActivity.eventLongitude!], 13, {
          animate: true,
          duration: 0.9,
        });
        previousSelectedLabIdRef.current = selectedLab?.id ?? null;
        previousActivityFocusKeyRef.current = activityFocusKey;
        previousFocusKeyRef.current = focusKey;
        hasInitializedRef.current = true;
      }
      return;
    }

    if (selectedLab) {
      map.flyTo([selectedLab.latitude, selectedLab.longitude], 11, {
        animate: true,
        duration: 0.9,
      });
      previousSelectedLabIdRef.current = selectedLab.id;
      previousActivityFocusKeyRef.current = "";
      previousFocusKeyRef.current = focusKey;
      hasInitializedRef.current = true;
      return;
    }

    if (focusKey && focusedLabsBounds) {
      if (
        !hasInitializedRef.current ||
        previousSelectedLabIdRef.current ||
        previousFocusKeyRef.current !== focusKey
      ) {
        map.fitBounds(focusedLabsBounds, {
          padding: [52, 52],
          maxZoom: 10,
          animate: true,
        });
        previousSelectedLabIdRef.current = null;
        previousActivityFocusKeyRef.current = "";
        previousFocusKeyRef.current = focusKey;
        hasInitializedRef.current = true;
      }

      return;
    }

    if (!labsBounds) {
      return;
    }

    if (
      !hasInitializedRef.current ||
      previousSelectedLabIdRef.current ||
      previousFocusKeyRef.current
    ) {
      map.fitBounds(labsBounds, {
        padding: [44, 44],
        maxZoom: 8,
        animate: true,
      });
      previousSelectedLabIdRef.current = null;
      previousActivityFocusKeyRef.current = "";
      previousFocusKeyRef.current = "";
      hasInitializedRef.current = true;
    }
  }, [focusKey, focusedActivity, focusedLabsBounds, labsBounds, map, selectedLab]);

  return null;
}

function resolvePhotoUrl(value: string | null): string {
  return resolveStoredPhotoUrl(value);
}

function normalizeWebsiteUrl(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function createLabIcon(
  photoValue: string,
  selected: boolean,
  highlighted: boolean,
  active: boolean,
  muted: boolean
) {
  const photoUrl = resolvePhotoUrl(photoValue);
  const style = photoUrl ? `background-image:url('${photoUrl}')` : "";
  const classes = [
    "lab-pin",
    selected ? "lab-pin-selected" : "",
    active ? "lab-pin-active" : "",
    highlighted ? "lab-pin-search" : "",
    muted ? "lab-pin-muted" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return L.divIcon({
    className: "",
    html: `
      <div class="${classes}">
        <div class="lab-pin-photo" style="${style}"></div>
      </div>
    `,
    iconSize: [42, 54],
    iconAnchor: [21, 50],
    popupAnchor: [0, -42],
  });
}

function createActivityFocusIcon(label?: string | null) {
  const safeLabel = String(label ?? "Lokasi Agenda")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return L.divIcon({
    className: "",
    html: `
      <div class="activity-focus-marker">
        <div class="activity-focus-bubble">${safeLabel}</div>
        <div class="activity-focus-pin">
          <div class="activity-focus-pin-core"></div>
        </div>
      </div>
    `,
    iconSize: [148, 82],
    iconAnchor: [74, 68],
  });
}

function getLabTypePillClass(name: string) {
  const normalized = name.toUpperCase();

  if (normalized === "RS") return "border-sky-200 bg-sky-50 text-sky-700";
  if (normalized === "LABKESMAS") return "border-stone-200 bg-stone-100 text-stone-700";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function PhotoFrame({
  src,
  alt,
  width,
  height,
  rounded = 18,
}: {
  src: string;
  alt: string;
  width: number | string;
  height: number | string;
  rounded?: number;
}) {
  if (!src) {
    return (
      <div
        style={{
          width,
          height,
          borderRadius: rounded,
          border: "1px dashed #cbd5e1",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
        }}
      >
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={false} />
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        overflow: "hidden",
        borderRadius: rounded,
        border: "1px solid rgba(15, 23, 42, 0.08)",
        background: "#fff",
      }}
    >
      <Image src={src} alt={alt} fill unoptimized className="object-cover" />
    </div>
  );
}

function DetailSection({
  eyebrow,
  children,
}: {
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <Card
      size="small"
      variant="borderless"
      style={{
        border: "1px solid rgba(191, 219, 254, 0.9)",
        background: "rgba(248, 251, 255, 0.96)",
      }}
    >
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {eyebrow}
      </div>
      {children}
    </Card>
  );
}

export default function SmartMapInner({
  labs,
  highlightedLabIds = [],
  activeLabIds = [],
  focusedLabIds = [],
  mutedLabIds = [],
  focusedActivity = null,
  selectedLabId,
  onSelectLab,
}: SmartMapInnerProps) {
  const [isMapReady, setIsMapReady] = useState(false);
  const [internalSelectedLabId, setInternalSelectedLabId] = useState<string | null>(
    null
  );
  const mapInstanceRef = useRef<L.Map | null>(null);
  const screens = Grid.useBreakpoint();
  const isControlled = selectedLabId !== undefined;
  const activeSelectedLabId = isControlled
    ? selectedLabId ?? null
    : internalSelectedLabId;

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

  const labsBounds = useMemo(() => {
    if (labs.length === 0) return null;

    return L.latLngBounds(
      labs.map((lab) => [lab.latitude, lab.longitude] as [number, number])
    );
  }, [labs]);

  const selectedLab = useMemo(
    () => labs.find((lab) => lab.id === activeSelectedLabId) ?? null,
    [activeSelectedLabId, labs]
  );
  const focusedLabsBounds = useMemo(() => {
    if (focusedLabIds.length === 0) return null;

    const focusedLabs = labs.filter((lab) => focusedLabIds.includes(lab.id));
    if (focusedLabs.length === 0) return null;

    return L.latLngBounds(
      focusedLabs.map((lab) => [lab.latitude, lab.longitude] as [number, number])
    );
  }, [focusedLabIds, labs]);
  const focusKey = useMemo(() => focusedLabIds.join("|"), [focusedLabIds]);
  const highlightedLabIdSet = useMemo(
    () => new Set(highlightedLabIds),
    [highlightedLabIds]
  );
  const activeLabIdSet = useMemo(() => new Set(activeLabIds), [activeLabIds]);
  const mutedLabIdSet = useMemo(() => new Set(mutedLabIds), [mutedLabIds]);
  const hasFocusedActivityCoordinates = hasValidEventCoordinates(focusedActivity);

  function handleSelectLab(nextLabId: string | null) {
    if (!isControlled) {
      setInternalSelectedLabId(nextLabId);
    }

    onSelectLab?.(nextLabId);
  }

  const detailContent = selectedLab ? (
    <div className="flex flex-col gap-3">
      <div className="rounded-[24px] border border-sky-100 bg-sky-50/75 p-4">
        <div className="flex flex-col gap-4 sm:flex-row">
          <PhotoFrame
            src={resolvePhotoUrl(selectedLab.labPhotoUrl)}
            alt={selectedLab.name}
            width={112}
            height={112}
            rounded={20}
          />

          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Profil Laboratorium
            </div>
            <TypographyTitle level={4} style={{ marginTop: 4, marginBottom: 4 }}>
              {selectedLab.name}
            </TypographyTitle>
            <TypographyParagraph
              ellipsis={{ rows: 3 }}
              style={{ marginBottom: 10, color: "#64748b" }}
            >
              {selectedLab.address}
            </TypographyParagraph>
            <div className="flex flex-wrap gap-2">
              {selectedLab.types.map((type) => (
                <span
                  key={type.id}
                  className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${getLabTypePillClass(type.name)}`}
                >
                  {type.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <DetailSection eyebrow="Kontak & Lokasi">
        <Descriptions
          size="small"
          column={1}
          items={[
            {
              key: "phone",
              label: (
                <Space size={4}>
                  <PhoneOutlined />
                  <span>Telepon</span>
                </Space>
              ),
              children: selectedLab.phone ? (
                <a href={`tel:${selectedLab.phone.replace(/\s+/g, "")}`}>
                  {selectedLab.phone}
                </a>
              ) : (
                "-"
              ),
            },
            {
              key: "website",
              label: (
                <Space size={4}>
                  <GlobalOutlined />
                  <span>Website</span>
                </Space>
              ),
              children: selectedLab.websiteUrl ? (
                <a
                  href={normalizeWebsiteUrl(selectedLab.websiteUrl) ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                >
                  {selectedLab.websiteUrl}
                </a>
              ) : (
                "-"
              ),
            },
            {
              key: "coordinate",
              label: (
                <Space size={4}>
                  <EnvironmentOutlined />
                  <span>Koordinat</span>
                </Space>
              ),
              children: `${selectedLab.latitude}, ${selectedLab.longitude}`,
            },
          ]}
        />
      </DetailSection>

      <DetailSection eyebrow="Foto Laboratorium">
        <PhotoFrame
          src={resolvePhotoUrl(selectedLab.labPhotoUrl)}
          alt={selectedLab.name}
          width="100%"
          height={220}
          rounded={18}
        />
      </DetailSection>

      <DetailSection eyebrow="Struktur Utama">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-[18px] border border-slate-200 bg-slate-50/80 p-4">
            <Space orientation="vertical" align="center" size={10} style={{ width: "100%" }}>
              <PhotoFrame
                src={resolvePhotoUrl(selectedLab.head1PhotoUrl)}
                alt={selectedLab.head1Name ?? "Kepala Laboratorium"}
                width={104}
                height={104}
                rounded={999}
              />
              <TypographyText strong>{selectedLab.head1Name ?? "Belum diisi"}</TypographyText>
              <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-700">
                Kepala Laboratorium
              </span>
            </Space>
          </div>

          <div className="rounded-[18px] border border-slate-200 bg-slate-50/80 p-4">
            <Space orientation="vertical" align="center" size={10} style={{ width: "100%" }}>
              <PhotoFrame
                src={resolvePhotoUrl(selectedLab.head2PhotoUrl)}
                alt={selectedLab.head2Name ?? "Kepala Sub Bagian TU"}
                width={104}
                height={104}
                rounded={999}
              />
              <TypographyText strong>{selectedLab.head2Name ?? "Belum diisi"}</TypographyText>
              <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
                Kepala Sub Bagian TU
              </span>
            </Space>
          </div>
        </div>
      </DetailSection>
    </div>
  ) : null;

  return (
    <div className="h-full">
      <div className="relative min-h-0 h-full overflow-hidden rounded-[22px]">
        <div className="pointer-events-none absolute left-3 top-3 z-[500] flex max-w-[calc(100%-24px)] flex-wrap gap-2">
          <div className="pointer-events-auto rounded-[18px] border border-slate-200 bg-white/92 px-3.5 py-2.5 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Sebaran Aktif
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-semibold tracking-tight text-slate-950">
                {labs.length}
              </span>
              <span className="text-xs text-slate-600">titik laboratorium</span>
            </div>
          </div>

          {selectedLab || hasFocusedActivityCoordinates ? (
            <Button
              size="small"
              className="pointer-events-auto"
              onClick={() => handleSelectLab(null)}
            >
              Reset peta
            </Button>
          ) : null}
        </div>

        <div className="pointer-events-none absolute bottom-3 left-3 z-[500]">
          <div className="rounded-[16px] border border-slate-200 bg-white/90 px-3 py-2 text-xs text-slate-600 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur">
            <span className="inline-flex items-center gap-3">
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
                Lokasi laboratorium
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="map-legend-pulse map-legend-pulse-active" />
                Agenda aktif
              </span>
              {highlightedLabIds.length > 0 ? (
                <span className="inline-flex items-center gap-2">
                  <span className="map-legend-pulse map-legend-pulse-search" />
                  Hasil pencarian
                </span>
              ) : null}
              {hasFocusedActivityCoordinates ? (
                <span className="inline-flex items-center gap-2">
                  <span className="map-legend-pulse map-legend-pulse-event" />
                  Lokasi agenda
                </span>
              ) : null}
            </span>
          </div>
        </div>

        {hasFocusedActivityCoordinates && focusedActivity ? (
          <div className="pointer-events-none absolute left-3 top-[92px] z-[500] max-w-[320px]">
            <div className="pointer-events-auto rounded-[16px] border border-emerald-200 bg-white/94 px-3.5 py-2.5 text-[12px] text-slate-600 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                Agenda Dipilih
              </div>
              <div className="mt-1 font-semibold text-slate-900">{focusedActivity.title}</div>
              {focusedActivity.locationName ? (
                <div className="mt-1 text-[11.5px] text-slate-500">
                  {focusedActivity.locationName}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="pointer-events-none absolute bottom-3 right-3 z-[500]">
          <MapAttributionBadge />
        </div>

        {isMapReady ? (
          <MapContainer
            key="smart-map-canvas"
            ref={(map) => {
              mapInstanceRef.current = map ?? null;
            }}
            center={[-6.9, 107.45]}
            zoom={8}
            minZoom={6}
            maxZoom={18}
            attributionControl={false}
            scrollWheelZoom={false}
            zoomControl={false}
            className="h-full w-full"
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            <ZoomControl position="topright" />
            <MapViewportController
              selectedLab={selectedLab}
              focusedActivity={focusedActivity}
              labsBounds={labsBounds}
              focusedLabsBounds={focusedLabsBounds}
              focusKey={focusKey}
            />

            {hasFocusedActivityCoordinates && focusedActivity ? (
              <Marker
                key={`activity-focus:${focusedActivity.id}:${focusedActivity.eventLatitude}:${focusedActivity.eventLongitude}`}
                position={[focusedActivity.eventLatitude!, focusedActivity.eventLongitude!]}
                icon={createActivityFocusIcon(
                  focusedActivity.locationName || "Lokasi Agenda"
                )}
              />
            ) : null}

            {labs.map((lab) => {
              const isSelected = activeSelectedLabId === lab.id;
              const isHighlighted = highlightedLabIdSet.has(lab.id);
              const isActive = activeLabIdSet.has(lab.id);
              const isMuted = mutedLabIdSet.has(lab.id);

              return (
                <Marker
                  key={`${lab.id}:${isSelected ? "selected" : "idle"}:${isHighlighted ? "search" : "no-search"}:${isActive ? "active" : "no-active"}:${isMuted ? "muted" : "normal"}`}
                  position={[lab.latitude, lab.longitude]}
                  icon={createLabIcon(
                    lab.labPhotoUrl,
                    isSelected,
                    isHighlighted,
                    isActive,
                    isMuted
                  )}
                  eventHandlers={{
                    click: () => handleSelectLab(lab.id),
                  }}
                />
              );
            })}
          </MapContainer>
        ) : (
          <div className="h-full w-full bg-slate-50" />
        )}
      </div>

      {selectedLab ? (
        <Drawer
          open={Boolean(selectedLab)}
          onClose={() => handleSelectLab(null)}
          title="Detail Laboratorium"
          placement={screens.lg ? "right" : "bottom"}
          size={screens.lg ? 430 : "72vh"}
          mask={!screens.lg}
          styles={{
            header: {
              padding: "14px 18px",
              borderBottom: "1px solid rgba(148, 163, 184, 0.18)",
            },
            body: {
              padding: 16,
              background: "#eef5ff",
            },
          }}
        >
          {detailContent}
        </Drawer>
      ) : null}
    </div>
  );
}
