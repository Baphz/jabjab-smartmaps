import "server-only";

import type { HolidayType, MasterHoliday, Prisma, LabEvent } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ActivitySourceItem, formatDateKey } from "@/lib/activity-calendar";

export type ActivityQueryArgs = {
  labId?: string | null;
  onlyPublished?: boolean;
  includeInactiveHolidays?: boolean;
  rangeStart?: Date;
  rangeEnd?: Date;
};

export function buildDefaultActivityRange() {
  const now = new Date();
  const currentYear = now.getUTCFullYear();

  return {
    rangeStart: new Date(Date.UTC(currentYear, 0, 1)),
    rangeEnd: new Date(Date.UTC(currentYear + 1, 11, 31)),
  };
}

export function normalizeText(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

export function normalizeOptionalText(value: unknown) {
  const normalized = normalizeText(value);
  return normalized || null;
}

export function normalizeDateInput(value: unknown) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(`${trimmed}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function normalizeDateKeyInput(value: unknown) {
  const date = normalizeDateInput(value);
  return date ? formatDateKey(date) : null;
}

export function dateKeyToUtcDate(dateKey: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;

  const date = new Date(`${dateKey}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function mapHolidayTypeToKind(type: HolidayType): ActivitySourceItem["kind"] {
  if (type === "CUTI_BERSAMA") return "cuti_bersama";
  return "libur_nasional";
}

export function mapLabEventToActivitySource(
  event: LabEvent & { lab: { id: string; name: string } | null }
): ActivitySourceItem {
  return {
    id: event.id,
    kind: "lab_event",
    isGlobal: event.isGlobal,
    title: event.title,
    description: event.description,
    startDate: formatDateKey(event.startDate),
    endDate: formatDateKey(event.endDate),
    timeLabel: event.timeLabel,
    labId: event.isGlobal ? null : event.lab?.id ?? null,
    labName: event.isGlobal ? "Agenda Global DPW" : event.lab?.name ?? null,
    locationName: event.locationName,
    locationAddress: event.locationAddress,
    eventLatitude: event.latitude ?? null,
    eventLongitude: event.longitude ?? null,
  };
}

export function mapHolidayToActivitySource(
  holiday: Pick<MasterHoliday, "id" | "date" | "name" | "type">
): ActivitySourceItem {
  const dateKey = formatDateKey(holiday.date);

  return {
    id: holiday.id,
    kind: mapHolidayTypeToKind(holiday.type),
    isGlobal: false,
    title: holiday.name,
    description: null,
    startDate: dateKey,
    endDate: dateKey,
    timeLabel: null,
    labId: null,
    labName: null,
    locationName: null,
    locationAddress: null,
    eventLatitude: null,
    eventLongitude: null,
  };
}

export async function getActivitySources(args: ActivityQueryArgs = {}) {
  const defaultRange = buildDefaultActivityRange();
  const rangeStart = args.rangeStart ?? defaultRange.rangeStart;
  const rangeEnd = args.rangeEnd ?? defaultRange.rangeEnd;

  const labWhere: Prisma.LabEventWhereInput = {
    endDate: {
      gte: rangeStart,
    },
    startDate: {
      lte: rangeEnd,
    },
  };

  if (args.onlyPublished) {
    labWhere.isPublished = true;
  }

  if (args.labId) {
    labWhere.OR = [{ labId: args.labId }, { isGlobal: true }];
  }

  const holidayWhere: Prisma.MasterHolidayWhereInput = {
    date: {
      gte: rangeStart,
      lte: rangeEnd,
    },
  };

  if (!args.includeInactiveHolidays) {
    holidayWhere.isActive = true;
  }

  const [events, holidays] = await Promise.all([
    prisma.labEvent.findMany({
      where: labWhere,
      include: {
        lab: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ startDate: "asc" }, { title: "asc" }],
    }),
    prisma.masterHoliday.findMany({
      where: holidayWhere,
      orderBy: [{ date: "asc" }, { name: "asc" }],
    }),
  ]);

  return {
    events,
    holidays,
    sources: [
      ...events.map(mapLabEventToActivitySource),
      ...holidays.map(mapHolidayToActivitySource),
    ],
  };
}
