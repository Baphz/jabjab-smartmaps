"use client";

import { CalendarOutlined, EnvironmentOutlined } from "@ant-design/icons";
import { Button, Empty, Space, Typography } from "antd";
import { useMemo } from "react";
import {
  type ActivityKind,
  type ActivitySourceItem,
  formatActivityRange,
  getActivityKindLabel,
  getActivityScopeLabel,
  sortActivitySources,
} from "@/lib/activity-calendar";
import { buildAdministrativeAddressParts } from "@/lib/lab-address";

const { Paragraph: TypographyParagraph, Text: TypographyText, Title: TypographyTitle } = Typography;

type UpcomingActivityListProps = {
  items: ActivitySourceItem[];
  title: string;
  description: string;
  todayKey: string;
  compact?: boolean;
  limit?: number;
  emptyMessage?: string;
  actionHref?: string;
  actionLabel?: string;
  onSelectLab?: (labId: string) => void;
  kindLabels?: Partial<Record<ActivityKind, string>>;
  globalArticleScopeLabel?: string;
  globalAgendaScopeLabel?: string;
  viewMapLabel?: string;
};

function getItemPillClass(kind: ActivitySourceItem["kind"]) {
  if (kind === "libur_nasional") {
    return {
      pill: "smartmaps-calendar-kind-pill smartmaps-calendar-kind-pill-holiday",
      dot: "smartmaps-calendar-kind-dot smartmaps-calendar-kind-dot-holiday",
    };
  }

  if (kind === "cuti_bersama") {
    return {
      pill: "smartmaps-calendar-kind-pill smartmaps-calendar-kind-pill-leave",
      dot: "smartmaps-calendar-kind-dot smartmaps-calendar-kind-dot-leave",
    };
  }

  if (kind === "article") {
    return {
      pill: "smartmaps-calendar-kind-pill smartmaps-calendar-kind-pill-article",
      dot: "smartmaps-calendar-kind-dot smartmaps-calendar-kind-dot-article",
    };
  }

  return {
    pill: "smartmaps-calendar-kind-pill smartmaps-calendar-kind-pill-event",
    dot: "smartmaps-calendar-kind-dot smartmaps-calendar-kind-dot-event",
  };
}

export default function UpcomingActivityList({
  items,
  title,
  description,
  todayKey,
  compact = false,
  limit = 6,
  emptyMessage = "Belum ada agenda.",
  actionHref,
  actionLabel,
  onSelectLab,
  kindLabels,
  globalArticleScopeLabel,
  globalAgendaScopeLabel,
  viewMapLabel = "Lihat di peta",
}: UpcomingActivityListProps) {
  const upcomingItems = useMemo(
    () =>
      sortActivitySources(items)
        .filter((item) => item.kind !== "article" && item.endDate >= todayKey)
        .slice(0, limit),
    [items, limit, todayKey]
  );

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

      {upcomingItems.length === 0 ? (
        <div
          className={`smartmaps-empty-panel rounded-[14px] ${
            compact ? "px-3 py-4" : "px-3 py-5"
          }`}
        >
          <Empty description={emptyMessage} image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      ) : (
        <Space orientation="vertical" size={compact ? 6 : 8} style={{ width: "100%" }}>
          {upcomingItems.map((item) => {
            const kindPill = getItemPillClass(item.kind);

            return (
              <div
                key={item.id}
                className={`rounded-[14px] border border-slate-200/90 bg-slate-50/65 ${
                  compact ? "px-2.5 py-2" : "px-3 py-2.5"
                }`}
              >
                <Space orientation="vertical" size={compact ? 5 : 6} style={{ width: "100%" }}>
                  <div className="flex flex-wrap gap-1.5">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold ring-1 ${kindPill.pill}`}
                    >
                      <span className={kindPill.dot} />
                      {getDisplayKindLabel(item.kind)}
                    </span>
                    {getDisplayScopeLabel(item) ? (
                      <span className="inline-flex rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                        {getDisplayScopeLabel(item)}
                      </span>
                    ) : null}
                  </div>

                <div>
                  <TypographyText strong style={{ fontSize: compact ? 13 : 14 }}>
                    {item.title}
                  </TypographyText>
                  {item.description ? (
                    <TypographyParagraph
                      ellipsis={{ rows: compact ? 1 : 2 }}
                      style={{
                        marginTop: 3,
                        marginBottom: 0,
                        color: "#64748b",
                        fontSize: compact ? 11.5 : 12,
                        lineHeight: compact ? 1.45 : 1.5,
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
                          key={`${item.id}:${part}`}
                          className="inline-flex rounded-full border border-slate-200 bg-white/85 px-2 py-0.5 text-[10.5px] font-medium text-slate-600"
                        >
                          {part}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </Space>

                  {item.labId && onSelectLab ? (
                    <Button
                      type="link"
                      size="small"
                      style={{ paddingInline: 0, height: "auto" }}
                      onClick={() => onSelectLab(item.labId!)}
                    >
                      {viewMapLabel}
                    </Button>
                  ) : null}
                </Space>
              </div>
            );
          })}
        </Space>
      )}
    </Space>
  );
}
