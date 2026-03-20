"use client";

import {
  CalendarOutlined,
  CloseOutlined,
  EnvironmentOutlined,
  LeftOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { Button, Empty, Modal, Space, Typography } from "antd";
import { startTransition, useMemo, useState } from "react";
import {
  addDaysUtc,
  addMonthsUtc,
  buildMonthCells,
  CALENDAR_WEEKDAY_LABELS,
  expandActivitySources,
  formatActivityRange,
  formatFullDate,
  formatMonthKey,
  formatMonthTitle,
  getActivityKindLabel,
  getActivityScopeLabel,
  isSameMonth,
  parseMonthKey,
  type ActivityKind,
  type ActivitySourceItem,
} from "@/lib/activity-calendar";
import { buildAdministrativeAddressParts } from "@/lib/lab-address";
import { siteContent } from "@/lib/site-content";

const { Paragraph: TypographyParagraph, Text: TypographyText, Title: TypographyTitle } = Typography;

type ActivityCalendarProps = {
  items: ActivitySourceItem[];
  title: string;
  description: string;
  todayKey: string;
  compact?: boolean;
  hideSummary?: boolean;
  hideNote?: boolean;
  note?: string;
  actionHref?: string;
  actionLabel?: string;
  onSelectActivityLocation?: (item: ActivitySourceItem) => void;
  kindLabels?: Partial<Record<ActivityKind, string>>;
  weekdayLabels?: readonly string[];
  globalArticleScopeLabel?: string;
  globalAgendaScopeLabel?: string;
  todayLabel?: string;
  detailTitlePrefix?: string;
  closeLabel?: string;
  emptyDayLabel?: string;
  readArticleLabel?: string;
  readRelatedArticleLabel?: string;
  viewMapLabel?: string;
};

const KIND_STYLES: Record<
  ActivityKind,
  {
    pill: string;
    dot: string;
  }
> = {
  lab_event: {
    pill: "smartmaps-calendar-kind-pill smartmaps-calendar-kind-pill-event",
    dot: "smartmaps-calendar-kind-dot smartmaps-calendar-kind-dot-event",
  },
  article: {
    pill: "smartmaps-calendar-kind-pill smartmaps-calendar-kind-pill-article",
    dot: "smartmaps-calendar-kind-dot smartmaps-calendar-kind-dot-article",
  },
  libur_nasional: {
    pill: "smartmaps-calendar-kind-pill smartmaps-calendar-kind-pill-holiday",
    dot: "smartmaps-calendar-kind-dot smartmaps-calendar-kind-dot-holiday",
  },
  cuti_bersama: {
    pill: "smartmaps-calendar-kind-pill smartmaps-calendar-kind-pill-leave",
    dot: "smartmaps-calendar-kind-dot smartmaps-calendar-kind-dot-leave",
  },
};

function getMonthBounds(monthKey: string) {
  const monthStart = parseMonthKey(monthKey);
  if (!monthStart) {
    return {
      monthStartKey: "",
      monthEndKey: "",
    };
  }

  const nextMonthStart = addMonthsUtc(monthStart, 1);
  const monthStartKey = formatMonthKey(monthStart) + "-01";
  const monthEndKey = addDaysUtc(formatMonthKey(nextMonthStart) + "-01", -1);

  return {
    monthStartKey,
    monthEndKey,
  };
}

function overlapsMonth(item: ActivitySourceItem, monthKey: string) {
  const { monthStartKey, monthEndKey } = getMonthBounds(monthKey);
  if (!monthStartKey || !monthEndKey) return false;

  return item.startDate <= monthEndKey && item.endDate >= monthStartKey;
}

function rankKind(kind: ActivityKind) {
  if (kind === "lab_event") return 0;
  if (kind === "article") return 1;
  if (kind === "libur_nasional") return 2;
  return 3;
}

function sortDayItems(items: ActivitySourceItem[]) {
  return [...items].sort((a, b) => {
    const byKind = rankKind(a.kind) - rankKind(b.kind);
    if (byKind !== 0) return byKind;

    if ((a.labName ?? "") !== (b.labName ?? "")) {
      return (a.labName ?? "").localeCompare(b.labName ?? "", "id");
    }

    return a.title.localeCompare(b.title, "id");
  });
}

function hasActivityCoordinates(item: ActivitySourceItem) {
  return (
    typeof item.eventLatitude === "number" &&
    Number.isFinite(item.eventLatitude) &&
    typeof item.eventLongitude === "number" &&
    Number.isFinite(item.eventLongitude)
  );
}

function buildActivityMapsUrl(item: ActivitySourceItem) {
  if (item.kind !== "lab_event") {
    return null;
  }

  if (hasActivityCoordinates(item)) {
    return `https://www.google.com/maps/search/?api=1&query=${item.eventLatitude},${item.eventLongitude}`;
  }

  const query = [
    item.locationName,
    item.addressDetail,
    item.locationAddress,
    ...buildAdministrativeAddressParts({
      provinceName: item.provinceName,
      cityName: item.cityName,
      cityType: item.cityType,
      districtName: item.districtName,
      villageName: item.villageName,
      villageType: item.villageType,
    }),
  ]
    .filter(Boolean)
    .join(", ");

  if (!query) {
    return null;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export default function ActivityCalendar({
  items,
  title,
  description,
  todayKey,
  compact = false,
  hideSummary = false,
  hideNote = false,
  note = "",
  actionHref,
  actionLabel,
  onSelectActivityLocation,
  kindLabels,
  weekdayLabels = CALENDAR_WEEKDAY_LABELS,
  globalArticleScopeLabel,
  globalAgendaScopeLabel,
  todayLabel = "Hari Ini",
  detailTitlePrefix = "Detail",
  closeLabel = "Tutup",
  emptyDayLabel = "Belum ada item.",
  readArticleLabel = "Baca artikel",
  readRelatedArticleLabel = "Baca artikel terkait",
  viewMapLabel = siteContent.publicHome.map.labDetail.openMapsLabel,
}: ActivityCalendarProps) {
  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) => {
        if (a.startDate !== b.startDate) {
          return a.startDate.localeCompare(b.startDate);
        }

        return a.title.localeCompare(b.title, "id");
      }),
    [items]
  );

  const defaultDateKey = sortedItems.find((item) => item.endDate >= todayKey)?.startDate ?? todayKey;
  const [monthKey, setMonthKey] = useState(defaultDateKey.slice(0, 7));
  const [selectedDateKey, setSelectedDateKey] = useState(defaultDateKey);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const dayItems = useMemo(() => expandActivitySources(sortedItems), [sortedItems]);
  const dayMap = useMemo(() => {
    const map = new Map<string, ActivitySourceItem[]>();

    for (const item of dayItems) {
      const current = map.get(item.dateKey) ?? [];
      current.push(item);
      map.set(item.dateKey, current);
    }

    return map;
  }, [dayItems]);

  const monthStart = parseMonthKey(monthKey) ?? parseMonthKey(todayKey.slice(0, 7));
  const cells = useMemo(() => buildMonthCells(monthStart ?? new Date()), [monthStart]);
  const selectedItems = sortDayItems(dayMap.get(selectedDateKey) ?? []);
  const visibleMonthItems = useMemo(
    () => sortedItems.filter((item) => overlapsMonth(item, monthKey)),
    [monthKey, sortedItems]
  );

  const counts = {
    lab_event: visibleMonthItems.filter((item) => item.kind === "lab_event").length,
    article: visibleMonthItems.filter((item) => item.kind === "article").length,
    libur_nasional: visibleMonthItems.filter((item) => item.kind === "libur_nasional").length,
    cuti_bersama: visibleMonthItems.filter((item) => item.kind === "cuti_bersama").length,
  };

  function getLocationParts(item: ActivitySourceItem) {
    return buildAdministrativeAddressParts({
      provinceName: item.provinceName,
      cityName: item.cityName,
      cityType: item.cityType,
      districtName: item.districtName,
      villageName: item.villageName,
      villageType: item.villageType,
    });
  }

  function getDisplayKindLabel(kind: ActivityKind) {
    return kindLabels?.[kind] ?? getActivityKindLabel(kind);
  }

  function getDisplayScopeLabel(item: ActivitySourceItem) {
    if (item.kind === "article" && item.isGlobal && globalArticleScopeLabel) {
      return globalArticleScopeLabel;
    }

    if (item.kind === "lab_event" && item.isGlobal && globalAgendaScopeLabel) {
      return globalAgendaScopeLabel;
    }

    return getActivityScopeLabel(item);
  }

  function moveMonth(direction: number) {
    if (!monthStart) return;

    const nextMonth = addMonthsUtc(monthStart, direction);
    const nextMonthKey = formatMonthKey(nextMonth);
    const nextSelected =
      sortedItems.find((item) => overlapsMonth(item, nextMonthKey))?.startDate ??
      `${nextMonthKey}-01`;

    startTransition(() => {
      setMonthKey(nextMonthKey);
      setSelectedDateKey(nextSelected);
    });
  }

  function handleSelectDate(dateKey: string) {
    const nextItems = sortDayItems(dayMap.get(dateKey) ?? []);
    const firstMappableActivity =
      nextItems.find(
        (item) =>
          item.kind === "lab_event" &&
          (typeof item.eventLatitude === "number" ||
            typeof item.eventLongitude === "number" ||
            Boolean(item.labId))
      ) ?? null;

    if (!isSameMonth(dateKey, monthKey)) {
      startTransition(() => {
        setMonthKey(dateKey.slice(0, 7));
        setSelectedDateKey(dateKey);
      });

      if (firstMappableActivity && onSelectActivityLocation) {
        onSelectActivityLocation(firstMappableActivity);
        setIsDetailOpen(false);
        return;
      }
      setIsDetailOpen(true);
      return;
    }

    setSelectedDateKey(dateKey);

    if (firstMappableActivity && onSelectActivityLocation) {
      onSelectActivityLocation(firstMappableActivity);
      setIsDetailOpen(false);
      return;
    }
    setIsDetailOpen(true);
  }

  return (
    <Space orientation="vertical" size={compact ? 10 : 12} style={{ width: "100%" }}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <TypographyTitle level={5} style={{ marginBottom: compact ? 1 : 2 }}>
            {title}
          </TypographyTitle>
          {description ? (
            <TypographyParagraph
              style={{
                marginBottom: 0,
                color: "#64748b",
                fontSize: compact ? 11.5 : 12,
                lineHeight: compact ? 1.45 : 1.5,
              }}
            >
              {description}
            </TypographyParagraph>
          ) : null}
        </div>

        {actionHref && actionLabel ? (
          <Button href={actionHref} size="small">
            {actionLabel}
          </Button>
        ) : null}
      </div>

      {!hideSummary ? (
        <div className={`grid gap-2 ${compact ? "grid-cols-2 sm:grid-cols-4" : "sm:grid-cols-4"}`}>
          <div className="rounded-[14px] border border-slate-200 bg-slate-50 px-2.5 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {getDisplayKindLabel("lab_event")}
            </div>
            <div className="mt-1 text-base font-semibold tracking-tight text-slate-900">
              {counts.lab_event}
            </div>
          </div>

          <div className="rounded-[14px] border border-slate-200 bg-slate-50 px-2.5 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {getDisplayKindLabel("article")}
            </div>
            <div className="mt-1 text-base font-semibold tracking-tight text-slate-900">
              {counts.article}
            </div>
          </div>

          <div className="rounded-[14px] border border-slate-200 bg-slate-50 px-2.5 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {getDisplayKindLabel("libur_nasional")}
            </div>
            <div className="mt-1 text-base font-semibold tracking-tight text-slate-900">
              {counts.libur_nasional}
            </div>
          </div>

          <div className="rounded-[14px] border border-slate-200 bg-slate-50 px-2.5 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {getDisplayKindLabel("cuti_bersama")}
            </div>
            <div className="mt-1 text-base font-semibold tracking-tight text-slate-900">
              {counts.cuti_bersama}
            </div>
          </div>
        </div>
      ) : null}

      <div className={`rounded-2xl border border-slate-200 bg-slate-50/80 ${compact ? "p-2.5" : "p-3"}`}>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <TypographyTitle level={5} style={{ marginBottom: compact ? 1 : 2 }}>
              {formatMonthTitle(monthKey)}
            </TypographyTitle>
          </div>

          <Space wrap size={[8, 8]}>
            <Space size={4}>
              <Button icon={<LeftOutlined />} onClick={() => moveMonth(-1)} size="small" />
              <Button icon={<RightOutlined />} onClick={() => moveMonth(1)} size="small" />
            </Space>
            <Button
              size="small"
              onClick={() => {
                startTransition(() => {
                  setMonthKey(todayKey.slice(0, 7));
                  setSelectedDateKey(todayKey);
                });
              }}
            >
              {todayLabel}
            </Button>
          </Space>
        </div>

        <div className={`flex flex-wrap gap-2 ${compact ? "mt-2.5" : "mt-4"}`}>
          {(["lab_event", "article", "libur_nasional", "cuti_bersama"] as const).map((kind) => (
            <span
              key={kind}
              className={`inline-flex items-center gap-2 rounded-full font-semibold ring-1 ${compact ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs"} ${KIND_STYLES[kind].pill}`}
            >
              <span
                className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${KIND_STYLES[kind].dot}`}
              />
              {getDisplayKindLabel(kind)}
            </span>
          ))}
        </div>

        <div className={`${compact ? "mt-2" : "mt-2.5"}`}>
          <div className={compact ? "w-full" : "min-w-[720px]"}>
            <div className={`grid grid-cols-7 ${compact ? "gap-1.5" : "gap-2"}`}>
              {weekdayLabels.map((label) => (
                <div
                  key={label}
                  className={`text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 ${compact ? "px-1.5 py-1" : "px-2 py-1.5"}`}
                >
                  {label}
                </div>
              ))}
            </div>

            <div className={`grid grid-cols-7 ${compact ? "mt-1 gap-1.5" : "mt-1.5 gap-2"}`}>
              {cells.map((cell) => {
                const currentItems = sortDayItems(dayMap.get(cell.dateKey) ?? []);
                const isToday = cell.dateKey === todayKey;
                const isSelected = cell.dateKey === selectedDateKey;

                return (
                  <button
                    key={cell.dateKey}
                    type="button"
                    onClick={() => handleSelectDate(cell.dateKey)}
                    className={`relative overflow-visible ${compact ? "min-h-14 rounded-[13px] px-1 py-1.5" : "min-h-[76px] rounded-2xl px-2 py-1.5"} border text-left transition ${
                      cell.isCurrentMonth
                        ? "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                        : "border-transparent bg-slate-100/70 text-slate-300 hover:border-slate-200"
                    } ${isSelected ? "border-sky-700 shadow-[0_12px_28px_rgba(37,99,235,0.12)]" : ""}`}
                  >
                    {currentItems.length > 0 ? (
                      <span
                        className={`absolute z-2 inline-flex items-center justify-center rounded-full bg-sky-700 text-white shadow-[0_10px_24px_rgba(37,99,235,0.28)] ${
                          compact
                            ? "-right-1 -top-1 min-w-[22px] px-1.5 text-[10px] leading-[22px]"
                            : "-right-1.5 -top-1.5 min-w-[26px] px-1.5 text-[11px] leading-[26px]"
                        } font-semibold`}
                      >
                        {currentItems.length}
                      </span>
                    ) : null}

                    <span
                      className={`inline-flex items-center justify-center rounded-full text-xs font-semibold ${
                        compact ? "h-[22px] w-[22px]" : "h-7 w-7"
                      } ${
                        isToday
                          ? "bg-sky-700 text-white"
                          : cell.isCurrentMonth
                          ? "text-slate-800"
                          : "text-slate-400"
                      }`}
                    >
                      {cell.date.getUTCDate()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <Modal
        className="smartmaps-activity-modal"
        open={isDetailOpen}
        onCancel={() => setIsDetailOpen(false)}
        title={`${detailTitlePrefix} ${formatFullDate(selectedDateKey)}`}
        width={620}
        closeIcon={<CloseOutlined className="text-slate-400" />}
        styles={{
          mask: {
            backdropFilter: "blur(10px)",
            background: "rgba(2, 6, 23, 0.5)",
          },
          container: {
            padding: 0,
            overflow: "hidden",
            borderRadius: 24,
            border: "1px solid var(--border)",
            background: "var(--surface-strong)",
            boxShadow: "0 24px 54px rgba(2, 6, 23, 0.22)",
          },
          header: {
            marginBottom: 0,
            padding: "16px 20px 14px",
            borderBottom: "1px solid var(--border)",
            background: "transparent",
          },
          body: {
            padding: "16px 20px 8px",
            background: "transparent",
          },
          footer: {
            marginTop: 0,
            padding: "12px 20px 16px",
            borderTop: "1px solid var(--border)",
            background: "transparent",
          },
        }}
        footer={[
          actionHref && actionLabel ? (
            <Button key="manage" href={actionHref}>
              {actionLabel}
            </Button>
          ) : null,
          <Button key="close" type="primary" onClick={() => setIsDetailOpen(false)}>
            {closeLabel}
          </Button>,
        ].filter(Boolean)}
      >
        <div className="pb-1">
          {selectedItems.length === 0 ? (
            <div className="smartmaps-empty-panel rounded-[20px] px-4 py-8">
              <Empty
                description={emptyDayLabel}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </div>
          ) : (
            <Space orientation="vertical" size={8} style={{ width: "100%" }}>
              {selectedItems.map((item) => (
                <div
                  key={`${item.id}:${selectedDateKey}`}
                  className="rounded-2xl border px-3.5 py-3"
                  style={{
                    borderColor: "var(--border)",
                    background: "color-mix(in srgb, var(--surface-muted) 82%, transparent)",
                  }}
                >
                  {(() => {
                    const googleMapsUrl = buildActivityMapsUrl(item);

                    return (
                  <Space orientation="vertical" size={6} style={{ width: "100%" }}>
                    <div className="flex flex-wrap gap-1.5">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold ring-1 ${KIND_STYLES[item.kind].pill}`}
                      >
                        <span className={KIND_STYLES[item.kind].dot} />
                        {getDisplayKindLabel(item.kind)}
                      </span>
                      {getDisplayScopeLabel(item) ? (
                        <span
                          className="inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium text-slate-600"
                          style={{
                            borderColor: "var(--border)",
                            background: "var(--surface-strong)",
                          }}
                        >
                          {getDisplayScopeLabel(item)}
                        </span>
                      ) : null}
                    </div>

                    <div>
                      <TypographyText strong style={{ fontSize: 14 }}>
                        {item.title}
                      </TypographyText>
                      {item.description ? (
                        <TypographyParagraph
                          style={{
                            marginTop: 3,
                            marginBottom: 0,
                            color: "#64748b",
                            fontSize: 12,
                            lineHeight: 1.5,
                          }}
                        >
                          {item.description}
                        </TypographyParagraph>
                      ) : null}
                    </div>

                    <Space orientation="vertical" size={3} style={{ width: "100%" }}>
                      <TypographyText style={{ color: "#475569", fontSize: 12 }}>
                        <CalendarOutlined style={{ marginRight: 8 }} />
                        {formatActivityRange(
                          item.startDate,
                          item.endDate,
                          item.timeLabel
                        )}
                      </TypographyText>

                      {item.locationName ? (
                        <TypographyText style={{ color: "#475569", fontSize: 12 }}>
                          <EnvironmentOutlined style={{ marginRight: 8 }} />
                          {item.locationName}
                        </TypographyText>
                      ) : null}

                      {item.addressDetail ? (
                        <TypographyText style={{ color: "#64748b", fontSize: 11.5 }}>
                          {item.addressDetail}
                        </TypographyText>
                      ) : item.locationAddress ? (
                        <TypographyText style={{ color: "#64748b", fontSize: 11.5 }}>
                          {item.locationAddress}
                        </TypographyText>
                      ) : null}

                      {getLocationParts(item).length > 0 ? (
                        <div className="mt-0.5 flex flex-wrap gap-1.5">
                          {getLocationParts(item).map((part) => (
                            <span
                              key={`${item.id}:${selectedDateKey}:${part}`}
                              className="inline-flex rounded-full border border-slate-200 bg-white/85 px-2 py-0.5 text-[10.5px] font-medium text-slate-600"
                            >
                              {part}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </Space>

                    {item.kind === "article" && item.articleSlug ? (
                      <Button
                        type="link"
                        size="small"
                        href={`/artikel/${item.articleSlug}`}
                        style={{ paddingInline: 0, height: "auto" }}
                      >
                        {readArticleLabel}
                      </Button>
                    ) : null}

                    {item.kind === "lab_event" && item.relatedArticleSlug ? (
                      <Button
                        type="link"
                        size="small"
                        href={`/artikel/${item.relatedArticleSlug}`}
                        style={{ paddingInline: 0, height: "auto" }}
                      >
                        {readRelatedArticleLabel}
                      </Button>
                    ) : null}

                    {item.kind === "lab_event" && googleMapsUrl ? (
                      <Button
                        type="link"
                        size="small"
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ paddingInline: 0, height: "auto" }}
                      >
                        {viewMapLabel}
                      </Button>
                    ) : null}
                  </Space>
                    );
                  })()}
                </div>
              ))}

            </Space>
          )}
        </div>
      </Modal>

      {!hideNote ? (
        <TypographyText style={{ color: "#64748b", fontSize: compact ? 10.5 : 11 }}>
          {note}
        </TypographyText>
      ) : null}
    </Space>
  );
}
