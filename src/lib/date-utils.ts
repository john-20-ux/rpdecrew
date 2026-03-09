import {
  startOfDay, subDays, startOfMonth, startOfQuarter, startOfYear,
  endOfDay, subMonths, subQuarters, subYears, format
} from "date-fns";

export type DatePreset =
  | "today" | "yesterday" | "last7" | "last10" | "last30" | "last90"
  | "lastMonth" | "lastQuarter" | "lastYear" | "ytd" | "mtd" | "qtd" | "custom";

export const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last7: "Last 7 Days",
  last10: "Last 10 Days",
  last30: "Last 30 Days",
  last90: "Last 90 Days",
  lastMonth: "Last Month",
  lastQuarter: "Last Quarter",
  lastYear: "Last Year",
  ytd: "Year to Date",
  mtd: "Month to Date",
  qtd: "Quarter to Date",
  custom: "Custom Range",
};

export interface DateRange {
  from: Date;
  to: Date;
}

export function getDateRange(preset: DatePreset, customRange?: DateRange): DateRange {
  const now = new Date();
  const todayEnd = endOfDay(now);

  switch (preset) {
    case "today":
      return { from: startOfDay(now), to: todayEnd };
    case "yesterday":
      return { from: startOfDay(subDays(now, 1)), to: endOfDay(subDays(now, 1)) };
    case "last7":
      return { from: startOfDay(subDays(now, 6)), to: todayEnd };
    case "last10":
      return { from: startOfDay(subDays(now, 9)), to: todayEnd };
    case "last30":
      return { from: startOfDay(subDays(now, 29)), to: todayEnd };
    case "last90":
      return { from: startOfDay(subDays(now, 89)), to: todayEnd };
    case "lastMonth": {
      const s = startOfMonth(subMonths(now, 1));
      return { from: s, to: endOfDay(subDays(startOfMonth(now), 1)) };
    }
    case "lastQuarter": {
      const s = startOfQuarter(subQuarters(now, 1));
      return { from: s, to: endOfDay(subDays(startOfQuarter(now), 1)) };
    }
    case "lastYear": {
      const s = startOfYear(subYears(now, 1));
      return { from: s, to: endOfDay(subDays(startOfYear(now), 1)) };
    }
    case "ytd":
      return { from: startOfYear(now), to: todayEnd };
    case "mtd":
      return { from: startOfMonth(now), to: todayEnd };
    case "qtd":
      return { from: startOfQuarter(now), to: todayEnd };
    case "custom":
      return customRange ?? { from: startOfDay(subDays(now, 29)), to: todayEnd };
  }
}

export function getPreviousPeriodRange(range: DateRange): DateRange {
  const durationMs = range.to.getTime() - range.from.getTime();
  return {
    from: new Date(range.from.getTime() - durationMs),
    to: new Date(range.from.getTime() - 1),
  };
}

export function formatDateShort(date: Date): string {
  return format(date, "MMM d");
}
