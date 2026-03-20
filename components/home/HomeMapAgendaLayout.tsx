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
import { siteContent } from "@/lib/site-content";

function MapPill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "focus" | "success" | "search";
}) {
  const toneClass = `smartmaps-map-pill smartmaps-map-pill-${tone}`;

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
  mapTitle?: string;
};

function getSearchPriority(lab: LabWithTypes, normalizedQuery: string) {
  const normalizedName = normalizeSearchValue(lab.name);
  const normalizedProvince = normalizeSearchValue(lab.provinceName ?? "");
  const normalizedCity = normalizeSearchValue(lab.cityName ?? "");
  const normalizedDistrict = normalizeSearchValue(lab.districtName ?? "");
  const normalizedVillage = normalizeSearchValue(lab.villageName ?? "");
  const normalizedAddress = normalizeSearchValue(
    `${lab.addressDetail ?? ""} ${lab.address ?? ""}`
  );

  if (normalizedName === normalizedQuery) return 240;
  if (normalizedName.startsWith(normalizedQuery)) return 210;
  if (normalizedVillage === normalizedQuery) return 190;
  if (normalizedDistrict === normalizedQuery) return 180;
  if (normalizedCity === normalizedQuery) return 170;
  if (normalizedProvince === normalizedQuery) return 160;
  if (normalizedVillage.startsWith(normalizedQuery)) return 148;
  if (normalizedDistrict.startsWith(normalizedQuery)) return 138;
  if (normalizedCity.startsWith(normalizedQuery)) return 128;
  if (normalizedProvince.startsWith(normalizedQuery)) return 118;
  if (normalizedName.includes(normalizedQuery)) return 104;
  if (normalizedVillage.includes(normalizedQuery)) return 98;
  if (normalizedDistrict.includes(normalizedQuery)) return 92;
  if (normalizedCity.includes(normalizedQuery)) return 86;
  if (normalizedProvince.includes(normalizedQuery)) return 80;
  if (normalizedAddress.includes(normalizedQuery)) return 62;

  return 0;
}

export default function HomeMapAgendaLayout({
  labs,
  items,
  todayKey,
  mapTitle,
}: HomeMapAgendaLayoutProps) {
  const publicHomeContent = siteContent.publicHome;
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
          villageType: lab.villageType,
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

    return searchIndexedLabs
      .map((entry) => ({
        ...entry,
        priority: getSearchPriority(entry.lab, normalizedSearchQuery),
      }))
      .filter(
        (entry) =>
          entry.priority > 0 || entry.searchText.includes(normalizedSearchQuery)
      )
      .sort((left, right) => {
        if (right.priority !== left.priority) {
          return right.priority - left.priority;
        }

        return left.lab.name.localeCompare(right.lab.name, "id");
      });
  }, [normalizedSearchQuery, searchIndexedLabs]);
  const searchedLabIds = useMemo(
    () => matchedSearchEntries.map((entry) => entry.lab.id),
    [matchedSearchEntries]
  );
  const bestMatchLabId = matchedSearchEntries[0]?.lab.id ?? null;
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
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1.18fr)_372px] 2xl:grid-cols-[minmax(0,1.24fr)_392px]">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <div className="border-b border-slate-200/80 px-3.5 py-3">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(320px,460px)] lg:items-end">
            <div className="max-w-3xl">
              <div className="smartmaps-overline">
                {siteContent.publicHome.sections.mapEyebrow}
              </div>
              <h2 className="smartmaps-title-section mt-0.5">
                {mapTitle ?? siteContent.publicHome.sections.mapTitle}
              </h2>
            </div>

            <div className="flex w-full flex-col gap-2 sm:flex-row lg:justify-self-end">
              <Input
                allowClear
                size="middle"
                value={searchQuery}
                prefix={<SearchOutlined className="text-slate-400" />}
                placeholder={publicHomeContent.map.searchPlaceholder}
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
                  className="smartmaps-map-reset-button sm:min-w-[136px] sm:self-stretch"
                >
                  {publicHomeContent.map.resetLabel}
                </Button>
              ) : null}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {activeAgendaLabIds.length > 0 ? (
              <MapPill tone="success">
                {activeAgendaLabIds.length} {publicHomeContent.map.activeAgendaSuffix}
              </MapPill>
            ) : null}
            {normalizedSearchQuery ? (
              <MapPill tone="search">
                {matchedSearchEntries.length > 0
                  ? `${matchedSearchEntries.length} ${publicHomeContent.map.resultsLabel}`
                  : publicHomeContent.map.noResultsLabel}
              </MapPill>
            ) : null}
            {selectedLab ? (
              <MapPill tone="focus">
                <PushpinOutlined />
                <span className="truncate">
                  {publicHomeContent.map.focusPrefix}: {selectedLab.name}
                </span>
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
          <div className="rounded-[18px] border border-slate-200 bg-slate-100/90 p-1.5 shadow-[0_14px_30px_rgba(15,23,42,0.04)]">
            <div className="h-[58vh] min-h-[430px] max-h-[700px] overflow-hidden rounded-[15px] border border-slate-200/90 bg-white sm:h-[60vh] lg:h-[62vh]">
              <SmartMap
                labs={labs}
                highlightedLabIds={searchedLabIds}
                activeLabIds={activeAgendaLabIds}
              focusedLabIds={searchedLabIds}
              mutedLabIds={mutedLabIds}
              bestMatchLabId={bestMatchLabId}
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
          <section className="rounded-3xl border border-blue-200 bg-sky-50/80 px-3 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
            <ActivityCalendar
              items={items}
              title={publicHomeContent.sidebar.calendarTitle}
              description=""
              todayKey={todayKey}
              compact
              hideSummary
              hideNote
              onSelectLab={handleSelectLab}
              onSelectActivityLocation={handleSelectActivityLocation}
              weekdayLabels={publicHomeContent.calendar.weekdayLabels}
              kindLabels={publicHomeContent.calendar.kinds}
              globalArticleScopeLabel={publicHomeContent.calendar.scopes.globalArticle}
              globalAgendaScopeLabel={publicHomeContent.calendar.scopes.globalAgenda}
              todayLabel={publicHomeContent.calendar.todayLabel}
              detailTitlePrefix={publicHomeContent.calendar.detailPrefix}
              closeLabel={publicHomeContent.calendar.closeLabel}
              emptyDayLabel={publicHomeContent.calendar.emptyDayLabel}
              readArticleLabel={publicHomeContent.calendar.readArticleLabel}
              readRelatedArticleLabel={
                publicHomeContent.calendar.readRelatedArticleLabel
              }
              viewMapLabel={publicHomeContent.calendar.viewMapLabel}
            />
          </section>

          <section className="rounded-3xl border border-emerald-200 bg-emerald-50/75 px-3 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
            <UpcomingActivityList
              items={items}
              title={publicHomeContent.sidebar.agendaTitle}
              description=""
              todayKey={todayKey}
              limit={4}
              compact
              emptyMessage={publicHomeContent.sidebar.emptyAgendaLabel}
              onSelectLab={handleSelectLab}
              kindLabels={publicHomeContent.calendar.kinds}
              globalArticleScopeLabel={publicHomeContent.calendar.scopes.globalArticle}
              globalAgendaScopeLabel={publicHomeContent.calendar.scopes.globalAgenda}
              readRelatedArticleLabel={
                publicHomeContent.calendar.readRelatedArticleLabel
              }
              viewMapLabel={publicHomeContent.calendar.viewMapLabel}
            />
          </section>
        </div>
      </aside>
    </div>
  );
}
