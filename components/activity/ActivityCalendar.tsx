"use client";

import {
  CalendarOutlined,
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
  onSelectLab?: (labId: string) => void;
  onSelectActivityLocation?: (item: ActivitySourceItem) => void;
};

const KIND_STYLES: Record<
  ActivityKind,
  {
    cell: string;
    pill: string;
    dot: string;
  }
> = {
  lab_event: {
    cell: "border-emerald-200 bg-emerald-50 text-emerald-700",
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  article: {
    cell: "border-sky-200 bg-sky-50 text-sky-700",
    pill: "bg-sky-50 text-sky-700 ring-sky-200",
    dot: "bg-sky-500",
  },
  libur_nasional: {
    cell: "border-red-200 bg-red-50 text-red-700",
    pill: "bg-red-50 text-red-700 ring-red-200",
    dot: "bg-red-500",
  },
  cuti_bersama: {
    cell: "border-orange-200 bg-orange-50 text-orange-700",
    pill: "bg-orange-50 text-orange-700 ring-orange-200",
    dot: "bg-orange-500",
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
  onSelectLab,
  onSelectActivityLocation,
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
      }
      setIsDetailOpen(true);
      return;
    }

    setSelectedDateKey(dateKey);

    if (firstMappableActivity && onSelectActivityLocation) {
      onSelectActivityLocation(firstMappableActivity);
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
              Agenda Lab
            </div>
            <div className="mt-1 text-base font-semibold tracking-tight text-slate-900">
              {counts.lab_event}
            </div>
          </div>

          <div className="rounded-[14px] border border-slate-200 bg-slate-50 px-2.5 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Artikel
            </div>
            <div className="mt-1 text-base font-semibold tracking-tight text-slate-900">
              {counts.article}
            </div>
          </div>

          <div className="rounded-[14px] border border-slate-200 bg-slate-50 px-2.5 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Libur Nasional
            </div>
            <div className="mt-1 text-base font-semibold tracking-tight text-slate-900">
              {counts.libur_nasional}
            </div>
          </div>

          <div className="rounded-[14px] border border-slate-200 bg-slate-50 px-2.5 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Cuti Bersama
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
              Hari Ini
            </Button>
          </Space>
        </div>

        <div className={`flex flex-wrap gap-2 ${compact ? "mt-2.5" : "mt-4"}`}>
          {(["lab_event", "article", "libur_nasional", "cuti_bersama"] as const).map((kind) => (
            <span
              key={kind}
              className={`inline-flex items-center gap-2 rounded-full font-semibold ring-1 ${compact ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs"} ${KIND_STYLES[kind].pill}`}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${KIND_STYLES[kind].dot}`} />
              {getActivityKindLabel(kind)}
            </span>
          ))}
        </div>

        <div className={`${compact ? "mt-2" : "mt-2.5"}`}>
          <div className={compact ? "w-full" : "min-w-[720px]"}>
            <div className={`grid grid-cols-7 ${compact ? "gap-1.5" : "gap-2"}`}>
              {CALENDAR_WEEKDAY_LABELS.map((label) => (
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
        open={isDetailOpen}
        onCancel={() => setIsDetailOpen(false)}
        title={`Detail ${formatFullDate(selectedDateKey)}`}
        width={620}
        footer={[
          actionHref && actionLabel ? (
            <Button key="manage" href={actionHref}>
              {actionLabel}
            </Button>
          ) : null,
          <Button key="close" type="primary" onClick={() => setIsDetailOpen(false)}>
            Tutup
          </Button>,
        ].filter(Boolean)}
      >
        <div className="pb-1">
          {selectedItems.length === 0 ? (
            <div className="smartmaps-empty-panel rounded-[20px] px-4 py-8">
              <Empty
                description="Belum ada item."
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </div>
          ) : (
            <Space orientation="vertical" size={8} style={{ width: "100%" }}>
              {selectedItems.map((item) => (
                <div
                  key={`${item.id}:${selectedDateKey}`}
                  className="rounded-[14px] border border-slate-200 bg-slate-50/70 px-3 py-2.5"
                >
                  <Space orientation="vertical" size={6} style={{ width: "100%" }}>
                    <div className="flex flex-wrap gap-1.5">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${KIND_STYLES[item.kind].cell}`}
                      >
                        {getActivityKindLabel(item.kind)}
                      </span>
                      {getActivityScopeLabel(item) ? (
                        <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
                          {getActivityScopeLabel(item)}
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

                      {item.locationAddress ? (
                        <TypographyText style={{ color: "#64748b", fontSize: 11.5 }}>
                          {item.locationAddress}
                        </TypographyText>
                      ) : null}
                    </Space>

                    {item.kind === "article" && item.articleSlug ? (
                      <Button
                        type="link"
                        size="small"
                        href={`/artikel/${item.articleSlug}`}
                        style={{ paddingInline: 0, height: "auto" }}
                      >
                        Baca artikel
                      </Button>
                    ) : null}

                    {item.kind === "lab_event" &&
                    (onSelectActivityLocation || (item.labId && onSelectLab)) ? (
                      <Button
                        type="link"
                        size="small"
                        style={{ paddingInline: 0, height: "auto" }}
                        onClick={() => {
                          if (onSelectActivityLocation) {
                            onSelectActivityLocation(item);
                          } else if (item.labId && onSelectLab) {
                            onSelectLab(item.labId);
                          }
                          setIsDetailOpen(false);
                        }}
                      >
                        Lihat di peta
                      </Button>
                    ) : null}
                  </Space>
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
