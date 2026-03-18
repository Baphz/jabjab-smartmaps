"use client";

import {
  ReloadOutlined,
  SearchOutlined,
  PushpinOutlined,
} from "@ant-design/icons";
import { Button, Input } from "antd";
import { useMemo, useState } from "react";
import ActivityCalendar from "@/components/activity/ActivityCalendar";
import UpcomingActivityList from "@/components/activity/UpcomingActivityList";
import SmartMap, { type LabWithTypes } from "@/components/SmartMap";
import type { ActivitySourceItem } from "@/lib/activity-calendar";
import {
  buildLabAreaLabels,
  buildLabSearchText,
  normalizeSearchValue,
} from "@/lib/lab-address";

function MapPill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "focus" | "success" | "search";
}) {
  const toneClass =
    tone === "focus"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : tone === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : tone === "search"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-slate-200 bg-white text-slate-600";

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-medium ${toneClass}`}
    >
      {children}
    </span>
  );
}

type HomeMapAgendaLayoutProps = {
  labs: LabWithTypes[];
  items: ActivitySourceItem[];
  todayKey: string;
};

export default function HomeMapAgendaLayout({
  labs,
  items,
  todayKey,
}: HomeMapAgendaLayoutProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedActivity, setFocusedActivity] = useState<ActivitySourceItem | null>(null);
  const activeAgendaLabIds = useMemo(
    () =>
      Array.from(
        new Set(
          items
            .filter(
              (item) =>
                item.kind === "lab_event" &&
                Boolean(item.labId) &&
                item.endDate >= todayKey
            )
            .map((item) => item.labId)
            .filter((labId): labId is string => Boolean(labId))
        )
      ),
    [items, todayKey]
  );
  const initialSelectedLabId = useMemo(
    () =>
      items.find((item) => item.kind === "lab_event" && item.labId && item.endDate >= todayKey)
        ?.labId ?? null,
    [items, todayKey]
  );
  const [selectedLabId, setSelectedLabId] = useState<string | null>(
    initialSelectedLabId
  );
  const normalizedSearchQuery = useMemo(
    () => normalizeSearchValue(searchQuery),
    [searchQuery]
  );
  const selectedLabCandidate = useMemo(
    () => labs.find((lab) => lab.id === selectedLabId) ?? null,
    [labs, selectedLabId]
  );
  const effectiveSelectedLabId =
    normalizedSearchQuery &&
    selectedLabCandidate &&
    normalizeSearchValue(selectedLabCandidate.name) !== normalizedSearchQuery
      ? null
      : selectedLabId;

  const selectedLab = useMemo(
    () => labs.find((lab) => lab.id === effectiveSelectedLabId) ?? null,
    [effectiveSelectedLabId, labs]
  );
  const searchIndexedLabs = useMemo(
    () =>
      labs.map((lab) => ({
        lab,
        areaLabels: buildLabAreaLabels({
          provinceName: lab.provinceName,
          cityName: lab.cityName,
          cityType: lab.cityType,
          districtName: lab.districtName,
          villageName: lab.villageName,
        }),
        searchText: buildLabSearchText({
          name: lab.name,
          address: lab.address,
          provinceName: lab.provinceName,
          cityName: lab.cityName,
          cityType: lab.cityType,
          districtName: lab.districtName,
          villageName: lab.villageName,
        }),
      })),
    [labs]
  );
  const matchedSearchEntries = useMemo(() => {
    if (normalizedSearchQuery.length < 2) {
      return [];
    }

    return searchIndexedLabs.filter((entry) =>
      entry.searchText.includes(normalizedSearchQuery)
    );
  }, [normalizedSearchQuery, searchIndexedLabs]);
  const searchedLabIds = useMemo(
    () => matchedSearchEntries.map((entry) => entry.lab.id),
    [matchedSearchEntries]
  );
  const hasSearchFocus = normalizedSearchQuery.length >= 2 && searchedLabIds.length > 0;
  const searchAreaPreview = useMemo(
    () =>
      Array.from(
        new Set(matchedSearchEntries.flatMap((entry) => entry.areaLabels))
      ).slice(0, 3),
    [matchedSearchEntries]
  );
  const mutedLabIds = useMemo(
    () =>
      hasSearchFocus
        ? labs
            .filter((lab) => !searchedLabIds.includes(lab.id))
            .map((lab) => lab.id)
        : [],
    [hasSearchFocus, labs, searchedLabIds]
  );

  function handleSelectLab(nextLabId: string | null) {
    setFocusedActivity(null);
    setSelectedLabId(nextLabId);
  }

  function handleSelectActivityLocation(item: ActivitySourceItem) {
    setFocusedActivity(item);
    if (
      typeof item.eventLatitude === "number" &&
      Number.isFinite(item.eventLatitude) &&
      typeof item.eventLongitude === "number" &&
      Number.isFinite(item.eventLongitude)
    ) {
      setSelectedLabId(null);
      return;
    }

    setSelectedLabId(item.labId ?? null);
  }

  function handleResetMapView() {
    setSearchQuery("");
    setFocusedActivity(null);
    setSelectedLabId(null);
  }

  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white/96 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <div className="border-b border-slate-200/80 px-3.5 py-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Peta
              </div>
              <h2 className="mt-0.5 mb-0 text-[18px] font-semibold tracking-tight text-slate-950">
                Sebaran Laboratorium
              </h2>
            </div>

            <div className="flex w-full max-w-[470px] flex-col gap-2 sm:flex-row">
              <Input
                allowClear
                size="middle"
                value={searchQuery}
                prefix={<SearchOutlined className="text-slate-400" />}
                placeholder="Cari lab, kabupaten, kota, atau kecamatan"
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                }}
              />
              {normalizedSearchQuery || focusedActivity || effectiveSelectedLabId ? (
                <Button
                  type="default"
                  size="middle"
                  icon={<ReloadOutlined />}
                  onClick={handleResetMapView}
                  className="sm:min-w-[134px] sm:self-stretch"
                >
                  Reset peta
                </Button>
              ) : null}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <MapPill>{labs.length} titik</MapPill>
            {activeAgendaLabIds.length > 0 ? (
              <MapPill tone="success">{activeAgendaLabIds.length} agenda aktif</MapPill>
            ) : null}
            {normalizedSearchQuery ? (
              <MapPill tone="search">
                {matchedSearchEntries.length > 0
                  ? `${matchedSearchEntries.length} hasil`
                  : "Tidak ada hasil"}
              </MapPill>
            ) : null}
            {selectedLab ? (
              <MapPill tone="focus">
                <PushpinOutlined />
                <span className="truncate">Fokus: {selectedLab.name}</span>
              </MapPill>
            ) : null}
          </div>

          {normalizedSearchQuery && matchedSearchEntries.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-slate-500">
              {searchAreaPreview.map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-blue-100 bg-blue-50/80 px-2.5 py-1"
                >
                  {label}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="p-2">
          <div className="rounded-[18px] border border-slate-200 bg-slate-100/80 p-1.5 shadow-[0_14px_30px_rgba(15,23,42,0.04)]">
            <div className="h-[62vh] min-h-[470px] max-h-[700px] overflow-hidden rounded-[15px] border border-slate-200/90 bg-white">
              <SmartMap
                labs={labs}
                highlightedLabIds={searchedLabIds}
                activeLabIds={activeAgendaLabIds}
                focusedLabIds={searchedLabIds}
                mutedLabIds={mutedLabIds}
                focusedActivity={focusedActivity}
                selectedLabId={effectiveSelectedLabId}
                onSelectLab={handleSelectLab}
              />
            </div>
          </div>
        </div>
      </section>

      <aside className="xl:sticky xl:top-4 xl:self-start">
        <div className="flex flex-col gap-3">
          <section className="rounded-3xl border border-blue-200 bg-white/96 px-3 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
            <ActivityCalendar
              items={items}
              title="Kalender"
              description=""
              todayKey={todayKey}
              compact
              hideSummary
              hideNote
              onSelectLab={handleSelectLab}
              onSelectActivityLocation={handleSelectActivityLocation}
            />
          </section>

          <section className="rounded-3xl border border-emerald-200 bg-white/96 px-3 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
            <UpcomingActivityList
              items={items}
              title="Agenda"
              description=""
              todayKey={todayKey}
              limit={4}
              compact
              emptyMessage="Belum ada agenda."
              onSelectLab={handleSelectLab}
            />
          </section>
        </div>
      </aside>
    </div>
  );
}
