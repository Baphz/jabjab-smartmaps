"use client";

import {
  CloseOutlined,
  EnvironmentOutlined,
  GlobalOutlined,
  PhoneOutlined,
} from "@ant-design/icons";
import { Card, Drawer, Empty, Grid, Typography } from "antd";
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
import { useAppTheme } from "@/components/theme/AppThemeProvider";
import { resolveStoredPhotoUrl } from "@/lib/drive-file";
import type { ActivitySourceItem } from "@/lib/activity-calendar";
import {
  buildAdministrativeAddressParts,
  type LabCityTypeValue,
  type LabVillageTypeValue,
} from "@/lib/lab-address";
import { siteContent } from "@/lib/site-content";
import "leaflet/dist/leaflet.css";

const { Paragraph: TypographyParagraph } = Typography;

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
  bestMatchLabId?: string | null;
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
    function animateToBounds(
      bounds: L.LatLngBounds,
      options: { padding: [number, number]; maxZoom: number; duration?: number }
    ) {
      map.stop();

      if (!hasInitializedRef.current) {
        map.fitBounds(bounds, {
          padding: options.padding,
          maxZoom: options.maxZoom,
          animate: false,
        });
        return;
      }

      map.flyToBounds(bounds, {
        padding: options.padding,
        maxZoom: options.maxZoom,
        animate: true,
        duration: options.duration ?? 1,
        easeLinearity: 0.18,
      });
    }

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
        animateToBounds(focusedLabsBounds, {
          padding: [52, 52],
          maxZoom: 10,
          duration: 0.95,
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
      animateToBounds(labsBounds, {
        padding: [44, 44],
        maxZoom: 8,
        duration: 1.15,
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

function formatWebsiteDisplay(value: string | null): string | null {
  const normalized = normalizeWebsiteUrl(value);
  if (!normalized) return null;

  try {
    const parsed = new URL(normalized);
    const pathname =
      parsed.pathname && parsed.pathname !== "/"
        ? parsed.pathname.replace(/\/$/, "")
        : "";
    return `${parsed.hostname}${pathname}`;
  } catch {
    return value?.trim() || null;
  }
}

function createLabIcon(
  photoValue: string,
  selected: boolean,
  highlighted: boolean,
  active: boolean,
  muted: boolean,
  bestMatch: boolean
) {
  const photoUrl = resolvePhotoUrl(photoValue);
  const style = photoUrl ? `background-image:url('${photoUrl}')` : "";
  const classes = [
    "lab-pin",
    selected ? "lab-pin-selected" : "",
    active ? "lab-pin-active" : "",
    highlighted ? "lab-pin-search" : "",
    bestMatch ? "lab-pin-best-match" : "",
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
  const safeLabel = String(
    label ?? siteContent.publicHome.map.defaultAgendaLocationLabel
  )
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

function escapeMapLabel(value: string) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function createMarkerLabelIcon(
  title: string,
  actionLabel?: string | null,
  tone: "selected" | "event" = "selected"
) {
  const safeTitle = escapeMapLabel(title);
  const safeAction = actionLabel ? escapeMapLabel(actionLabel) : "";
  const toneClass =
    tone === "event" ? "map-marker-label map-marker-label-event" : "map-marker-label map-marker-label-selected";

  return L.divIcon({
    className: "",
    html: `
      <div class="map-marker-label-wrap">
        <div class="${toneClass}">
          <div class="map-marker-label-title">${safeTitle}</div>
          ${safeAction ? `<div class="map-marker-label-action">${safeAction}</div>` : ""}
        </div>
      </div>
    `,
    iconSize: [236, 124],
    iconAnchor: [118, 124],
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
        className="smartmaps-photo-frame-empty"
        style={{
          width,
          height,
          borderRadius: rounded,
        }}
      >
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={false} />
      </div>
    );
  }

  return (
    <div
      className="smartmaps-photo-frame"
      style={{
        position: "relative",
        width,
        height,
        overflow: "hidden",
        borderRadius: rounded,
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
      className="smartmaps-detail-section"
      style={{
        border: "1px solid var(--border)",
        background: "var(--surface)",
      }}
    >
      <div className="mb-2.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {eyebrow}
      </div>
      {children}
    </Card>
  );
}

function DetailInfoRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div
      className="flex items-start gap-2.5 rounded-[18px] border px-3 py-2.5"
      style={{
        borderColor: "var(--border)",
        background: "var(--surface-strong)",
      }}
    >
      <div className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-[15px] text-slate-500">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          {label}
        </div>
        <div className="mt-1 break-words text-[13px] font-medium leading-5 text-slate-900">
          {children}
        </div>
      </div>
    </div>
  );
}

function StructurePersonCard({
  photoUrl,
  name,
  role,
  roleClassName,
  emptyLabel = "Belum diisi",
}: {
  photoUrl: string;
  name: string | null;
  role: string;
  roleClassName: string;
  emptyLabel?: string;
}) {
  const displayName = name?.trim() || emptyLabel;

  return (
    <div className="rounded-[18px] border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex h-full flex-col items-center text-center">
        <PhotoFrame
          src={photoUrl}
          alt={displayName}
          width={96}
          height={96}
          rounded={999}
        />

        <div className="mt-3 min-h-[68px] w-full">
          <div
            className="mx-auto max-w-[220px] overflow-hidden text-[14px] font-semibold leading-5 text-slate-900"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
            }}
            title={displayName}
          >
            {displayName}
          </div>
        </div>

        <span
          className={`mt-auto inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${roleClassName}`}
        >
          {role}
        </span>
      </div>
    </div>
  );
}

export default function SmartMapInner({
  labs,
  highlightedLabIds = [],
  activeLabIds = [],
  focusedLabIds = [],
  mutedLabIds = [],
  bestMatchLabId = null,
  focusedActivity = null,
  selectedLabId,
  onSelectLab,
}: SmartMapInnerProps) {
  const mapContent = siteContent.publicHome.map;
  const { mode } = useAppTheme();
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
  const tileLayerUrl =
    mode === "dark"
      ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
  const selectedLabAreaParts = useMemo(
    () =>
      selectedLab
        ? buildAdministrativeAddressParts({
            provinceName: selectedLab.provinceName,
            cityName: selectedLab.cityName,
            cityType: selectedLab.cityType,
            districtName: selectedLab.districtName,
            villageName: selectedLab.villageName,
            villageType: selectedLab.villageType,
          })
        : [],
    [selectedLab]
  );
  const selectedLabAddressLead = selectedLab
    ? selectedLab.addressDetail?.trim() || selectedLab.address
    : "";
  const selectedLabNavigationUrl = selectedLab
    ? `https://www.google.com/maps/search/?api=1&query=${selectedLab.latitude},${selectedLab.longitude}`
    : null;
  const focusedActivityNavigationUrl =
    focusedActivity && hasFocusedActivityCoordinates
      ? `https://www.google.com/maps/search/?api=1&query=${focusedActivity.eventLatitude},${focusedActivity.eventLongitude}`
      : null;
  const focusedActivityArticleUrl =
    focusedActivity?.relatedArticleSlug
      ? `/artikel/${focusedActivity.relatedArticleSlug}`
      : null;

  function handleSelectLab(nextLabId: string | null) {
    if (!isControlled) {
      setInternalSelectedLabId(nextLabId);
    }

    onSelectLab?.(nextLabId);
  }

  function openExternalUrl(url: string | null) {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const detailContent = selectedLab ? (
    <div className="flex flex-col gap-3">
      <DetailSection eyebrow={mapContent.labDetail.photoSectionTitle}>
        <PhotoFrame
          src={resolvePhotoUrl(selectedLab.labPhotoUrl)}
          alt={selectedLab.name}
          width="100%"
          height={240}
          rounded={18}
        />
      </DetailSection>

      <DetailSection eyebrow={mapContent.labDetail.structureSectionTitle}>
        <div className="grid gap-3 md:grid-cols-2">
          <StructurePersonCard
            photoUrl={resolvePhotoUrl(selectedLab.head1PhotoUrl)}
            name={selectedLab.head1Name}
            role={mapContent.labDetail.headRoleLabel}
            roleClassName="smartmaps-role-pill smartmaps-role-pill-head"
            emptyLabel={mapContent.labDetail.emptyValueLabel}
          />

          <StructurePersonCard
            photoUrl={resolvePhotoUrl(selectedLab.head2PhotoUrl)}
            name={selectedLab.head2Name}
            role={mapContent.labDetail.adminRoleLabel}
            roleClassName="smartmaps-role-pill smartmaps-role-pill-tu"
            emptyLabel={mapContent.labDetail.emptyValueLabel}
          />
        </div>
      </DetailSection>

      <div
        className="rounded-3xl border p-4"
        style={{
          borderColor: "var(--border)",
          background: "var(--surface-muted)",
        }}
      >
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            {mapContent.labDetail.profileEyebrow}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {selectedLab.types.map((type) => (
              <span
                key={type.id}
                className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${getLabTypePillClass(type.name)}`}
              >
                {type.name}
              </span>
            ))}
          </div>
          <div
            className="mt-2 overflow-hidden text-[17px] font-semibold leading-[1.28] tracking-tight text-slate-950 sm:text-[18px]"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
            }}
            title={selectedLab.name}
          >
            {selectedLab.name}
          </div>
          {selectedLabAddressLead ? (
            <TypographyParagraph
              ellipsis={{ rows: 1 }}
              style={{
                marginTop: 8,
                marginBottom: 0,
                fontSize: 13,
                lineHeight: 1.5,
                color: "var(--text-muted)",
              }}
            >
              {selectedLabAddressLead}
            </TypographyParagraph>
          ) : null}
          {selectedLabAreaParts.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {selectedLabAreaParts.map((part) => (
                <span
                  key={part}
                  className="inline-flex rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 text-[11px] font-medium text-slate-600"
                >
                  {part}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <DetailSection eyebrow={mapContent.labDetail.contactSectionTitle}>
        <div className="flex flex-col gap-2">
          <DetailInfoRow
            icon={<PhoneOutlined />}
            label={mapContent.labDetail.phoneLabel}
          >
            {selectedLab.phone ? (
              <a
                href={`tel:${selectedLab.phone.replace(/\s+/g, "")}`}
                className="text-slate-900"
              >
                {selectedLab.phone}
              </a>
            ) : (
              <span className="font-normal text-slate-500">{mapContent.labDetail.emptyValueLabel}</span>
            )}
          </DetailInfoRow>

          <DetailInfoRow
            icon={<GlobalOutlined />}
            label={mapContent.labDetail.websiteLabel}
          >
            {selectedLab.websiteUrl ? (
              <a
                href={normalizeWebsiteUrl(selectedLab.websiteUrl) ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="block break-all text-slate-900"
                title={normalizeWebsiteUrl(selectedLab.websiteUrl) ?? selectedLab.websiteUrl}
              >
                {formatWebsiteDisplay(selectedLab.websiteUrl) ?? selectedLab.websiteUrl}
              </a>
            ) : (
              <span className="font-normal text-slate-500">{mapContent.labDetail.emptyValueLabel}</span>
            )}
          </DetailInfoRow>

          <DetailInfoRow
            icon={<EnvironmentOutlined />}
            label={mapContent.labDetail.coordinatesLabel}
          >
            <span className="text-slate-900">
              {selectedLab.latitude}, {selectedLab.longitude}
            </span>
          </DetailInfoRow>

          <DetailInfoRow
            icon={<EnvironmentOutlined />}
            label={mapContent.labDetail.locationAccessLabel}
          >
            {selectedLabNavigationUrl ? (
              <a
                href={selectedLabNavigationUrl}
                target="_blank"
                rel="noreferrer"
                className="text-slate-900"
              >
                {mapContent.labDetail.openMapsLabel}
              </a>
            ) : (
              <span className="font-normal text-slate-500">{mapContent.labDetail.unavailableValueLabel}</span>
            )}
          </DetailInfoRow>
        </div>
      </DetailSection>
    </div>
  ) : null;

  return (
    <div className="h-full">
      <div className="relative min-h-0 h-full overflow-hidden rounded-[22px]">
        <div className="pointer-events-none absolute bottom-3 left-3 z-500">
          <div className="rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-xs text-slate-600 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur">
            <span className="inline-flex items-center gap-3">
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                {mapContent.legend.labLocation}
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="map-legend-pulse map-legend-pulse-active" />
                {mapContent.legend.activeAgenda}
              </span>
              {highlightedLabIds.length > 0 ? (
                <span className="inline-flex items-center gap-2">
                  <span className="map-legend-pulse map-legend-pulse-search" />
                  {mapContent.legend.searchResults}
                </span>
              ) : null}
              {hasFocusedActivityCoordinates ? (
                <span className="inline-flex items-center gap-2">
                  <span className="map-legend-pulse map-legend-pulse-event" />
                  {mapContent.legend.agendaLocation}
                </span>
              ) : null}
            </span>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-3 right-3 z-500">
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
              key={`smart-map-tiles:${mode}`}
              attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
              url={tileLayerUrl}
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
              <>
                <Marker
                  key={`activity-focus:${focusedActivity.id}:${focusedActivity.eventLatitude}:${focusedActivity.eventLongitude}`}
                  position={[focusedActivity.eventLatitude!, focusedActivity.eventLongitude!]}
                  icon={createActivityFocusIcon(
                    focusedActivity.locationName || mapContent.defaultAgendaLocationLabel
                  )}
                  zIndexOffset={1200}
                  eventHandlers={{
                    click: () => openExternalUrl(focusedActivityNavigationUrl),
                  }}
                />
                <Marker
                  key={`activity-focus-label:${focusedActivity.id}:${focusedActivity.eventLatitude}:${focusedActivity.eventLongitude}`}
                  position={[focusedActivity.eventLatitude!, focusedActivity.eventLongitude!]}
                  icon={createMarkerLabelIcon(
                    focusedActivity.locationName ||
                      focusedActivity.title ||
                      mapContent.defaultAgendaLocationLabel,
                    focusedActivityArticleUrl
                      ? siteContent.publicHome.calendar.readRelatedArticleLabel
                      : null,
                    "event"
                  )}
                  zIndexOffset={1700}
                  eventHandlers={
                    focusedActivityArticleUrl
                      ? {
                          click: () => openExternalUrl(focusedActivityArticleUrl),
                        }
                      : undefined
                  }
                />
              </>
            ) : null}

            {selectedLab && !hasFocusedActivityCoordinates ? (
              <Marker
                key={`selected-lab-label:${selectedLab.id}:${selectedLab.latitude}:${selectedLab.longitude}`}
                position={[selectedLab.latitude, selectedLab.longitude]}
                icon={createMarkerLabelIcon(
                  selectedLab.name,
                  mapContent.labDetail.openMapsLabel,
                  "selected"
                )}
                zIndexOffset={1600}
                eventHandlers={{
                  click: () => openExternalUrl(selectedLabNavigationUrl),
                }}
              />
            ) : null}

            {labs.map((lab) => {
              const isSelected = activeSelectedLabId === lab.id;
              const isHighlighted = highlightedLabIdSet.has(lab.id);
              const isActive = activeLabIdSet.has(lab.id);
              const isMuted = mutedLabIdSet.has(lab.id);
              const isBestMatch = bestMatchLabId === lab.id;
              const zIndexOffset = isSelected
                ? 960
                : isBestMatch
                  ? 760
                  : isHighlighted
                    ? 640
                    : isActive
                      ? 520
                      : isMuted
                        ? -120
                        : 0;

              return (
                <Marker
                  key={`${lab.id}:${isSelected ? "selected" : "idle"}:${isHighlighted ? "search" : "no-search"}:${isBestMatch ? "best" : "regular"}:${isActive ? "active" : "no-active"}:${isMuted ? "muted" : "normal"}`}
                  position={[lab.latitude, lab.longitude]}
                  icon={createLabIcon(
                    lab.labPhotoUrl,
                    isSelected,
                    isHighlighted,
                    isActive,
                    isMuted,
                    isBestMatch
                  )}
                  zIndexOffset={zIndexOffset}
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
          className="smartmaps-detail-drawer"
          open={Boolean(selectedLab)}
          onClose={() => handleSelectLab(null)}
          title={mapContent.detailDrawerTitle}
          closeIcon={<CloseOutlined />}
          placement={screens.lg ? "left" : "bottom"}
          size={screens.lg ? 430 : "72vh"}
          mask={!screens.lg}
          styles={{
            header: {
              padding: "14px 18px",
              borderBottom: "1px solid var(--border)",
              background: "var(--surface)",
            },
            body: {
              padding: 16,
              background: "var(--surface-muted)",
            },
          }}
        >
          {detailContent}
        </Drawer>
      ) : null}
    </div>
  );
}
