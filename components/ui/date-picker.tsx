"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek
} from "date-fns";
import { zhCN } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";

import { cn } from "@/lib/utils";

type DatePickerProps = Omit<React.ComponentProps<"input">, "type"> & {
  placeholder?: string;
};

function parseDateValue(value?: string | number | readonly string[] | null) {
  if (typeof value !== "string" || !value) {
    return null;
  }

  try {
    const parsed = parseISO(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
}

function buildCalendarDays(month: Date) {
  const start = startOfWeek(startOfMonth(month), { locale: zhCN });
  const end = endOfWeek(endOfMonth(month), { locale: zhCN });
  const days: Date[] = [];

  for (let cursor = start; cursor <= end; cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)) {
    days.push(cursor);
  }

  return days;
}

export const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  (
    {
      className,
      id,
      name,
      value,
      defaultValue,
      onChange,
      onBlur,
      disabled,
      required,
      placeholder = "请选择日期",
      ...props
    },
    ref
  ) => {
    const initialDate = React.useMemo(
      () => parseDateValue((value as string | undefined) ?? (defaultValue as string | undefined) ?? ""),
      [defaultValue, value]
    );
    const [open, setOpen] = React.useState(false);
    const [mounted, setMounted] = React.useState(false);
    const [selectedValue, setSelectedValue] = React.useState(
      typeof value === "string" ? value : typeof defaultValue === "string" ? defaultValue : ""
    );
    const [visibleMonth, setVisibleMonth] = React.useState(initialDate ?? new Date());
    const rootRef = React.useRef<HTMLDivElement>(null);
    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const [dropdownStyle, setDropdownStyle] = React.useState<React.CSSProperties>({});

    React.useEffect(() => {
      setMounted(true);
      return () => setMounted(false);
    }, []);

    React.useEffect(() => {
      if (typeof value === "string") {
        setSelectedValue(value);
        const parsed = parseDateValue(value);
        if (parsed) {
          setVisibleMonth(parsed);
        }
      }
    }, [value]);

    React.useEffect(() => {
      function handlePointerDown(event: MouseEvent) {
        const target = event.target as Node;
        if (rootRef.current?.contains(target) || dropdownRef.current?.contains(target)) {
          return;
        }
        if (rootRef.current) {
          setOpen(false);
        }
      }

      document.addEventListener("mousedown", handlePointerDown);
      return () => document.removeEventListener("mousedown", handlePointerDown);
    }, []);

    React.useEffect(() => {
      if (!open || !triggerRef.current || !mounted) {
        return;
      }

      function updatePosition() {
        const rect = triggerRef.current?.getBoundingClientRect();
        if (!rect) {
          return;
        }

        const width = Math.min(320, window.innerWidth - 32);
        const left = Math.min(rect.left, window.innerWidth - width - 16);
        setDropdownStyle({
          position: "fixed",
          top: rect.bottom + 10,
          left: Math.max(16, left),
          width,
          zIndex: 120
        });
      }

      updatePosition();
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);
      return () => {
        window.removeEventListener("resize", updatePosition);
        window.removeEventListener("scroll", updatePosition, true);
      };
    }, [mounted, open]);

    const selectedDate = parseDateValue(selectedValue);
    const calendarDays = React.useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);

    const commitValue = React.useCallback(
      (nextValue: string) => {
        setSelectedValue(nextValue);
        const parsed = parseDateValue(nextValue);
        if (parsed) {
          setVisibleMonth(parsed);
        }
        onChange?.({
          target: { name, value: nextValue },
          currentTarget: { name, value: nextValue }
        } as React.ChangeEvent<HTMLInputElement>);
      },
      [name, onChange]
    );

    return (
      <div className={cn("relative", className)} ref={rootRef}>
        <input
          {...props}
          ref={ref}
          id={id}
          name={name}
          type="hidden"
          value={selectedValue}
          onChange={() => undefined}
          onBlur={onBlur}
          disabled={disabled}
          required={required}
        />
        <button
          ref={triggerRef}
          type="button"
          aria-expanded={open}
          aria-haspopup="dialog"
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
          className={cn(
            "control-surface group flex h-9 w-full items-center justify-between rounded-[12px] border border-[rgba(209,219,234,0.9)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,255,0.94))] px-3 text-left text-sm tracking-[-0.01em] text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_24px_rgba(59,130,246,0.05)] transition-all duration-150 hover:border-[rgba(96,165,250,0.45)] hover:shadow-[0_1px_2px_rgba(15,23,42,0.05),0_12px_30px_rgba(59,130,246,0.09)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(59,130,246,0.18)] disabled:cursor-not-allowed disabled:opacity-50",
            open && "border-[rgba(59,130,246,0.52)] ring-2 ring-[rgba(59,130,246,0.14)]"
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[rgba(59,130,246,0.10)] text-[rgb(37,99,235)] transition-colors group-hover:bg-[rgba(59,130,246,0.14)]">
              <CalendarDays className="h-3.5 w-3.5" />
            </span>
            <span className={cn("truncate", selectedDate ? "text-foreground" : "text-muted-foreground")}>
              {selectedDate ? format(selectedDate, "yyyy年MM月dd日", { locale: zhCN }) : placeholder}
            </span>
          </span>
          {selectedValue ? (
            <span
              role="button"
              tabIndex={-1}
              onClick={(event) => {
                event.stopPropagation();
                commitValue("");
              }}
              className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[rgba(148,163,184,0.12)] hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          ) : (
            <span className="text-xs font-medium text-[rgb(37,99,235)]/80">选择</span>
          )}
        </button>

        {open && mounted
          ? createPortal(
              <div
                ref={dropdownRef}
                className="rounded-[20px] border border-[rgba(209,219,234,0.95)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,248,255,0.98))] p-4 shadow-[0_20px_50px_rgba(15,23,42,0.12),0_8px_20px_rgba(59,130,246,0.10)] backdrop-blur-md"
                style={dropdownStyle}
              >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-[rgb(96,165,250)]">Calendar</p>
                <p className="mt-1 text-lg font-semibold tracking-[-0.03em] text-foreground">
                  {format(visibleMonth, "yyyy年MM月", { locale: zhCN })}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setVisibleMonth((current) => addMonths(current, -1))}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/80 text-[#475569] transition-colors hover:border-[rgba(96,165,250,0.4)] hover:text-[rgb(37,99,235)]"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/80 text-[#475569] transition-colors hover:border-[rgba(96,165,250,0.4)] hover:text-[rgb(37,99,235)]"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mb-2 grid grid-cols-7 gap-1">
              {["日", "一", "二", "三", "四", "五", "六"].map((day) => (
                <div key={day} className="flex h-9 items-center justify-center text-xs font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const isCurrentMonth = isSameMonth(day, visibleMonth);
                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => {
                      commitValue(format(day, "yyyy-MM-dd"));
                      setOpen(false);
                    }}
                    className={cn(
                      "relative flex h-10 items-center justify-center rounded-[12px] text-sm transition-all duration-150",
                      isCurrentMonth ? "text-foreground" : "text-muted-foreground/45",
                      !isSelected && "hover:bg-[rgba(59,130,246,0.08)] hover:text-[rgb(30,64,175)]",
                      isSelected &&
                        "bg-[linear-gradient(135deg,rgb(37,99,235),rgb(96,165,250))] font-semibold text-white shadow-[0_8px_18px_rgba(59,130,246,0.35)]"
                    )}
                  >
                    {isToday(day) && !isSelected ? (
                      <span className="absolute inset-x-2 top-1 h-1 rounded-full bg-[rgba(59,130,246,0.45)]" />
                    ) : null}
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-[rgba(226,232,240,0.9)] pt-3">
              <button
                type="button"
                onClick={() => {
                  commitValue("");
                  setOpen(false);
                }}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                清除
              </button>
              <button
                type="button"
                onClick={() => {
                  const today = format(new Date(), "yyyy-MM-dd");
                  commitValue(today);
                  setOpen(false);
                }}
                className="rounded-full bg-[rgba(59,130,246,0.10)] px-3 py-1.5 text-sm font-medium text-[rgb(37,99,235)] transition-colors hover:bg-[rgba(59,130,246,0.16)]"
              >
                今天
              </button>
            </div>
          </div>,
              document.body
            )
          : null}
      </div>
    );
  }
);

DatePicker.displayName = "DatePicker";
