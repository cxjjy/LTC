"use client";

import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { SelectOption } from "@/types/common";

export type SearchableSelectOption = SelectOption & {
  keywords?: string[];
  pinyin?: string;
  initials?: string;
  description?: string;
  disabled?: boolean;
};

const EMPTY_OPTIONS: SearchableSelectOption[] = [];

type SearchableSelectProps = {
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options?: SearchableSelectOption[];
  requestUrl?: string;
  searchParamName?: string;
  limit?: number;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  loadingLabel?: string;
  disabled?: boolean;
  clearable?: boolean;
  className?: string;
  dropdownClassName?: string;
  maxVisibleOptions?: number;
};

function normalizeText(value: string | undefined | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFKD");
}

function getLatinInitials(value: string) {
  return normalizeText(value)
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("");
}

function getSearchIndex(option: SearchableSelectOption) {
  const initials = normalizeText(option.initials) || getLatinInitials(option.label);
  const pinyin = normalizeText(option.pinyin);
  const keywords = (option.keywords ?? []).map((item) => normalizeText(item)).filter(Boolean);
  const label = normalizeText(option.label);
  const value = normalizeText(option.value);

  return {
    label,
    value,
    initials,
    pinyin,
    keywords,
    aggregate: [label, value, initials, pinyin, ...keywords].filter(Boolean).join(" ")
  };
}

function isSubsequence(query: string, target: string) {
  if (!query || !target) {
    return false;
  }

  let cursor = 0;
  for (const char of target) {
    if (char === query[cursor]) {
      cursor += 1;
      if (cursor === query.length) {
        return true;
      }
    }
  }

  return false;
}

function scoreOption(query: string, option: SearchableSelectOption) {
  if (!query) {
    return 0;
  }

  const index = getSearchIndex(option);

  if (index.value === query || index.label === query) {
    return 1200;
  }
  if (index.value.startsWith(query)) {
    return 1000;
  }
  if (index.label.startsWith(query)) {
    return 920;
  }
  if (index.initials.startsWith(query)) {
    return 880;
  }
  if (index.pinyin.startsWith(query)) {
    return 840;
  }

  const labelIndex = index.label.indexOf(query);
  if (labelIndex >= 0) {
    return 720 - labelIndex;
  }

  const valueIndex = index.value.indexOf(query);
  if (valueIndex >= 0) {
    return 680 - valueIndex;
  }

  const keywordScore = index.keywords.reduce((best, item) => {
    const keywordIndex = item.indexOf(query);
    return keywordIndex >= 0 ? Math.max(best, 620 - keywordIndex) : best;
  }, -1);
  if (keywordScore > -1) {
    return keywordScore;
  }

  if (isSubsequence(query, index.initials)) {
    return 560;
  }
  if (isSubsequence(query, index.aggregate)) {
    return 420;
  }

  return -1;
}

function parseAsyncOptions(payload: unknown): SearchableSelectOption[] {
  if (Array.isArray(payload)) {
    return payload as SearchableSelectOption[];
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.items)) {
      return record.items as SearchableSelectOption[];
    }
    if (record.data && typeof record.data === "object") {
      const nested = record.data as Record<string, unknown>;
      if (Array.isArray(nested.items)) {
        return nested.items as SearchableSelectOption[];
      }
      if (Array.isArray(record.data)) {
        return record.data as SearchableSelectOption[];
      }
    }
  }

  return [];
}

export function SearchableSelect({
  name,
  value,
  defaultValue,
  onValueChange,
  options = EMPTY_OPTIONS,
  requestUrl,
  searchParamName = "q",
  limit = 20,
  placeholder = "请选择",
  searchPlaceholder = "输入关键词搜索",
  emptyLabel = "无匹配结果",
  loadingLabel = "加载中...",
  disabled = false,
  clearable = true,
  className,
  dropdownClassName,
  maxVisibleOptions = 100
}: SearchableSelectProps) {
  const generatedId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const [asyncOptions, setAsyncOptions] = useState<SearchableSelectOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (requestUrl) {
      setAsyncOptions(options.slice(0, maxVisibleOptions));
    }
  }, [maxVisibleOptions, options, requestUrl]);

  const selectedValue = value ?? internalValue;
  const currentOptions = requestUrl ? asyncOptions : options;
  const selectedOption =
    currentOptions.find((option) => option.value === selectedValue) ??
    options.find((option) => option.value === selectedValue) ??
    asyncOptions.find((option) => option.value === selectedValue);

  const filteredOptions = useMemo(() => {
    if (!deferredQuery) {
      return currentOptions.slice(0, maxVisibleOptions);
    }

    return currentOptions
      .map((option) => ({
        option,
        score: scoreOption(normalizeText(deferredQuery), option)
      }))
      .filter((item) => item.score >= 0)
      .sort((left, right) => right.score - left.score || left.option.label.localeCompare(right.option.label, "zh-CN"))
      .slice(0, maxVisibleOptions)
      .map((item) => item.option);
  }, [currentOptions, deferredQuery, maxVisibleOptions]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        setOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const updateDropdownPosition = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const viewportHeight = window.innerHeight;
      const estimatedHeight = 320;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const shouldOpenUpward = spaceBelow < Math.min(estimatedHeight, 240) && spaceAbove > spaceBelow;

      setDropdownStyle({
        position: "absolute",
        left: rect.left + window.scrollX,
        width: rect.width,
        top: shouldOpenUpward ? rect.top + window.scrollY - 8 : rect.bottom + window.scrollY + 8,
        transform: shouldOpenUpward ? "translateY(-100%)" : undefined,
        zIndex: 9999
      });
    };

    updateDropdownPosition();
    window.addEventListener("resize", updateDropdownPosition);
    window.addEventListener("scroll", updateDropdownPosition, true);

    return () => {
      window.removeEventListener("resize", updateDropdownPosition);
      window.removeEventListener("scroll", updateDropdownPosition, true);
    };
  }, [open]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [deferredQuery, open]);

  useEffect(() => {
    if (!open || !requestUrl) {
      return;
    }

    const controller = new AbortController();
    const search = new URL(requestUrl, window.location.origin);
    search.searchParams.set(searchParamName, deferredQuery);
    search.searchParams.set("limit", String(limit));

    setIsLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(search.toString(), {
          signal: controller.signal,
          credentials: "same-origin"
        });
        if (!response.ok) {
          setAsyncOptions([]);
          return;
        }
        const payload = (await response.json()) as unknown;
        setAsyncOptions(parseAsyncOptions(payload));
      } catch {
        if (!controller.signal.aborted) {
          setAsyncOptions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
      setIsLoading(false);
    };
  }, [deferredQuery, limit, open, requestUrl, searchParamName]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const activeElement = listRef.current?.querySelector<HTMLElement>(`[data-index="${highlightedIndex}"]`);
    activeElement?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex, open]);

  function commitValue(nextValue: string) {
    if (value === undefined) {
      setInternalValue(nextValue);
    }
    onValueChange?.(nextValue);
  }

  function handleSelect(nextValue: string) {
    commitValue(nextValue);
    setOpen(false);
    setQuery("");
  }

  function handleClear() {
    commitValue("");
    setQuery("");
    setOpen(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement | HTMLInputElement>) {
    if (disabled) {
      return;
    }

    if (!open && ["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      setOpen(true);
      return;
    }

    if (!open) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      setQuery("");
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((current) => Math.min(current + 1, Math.max(filteredOptions.length - 1, 0)));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const current = filteredOptions[highlightedIndex];
      if (current && !current.disabled) {
        handleSelect(current.value);
      }
    }
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {name ? <input type="hidden" name={name} value={selectedValue} /> : null}
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-controls={`${generatedId}-listbox`}
        className={cn(
          "control-surface flex min-h-10 w-full items-center justify-between gap-2 rounded-[10px] px-3 text-left text-sm outline-none transition-all",
          disabled && "cursor-not-allowed opacity-60"
        )}
        onClick={() => {
          if (!disabled) {
            setOpen((current) => !current);
          }
        }}
        onKeyDown={handleKeyDown}
      >
        <span className={cn("truncate", selectedOption ? "text-foreground" : "text-muted-foreground")}>
          {selectedOption?.label ?? placeholder}
        </span>
        <span className="flex items-center gap-1">
          {clearable && selectedValue && !disabled ? (
            <span
              role="button"
              tabIndex={-1}
              className="rounded p-1 text-muted-foreground transition hover:bg-[var(--color-hover)] hover:text-foreground"
              onClick={(event) => {
                event.stopPropagation();
                handleClear();
              }}
            >
              <X className="h-4 w-4" />
            </span>
          ) : null}
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition", open && "rotate-180")} />
        </span>
      </button>

      {open && mounted
        ? createPortal(
            <div
              ref={dropdownRef}
              className={cn(
                "surface-card-strong rounded-[14px] border border-border p-2 shadow-[var(--shadow-hover)]",
                dropdownClassName
              )}
              style={dropdownStyle}
            >
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              className="pl-9"
            />
          </div>

          <div
            id={`${generatedId}-listbox`}
            ref={listRef}
            role="listbox"
            className="mt-2 max-h-72 overflow-y-auto rounded-[10px]"
          >
            {isLoading ? (
              <div className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {loadingLabel}
              </div>
            ) : filteredOptions.length ? (
              filteredOptions.map((option, index) => {
                const active = index === highlightedIndex;
                const selected = option.value === selectedValue;

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    data-index={index}
                    aria-selected={selected}
                    disabled={option.disabled}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-[10px] px-3 py-2.5 text-left text-sm transition",
                      active ? "bg-[rgba(59,130,246,0.10)] text-[rgb(29,78,216)]" : "hover:bg-[var(--color-hover)]",
                      option.disabled && "cursor-not-allowed opacity-50"
                    )}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      if (!option.disabled) {
                        handleSelect(option.value);
                      }
                    }}
                    onClick={() => handleSelect(option.value)}
                  >
                    <span className="min-w-0">
                      <span className="block truncate">{option.label}</span>
                      {option.description ? (
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      ) : null}
                    </span>
                    {selected ? <Check className="h-4 w-4 shrink-0" /> : null}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-6 text-sm text-muted-foreground">{emptyLabel}</div>
            )}
          </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
