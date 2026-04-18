"use client";

import * as React from "react";
import { Clock3, X } from "lucide-react";

import { cn } from "@/lib/utils";

type TimePickerType = "time" | "datetime-local";

type TimePickerProps = Omit<React.ComponentProps<"input">, "type"> & {
  pickerType?: TimePickerType;
  placeholder?: string;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatDisplayValue(value: string, pickerType: TimePickerType) {
  if (!value) {
    return "";
  }

  if (pickerType === "datetime-local") {
    const [datePart, timePart = "00:00"] = value.split("T");
    if (!datePart) {
      return value;
    }

    const [year, month, day] = datePart.split("-");
    return `${year}年${month}月${day}日 ${timePart}`;
  }

  return value;
}

function splitDateTimeValue(value: string, pickerType: TimePickerType) {
  if (!value) {
    return {
      datePart: "",
      hour: "09",
      minute: "00"
    };
  }

  if (pickerType === "datetime-local") {
    const [datePart = "", timePart = "09:00"] = value.split("T");
    const [hour = "09", minute = "00"] = timePart.split(":");
    return { datePart, hour, minute };
  }

  const [hour = "09", minute = "00"] = value.split(":");
  return { datePart: "", hour, minute };
}

function composeValue(datePart: string, hour: string, minute: string, pickerType: TimePickerType) {
  if (pickerType === "datetime-local") {
    return datePart ? `${datePart}T${hour}:${minute}` : "";
  }

  return `${hour}:${minute}`;
}

const QUICK_TIMES = ["09:00", "10:00", "14:00", "18:00", "20:00"];
const HOURS = Array.from({ length: 24 }, (_, index) => pad(index));
const MINUTES = ["00", "15", "30", "45"];

export const TimePicker = React.forwardRef<HTMLInputElement, TimePickerProps>(
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
      pickerType = "time",
      placeholder,
      ...props
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false);
    const [selectedValue, setSelectedValue] = React.useState(
      typeof value === "string" ? value : typeof defaultValue === "string" ? defaultValue : ""
    );
    const [{ datePart, hour, minute }, setSelection] = React.useState(() =>
      splitDateTimeValue(
        typeof value === "string" ? value : typeof defaultValue === "string" ? defaultValue : "",
        pickerType
      )
    );
    const rootRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      if (typeof value === "string") {
        setSelectedValue(value);
        setSelection(splitDateTimeValue(value, pickerType));
      }
    }, [pickerType, value]);

    React.useEffect(() => {
      function handlePointerDown(event: MouseEvent) {
        if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
          setOpen(false);
        }
      }

      document.addEventListener("mousedown", handlePointerDown);
      return () => document.removeEventListener("mousedown", handlePointerDown);
    }, []);

    const commitValue = React.useCallback(
      (nextValue: string) => {
        setSelectedValue(nextValue);
        setSelection(splitDateTimeValue(nextValue, pickerType));
        onChange?.({
          target: { name, value: nextValue },
          currentTarget: { name, value: nextValue }
        } as React.ChangeEvent<HTMLInputElement>);
      },
      [name, onChange, pickerType]
    );

    const displayValue = formatDisplayValue(selectedValue, pickerType);
    const resolvedPlaceholder = placeholder ?? (pickerType === "datetime-local" ? "请选择日期和时间" : "请选择时间");

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
              <Clock3 className="h-3.5 w-3.5" />
            </span>
            <span className={cn("truncate", displayValue ? "text-foreground" : "text-muted-foreground")}>
              {displayValue || resolvedPlaceholder}
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

        {open ? (
          <div className="absolute left-0 top-[calc(100%+10px)] z-50 w-[320px] max-w-[calc(100vw-32px)] rounded-[20px] border border-[rgba(209,219,234,0.95)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,248,255,0.98))] p-4 shadow-[0_20px_50px_rgba(15,23,42,0.12),0_8px_20px_rgba(59,130,246,0.10)] backdrop-blur-md">
            <div className="mb-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[rgb(96,165,250)]">Time</p>
              <p className="mt-1 text-lg font-semibold tracking-[-0.03em] text-foreground">
                {displayValue || resolvedPlaceholder}
              </p>
            </div>

            {pickerType === "datetime-local" ? (
              <div className="mb-4">
                <label className="mb-2 block text-xs font-medium text-muted-foreground">日期</label>
                <input
                  type="date"
                  value={datePart}
                  onChange={(event) => {
                    const nextDatePart = event.target.value;
                    setSelection((current) => ({ ...current, datePart: nextDatePart }));
                    commitValue(composeValue(nextDatePart, hour, minute, pickerType));
                  }}
                  className="control-surface flex h-9 w-full rounded-[12px] border border-[rgba(209,219,234,0.9)] bg-white/85 px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(59,130,246,0.18)]"
                />
              </div>
            ) : null}

            <div className="mb-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground">快捷时间</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_TIMES.map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => {
                      const [nextHour, nextMinute] = time.split(":");
                      commitValue(composeValue(datePart, nextHour, nextMinute, pickerType));
                    }}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-sm transition-colors",
                      selectedValue.endsWith(time)
                        ? "bg-[rgba(59,130,246,0.14)] font-medium text-[rgb(37,99,235)]"
                        : "bg-white/75 text-[#475569] hover:bg-[rgba(59,130,246,0.08)] hover:text-[rgb(37,99,235)]"
                    )}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">小时</p>
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-[14px] bg-white/60 p-1">
                  {HOURS.map((hourOption) => (
                    <button
                      key={hourOption}
                      type="button"
                      onClick={() => {
                        setSelection((current) => ({ ...current, hour: hourOption }));
                        commitValue(composeValue(datePart, hourOption, minute, pickerType));
                      }}
                      className={cn(
                        "flex h-9 w-full items-center justify-center rounded-[10px] text-sm transition-colors",
                        hour === hourOption
                          ? "bg-[linear-gradient(135deg,rgb(37,99,235),rgb(96,165,250))] font-semibold text-white shadow-[0_8px_18px_rgba(59,130,246,0.25)]"
                          : "text-foreground hover:bg-[rgba(59,130,246,0.08)] hover:text-[rgb(30,64,175)]"
                      )}
                    >
                      {hourOption}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">分钟</p>
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-[14px] bg-white/60 p-1">
                  {MINUTES.map((minuteOption) => (
                    <button
                      key={minuteOption}
                      type="button"
                      onClick={() => {
                        setSelection((current) => ({ ...current, minute: minuteOption }));
                        commitValue(composeValue(datePart, hour, minuteOption, pickerType));
                      }}
                      className={cn(
                        "flex h-9 w-full items-center justify-center rounded-[10px] text-sm transition-colors",
                        minute === minuteOption
                          ? "bg-[linear-gradient(135deg,rgb(37,99,235),rgb(96,165,250))] font-semibold text-white shadow-[0_8px_18px_rgba(59,130,246,0.25)]"
                          : "text-foreground hover:bg-[rgba(59,130,246,0.08)] hover:text-[rgb(30,64,175)]"
                      )}
                    >
                      {minuteOption}
                    </button>
                  ))}
                </div>
              </div>
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
                onClick={() => setOpen(false)}
                className="rounded-full bg-[rgba(59,130,246,0.10)] px-3 py-1.5 text-sm font-medium text-[rgb(37,99,235)] transition-colors hover:bg-[rgba(59,130,246,0.16)]"
              >
                完成
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }
);

TimePicker.displayName = "TimePicker";
