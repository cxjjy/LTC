import { type ClassValue, clsx } from "clsx";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date?: Date | string | null, pattern = "yyyy-MM-dd") {
  if (!date) {
    return "-";
  }

  const value = typeof date === "string" ? new Date(date) : date;
  return format(value, pattern, { locale: zhCN });
}

export function formatDateTime(date?: Date | string | null) {
  return formatDate(date, "yyyy-MM-dd HH:mm");
}

export function toDateInputValue(date?: Date | string | null) {
  if (!date) {
    return "";
  }

  const value = typeof date === "string" ? new Date(date) : date;
  return format(value, "yyyy-MM-dd");
}

export function formatCurrency(value?: number | string | null) {
  return `¥${Number(value ?? 0).toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

export function safeJsonParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
