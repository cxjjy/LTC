import { endOfWeek, format, parseISO, startOfWeek } from "date-fns";

import { badRequest } from "@/lib/errors";

export type NaturalWeekRange = {
  weekStart: Date;
  weekEnd: Date;
};

function withDayBoundary(date: Date, mode: "start" | "end") {
  const value = new Date(date);
  if (mode === "start") {
    value.setHours(0, 0, 0, 0);
  } else {
    value.setHours(23, 59, 59, 999);
  }
  return value;
}

export function getNaturalWeekRange(baseDate = new Date()): NaturalWeekRange {
  return {
    weekStart: withDayBoundary(startOfWeek(baseDate, { weekStartsOn: 1 }), "start"),
    weekEnd: withDayBoundary(endOfWeek(baseDate, { weekStartsOn: 1 }), "end")
  };
}

export function formatWeekKey(date: Date) {
  return format(withDayBoundary(date, "start"), "yyyy-MM-dd");
}

export function toDatabaseDate(date: Date) {
  const day = formatWeekKey(date);
  return new Date(`${day}T00:00:00.000Z`);
}

export function formatWeekLabel(range: NaturalWeekRange) {
  return `${format(range.weekStart, "yyyy-MM-dd")} ~ ${format(range.weekEnd, "yyyy-MM-dd")}`;
}

export function parseWeekStart(input: string) {
  const parsed = parseISO(input);
  if (Number.isNaN(parsed.getTime())) {
    throw badRequest("周报周期格式不正确");
  }

  const range = getNaturalWeekRange(parsed);
  if (formatWeekKey(range.weekStart) !== input) {
    throw badRequest("周报周期必须传自然周周一日期");
  }

  return range;
}

export function normalizeWeekInput(input?: string) {
  if (!input) {
    return getNaturalWeekRange();
  }

  return parseWeekStart(input);
}
