"use client";

import { CalendarOutlined, EnvironmentOutlined } from "@ant-design/icons";
import { Button, Empty, Space, Typography } from "antd";
import { useMemo } from "react";
import {
  type ActivitySourceItem,
  formatActivityRange,
  getActivityKindLabel,
  getActivityScopeLabel,
  sortActivitySources,
} from "@/lib/activity-calendar";

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
};

function getItemPillClass(kind: ActivitySourceItem["kind"]) {
  if (kind === "libur_nasional") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (kind === "cuti_bersama") {
    return "border-orange-200 bg-orange-50 text-orange-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
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
}: UpcomingActivityListProps) {
  const upcomingItems = useMemo(
    () =>
      sortActivitySources(items)
        .filter((item) => item.kind !== "article" && item.endDate >= todayKey)
        .slice(0, limit),
    [items, limit, todayKey]
  );

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
          {upcomingItems.map((item) => (
            <div
              key={item.id}
              className={`rounded-[14px] border border-slate-200/90 bg-slate-50/65 ${
                compact ? "px-2.5 py-2" : "px-3 py-2.5"
              }`}
            >
              <Space orientation="vertical" size={compact ? 5 : 6} style={{ width: "100%" }}>
                <div className="flex flex-wrap gap-1.5">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${getItemPillClass(item.kind)}`}
                  >
                    {getActivityKindLabel(item.kind)}
                  </span>
                  {getActivityScopeLabel(item) ? (
                    <span className="inline-flex rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                      {getActivityScopeLabel(item)}
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

                  {item.locationAddress ? (
                    <TypographyText style={{ color: "#64748b", fontSize: 11.5 }}>
                      {item.locationAddress}
                    </TypographyText>
                  ) : null}
                </Space>

                {item.labId && onSelectLab ? (
                  <Button
                    type="link"
                    size="small"
                    style={{ paddingInline: 0, height: "auto" }}
                    onClick={() => onSelectLab(item.labId!)}
                  >
                    Lihat di peta
                  </Button>
                ) : null}
              </Space>
            </div>
          ))}
        </Space>
      )}
    </Space>
  );
}
