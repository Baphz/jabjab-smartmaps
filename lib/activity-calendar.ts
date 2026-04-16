import type { LabCityTypeValue, LabVillageTypeValue } from "@/lib/lab-address";

export const INDONESIA_LOCALE = "id-ID";
export const INDONESIA_TIME_ZONE = "Asia/Jakarta";

export const CALENDAR_WEEKDAY_LABELS = [
  "Sen",
  "Sel",
  "Rab",
  "Kam",
  "Jum",
  "Sab",
  "Min",
] as const;

export type ActivityKind = "lab_event" | "article" | "libur_nasional" | "cuti_bersama";

export type ActivitySourceItem = {
  id: string;
  kind: ActivityKind;
  isGlobal: boolean;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  timeLabel: string | null;
  labId: string | null;
  labName: string | null;
  locationName: string | null;
  locationAddress: string | null;
  addressDetail?: string | null;
  provinceName?: string | null;
  cityName?: string | null;
  cityType?: LabCityTypeValue | null;
  districtName?: string | null;
  villageName?: string | null;
  villageType?: LabVillageTypeValue | null;
  eventLatitude: number | null;
  eventLongitude: number | null;
  articleSlug?: string | null;
  relatedArticleSlug?: string | null;
  relatedArticleTitle?: string | null;
  coverImageUrl?: string | null;
};

export type ActivityDayItem = ActivitySourceItem & {
  key: string;
  dateKey: string;
  isStart: boolean;
  isEnd: boolean;
};

export type MonthCell = {
  date: Date;
  dateKey: string;
  isCurrentMonth: boolean;
};

function getIndonesiaDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: INDONESIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  ) as Record<"year" | "month" | "day", string>;

  return values;
}

export function parseDateKey(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (Number.isNaN(date.getTime())) return null;

  return date;
}

export function formatDateKey(value: Date | string) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim();
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const { year, month, day } = getIndonesiaDateParts(date);

  return `${year}-${month}-${day}`;
}

export function parseMonthKey(value: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const date = new Date(Date.UTC(year, month - 1, 1));

  if (Number.isNaN(date.getTime())) return null;

  return date;
}

export function formatMonthKey(value: Date | string) {
  if (typeof value === "string" && /^\d{4}-\d{2}$/.test(value.trim())) {
    return value.trim();
  }

  const date =
    typeof value === "string"
      ? parseDateKey(`${value.trim()}-01`) ?? new Date(value)
      : value;

  if (Number.isNaN(date.getTime())) return "";

  return formatDateKey(date).slice(0, 7);
}

export function addDaysUtc(dateKey: string, days: number) {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return "";

  const next = new Date(
    Date.UTC(
      parsed.getUTCFullYear(),
      parsed.getUTCMonth(),
      parsed.getUTCDate() + days
    )
  );

  return formatDateKey(next);
}

export function addMonthsUtc(date: Date, value: number) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + value, 1)
  );
}

export function buildDateRangeKeys(startDate: string, endDate: string) {
  if (!startDate || !endDate || startDate > endDate) return [] as string[];

  const keys: string[] = [];
  let cursor = startDate;

  while (cursor && cursor <= endDate) {
    keys.push(cursor);
    cursor = addDaysUtc(cursor, 1);
  }

  return keys;
}

export function buildMonthCells(monthStart: Date) {
  const monthKey = formatMonthKey(monthStart);
  const year = monthStart.getUTCFullYear();
  const month = monthStart.getUTCMonth();
  const firstDay = new Date(Date.UTC(year, month, 1));
  const offset = (firstDay.getUTCDay() + 6) % 7;
  const gridStart = new Date(Date.UTC(year, month, 1 - offset));

  return Array.from({ length: 42 }, (_, index): MonthCell => {
    const date = new Date(
      Date.UTC(
        gridStart.getUTCFullYear(),
        gridStart.getUTCMonth(),
        gridStart.getUTCDate() + index
      )
    );
    const dateKey = formatDateKey(date);

    return {
      date,
      dateKey,
      isCurrentMonth: isSameMonth(dateKey, monthKey),
    };
  });
}

export function isSameMonth(dateKey: string, monthKey: string) {
  return dateKey.slice(0, 7) === monthKey;
}

export function expandActivitySources(items: ActivitySourceItem[]) {
  const dayItems: ActivityDayItem[] = [];

  for (const item of items) {
    const startDate = item.startDate;
    const endDate = item.endDate || item.startDate;
    const dates = buildDateRangeKeys(startDate, endDate);

    for (const dateKey of dates) {
      dayItems.push({
        ...item,
        key: `${item.id}:${dateKey}`,
        dateKey,
        isStart: dateKey === startDate,
        isEnd: dateKey === endDate,
      });
    }
  }

  return dayItems.sort((a, b) => {
    if (a.dateKey !== b.dateKey) {
      return a.dateKey.localeCompare(b.dateKey);
    }

    return a.title.localeCompare(b.title, "id");
  });
}

export function sortActivitySources(items: ActivitySourceItem[]) {
  return [...items].sort((a, b) => {
    if (a.startDate !== b.startDate) {
      return a.startDate.localeCompare(b.startDate);
    }

    const aLab = a.labName ?? "";
    const bLab = b.labName ?? "";
    if (aLab !== bLab) {
      return aLab.localeCompare(bLab, "id");
    }

    return a.title.localeCompare(b.title, "id");
  });
}

export function formatMonthTitle(monthKey: string) {
  const monthDate = parseMonthKey(monthKey);
  if (!monthDate) return monthKey;

  return new Intl.DateTimeFormat(INDONESIA_LOCALE, {
    month: "long",
    year: "numeric",
    timeZone: INDONESIA_TIME_ZONE,
  }).format(monthDate);
}

export function formatFullDate(dateKey: string) {
  const date = parseDateKey(dateKey);
  if (!date) return dateKey;

  return new Intl.DateTimeFormat(INDONESIA_LOCALE, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: INDONESIA_TIME_ZONE,
  }).format(date);
}

export function formatCompactDate(dateKey: string) {
  const date = parseDateKey(dateKey);
  if (!date) return dateKey;

  return new Intl.DateTimeFormat(INDONESIA_LOCALE, {
    day: "2-digit",
    month: "short",
    timeZone: INDONESIA_TIME_ZONE,
  }).format(date);
}

export function formatMediumDate(dateKey: string) {
  const date = parseDateKey(dateKey);
  if (!date) return dateKey;

  return new Intl.DateTimeFormat(INDONESIA_LOCALE, {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: INDONESIA_TIME_ZONE,
  }).format(date);
}

export function formatDateTimeInIndonesia(
  value: Date | string,
  options: Intl.DateTimeFormatOptions
) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return typeof value === "string" ? value : "";
  }

  return new Intl.DateTimeFormat(INDONESIA_LOCALE, {
    ...options,
    timeZone: INDONESIA_TIME_ZONE,
  }).format(date);
}

export function getCurrentIndonesiaYear() {
  return Number(getIndonesiaDateParts(new Date()).year);
}

export function formatActivityRange(
  startDate: string,
  endDate: string,
  timeLabel?: string | null
) {
  const base =
    startDate === endDate
      ? formatMediumDate(startDate)
      : `${formatCompactDate(startDate)} - ${formatMediumDate(endDate)}`;

  return timeLabel?.trim() ? `${base} • ${timeLabel.trim()}` : base;
}

export function getActivityKindLabel(kind: ActivityKind) {
  if (kind === "article") return "Artikel";
  if (kind === "libur_nasional") return "Libur Nasional";
  if (kind === "cuti_bersama") return "Cuti Bersama";
  return "Agenda Lab";
}

export function getActivityScopeLabel(item: Pick<ActivitySourceItem, "kind" | "isGlobal" | "labName">) {
  if (item.kind === "article") {
    if (item.isGlobal) return "Artikel DPW";
    return item.labName;
  }

  if (item.kind !== "lab_event") return null;
  if (item.isGlobal) return "Agenda DPW";
  return item.labName;
}

export function getActivityKindColor(kind: ActivityKind) {
  if (kind === "article") return "blue";
  if (kind === "libur_nasional") return "red";
  if (kind === "cuti_bersama") return "gold";
  return "cyan";
}
