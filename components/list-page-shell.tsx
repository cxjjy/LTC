"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ArrowUpDown, ChevronDown, Columns3, Download, Filter, Plus, RotateCcw, Search, X } from "lucide-react";

import { DataTable, type DataColumn } from "@/components/data-table";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useListQueryState } from "@/lib/use-list-query-state";
import { cn } from "@/lib/utils";
import type { ListFilters, ListHeaderTabItem, ListPageConfig, ListSortOrder } from "@/types/list";

type ListPageShellProps<T extends Record<string, unknown>> = {
  config: ListPageConfig;
  data: T[];
  exportRows?: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  tabs?: ListHeaderTabItem[];
  canCreate?: boolean;
};

function formatCsvValue(value: unknown) {
  const text = String(value ?? "").replace(/"/g, '""');
  return `"${text}"`;
}

function exportRowsAsCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: DataColumn[],
  exportFileName: string
) {
  const today = new Date();
  const filename = `${exportFileName}-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate()
  ).padStart(2, "0")}.csv`;
  const header = columns.map((column) => formatCsvValue(column.header)).join(",");
  const body = rows
    .map((row) => columns.map((column) => formatCsvValue(row[column.key])).join(","))
    .join("\n");
  const csv = `\ufeff${header}\n${body}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function buildFilterSchema(config: ListPageConfig) {
  return z.object(
    Object.fromEntries(
      config.filterFields.map((field) => [
        field.name,
        field.type === "number"
          ? z
              .string()
              .optional()
              .refine((value) => !value || !Number.isNaN(Number(value)), `${field.label}请输入数字`)
          : z.string().optional()
      ])
    )
  );
}

function ListHeaderTabs({ tabs }: { tabs: ListHeaderTabItem[] }) {
  return (
    <div className="flex items-center gap-7 border-b border-[rgba(229,231,235,0.9)] px-6">
      {tabs.map((tab) => (
        <Link
          key={tab.label}
          href={tab.href}
          scroll={false}
          className={cn(
            "inline-flex h-12 items-center border-b-2 border-transparent text-sm font-medium text-muted-foreground transition-colors",
            tab.active && "workspace-tab-active"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

function ListMenu({
  icon: Icon,
  label,
  variant = "toolbar",
  children
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  variant?: "toolbar" | "action" | "outline" | "ghost";
  children: React.ReactNode;
}) {
  return (
    <details className="relative">
      <summary
        className={cn(
          buttonVariants({ variant, size: "default" }),
          "list-none cursor-pointer select-none [&::-webkit-details-marker]:hidden"
        )}
      >
        <Icon className="h-4 w-4" />
        {label}
        <ChevronDown className="h-4 w-4" />
      </summary>
      <div className="surface-card-strong absolute right-0 top-[calc(100%+8px)] z-30 min-w-[220px] rounded-[12px] p-2 shadow-[var(--shadow-hover)]">
        {children}
      </div>
    </details>
  );
}

export function ColumnSelector({
  columns,
  visibleColumnKeys,
  onToggle,
  onReset,
  triggerVariant = "toolbar"
}: {
  columns: DataColumn[];
  visibleColumnKeys: string[];
  onToggle: (key: string) => void;
  onReset: () => void;
  triggerVariant?: "toolbar" | "action" | "outline" | "ghost";
}) {
  return (
    <ListMenu icon={Columns3} label="显示列" variant={triggerVariant}>
      <div className="space-y-1">
        {columns.map((column) => {
          const checked = visibleColumnKeys.includes(column.key);

          return (
            <label
              key={column.key}
              className="flex cursor-pointer items-center justify-between rounded-[10px] px-3 py-2 text-sm text-foreground transition hover:bg-[var(--color-hover)]"
            >
              <span>{column.header}</span>
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--color-primary)]"
                checked={checked}
                onChange={() => onToggle(column.key)}
              />
            </label>
          );
        })}
      </div>
      <div className="mt-2 border-t border-border px-2 pt-2">
        <button
          type="button"
          className="w-full rounded-[10px] px-3 py-2 text-left text-sm text-muted-foreground transition hover:bg-[var(--color-hover)] hover:text-foreground"
          onClick={onReset}
        >
          恢复默认
        </button>
      </div>
    </ListMenu>
  );
}

export function SortSelector({
  currentSortBy,
  currentSortOrder,
  sortOptions,
  onApply,
  triggerVariant = "toolbar"
}: {
  currentSortBy: string;
  currentSortOrder: ListSortOrder;
  sortOptions: ListPageConfig["sortOptions"];
  onApply: (sortBy: string, sortOrder: ListSortOrder) => void;
  triggerVariant?: "toolbar" | "action" | "outline" | "ghost";
}) {
  const [sortBy, setSortBy] = useState(currentSortBy);
  const [sortOrder, setSortOrder] = useState<ListSortOrder>(currentSortOrder);

  useEffect(() => {
    setSortBy(currentSortBy);
    setSortOrder(currentSortOrder);
  }, [currentSortBy, currentSortOrder]);

  return (
    <ListMenu icon={ArrowUpDown} label="排序" variant={triggerVariant}>
      <div className="space-y-3 p-2">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">排序字段</Label>
          <SearchableSelect
            value={sortBy}
            onValueChange={setSortBy}
            options={sortOptions}
            placeholder="请选择排序字段"
            searchPlaceholder="搜索排序字段"
            clearable={false}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={sortOrder === "asc" ? "default" : "outline"}
            onClick={() => setSortOrder("asc")}
          >
            升序
          </Button>
          <Button
            type="button"
            variant={sortOrder === "desc" ? "default" : "outline"}
            onClick={() => setSortOrder("desc")}
          >
            降序
          </Button>
        </div>
        <Button type="button" className="w-full" onClick={() => onApply(sortBy, sortOrder)}>
          应用排序
        </Button>
      </div>
    </ListMenu>
  );
}

export function ExportAction<T extends Record<string, unknown>>({
  rows,
  columns,
  exportFileName
}: {
  rows: T[];
  columns: DataColumn[];
  exportFileName: string;
}) {
  return (
    <Button
      variant="action"
      type="button"
      onClick={() => exportRowsAsCsv(rows, columns, exportFileName)}
    >
      <Download className="h-4 w-4" />
      导出
    </Button>
  );
}

export function ListPrimaryActions<T extends Record<string, unknown>>({
  config,
  canCreate = true,
  visibleColumns,
  rows
}: {
  config: ListPageConfig;
  canCreate?: boolean;
  visibleColumns: DataColumn[];
  rows: T[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {canCreate && config.createLabel && config.createHref ? (
        <Button asChild className="h-9 rounded-[10px] px-4 font-medium">
          <Link href={config.createHref}>
            <Plus className="h-4 w-4" />
            {config.createLabel}
          </Link>
        </Button>
      ) : null}
      <ExportAction rows={rows} columns={visibleColumns} exportFileName={config.exportFileName} />
    </div>
  );
}

function FilterDialog({
  config,
  initialFilters,
  activeCount,
  onApply,
  onReset
}: {
  config: ListPageConfig;
  initialFilters: ListFilters;
  activeCount: number;
  onApply: (filters: ListFilters) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const filterSchema = useMemo(() => buildFilterSchema(config), [config]);
  const form = useForm<z.infer<typeof filterSchema>>({
    resolver: zodResolver(filterSchema),
    defaultValues: Object.fromEntries(config.filterFields.map((field) => [field.name, initialFilters[field.name] ?? ""]))
  });

  useEffect(() => {
    form.reset(
      Object.fromEntries(config.filterFields.map((field) => [field.name, initialFilters[field.name] ?? ""]))
    );
  }, [config.filterFields, form, initialFilters]);

  return (
    <>
      <Button variant="toolbar" type="button" onClick={() => setOpen(true)}>
        <Filter className="h-4 w-4" />
        筛选
        {activeCount ? <span className="text-[var(--color-primary)]">({activeCount})</span> : null}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[min(92vw,760px)] rounded-[18px]">
          <DialogHeader>
            <DialogTitle>筛选{config.moduleLabel}</DialogTitle>
            <DialogDescription>按模块条件组合筛选，应用后会同步到页面链接。</DialogDescription>
          </DialogHeader>
          <form
            className="mt-6 space-y-6"
            onSubmit={form.handleSubmit((values) => {
              const filters = Object.fromEntries(
                Object.entries(values).filter(([, value]) => typeof value === "string" && value.trim() !== "")
              ) as ListFilters;
              onApply(filters);
              setOpen(false);
            })}
          >
            <div className="grid gap-4 md:grid-cols-2">
              {config.filterFields.map((field) => {
                const error = form.formState.errors[field.name]?.message as string | undefined;
                return (
                  <div key={field.name} className="space-y-2">
                    <Label htmlFor={`filter-${field.name}`}>{field.label}</Label>
                    {field.type === "select" ? (
                      <SearchableSelect
                        value={String(form.watch(field.name) ?? "")}
                        onValueChange={(value) => form.setValue(field.name, value, { shouldValidate: true })}
                        options={field.options ?? []}
                        placeholder={`全部${field.label}`}
                        searchPlaceholder={`搜索${field.label}`}
                      />
                    ) : (
                      <Input
                        id={`filter-${field.name}`}
                        type={field.type}
                        placeholder={field.placeholder}
                        {...form.register(field.name)}
                      />
                    )}
                    {error ? <p className="text-xs text-[rgb(185,28,28)]">{error}</p> : null}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset(Object.fromEntries(config.filterFields.map((field) => [field.name, ""])));
                  onReset();
                  setOpen(false);
                }}
              >
                重置
              </Button>
              <Button type="submit">应用筛选</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ListToolbar({
  config,
  query,
  searchDraft,
  setSearchDraft,
  onSubmitSearch,
  onClearSearch,
  onApplyFilters,
  onResetFilters,
  onApplySort,
  onResetAll,
  onToggleColumn,
  onResetColumns,
  visibleColumnKeys,
  isPending
}: {
  config: ListPageConfig;
  query: {
    q: string;
    filters: ListFilters;
    sortBy: string;
    sortOrder: ListSortOrder;
  };
  searchDraft: string;
  setSearchDraft: (value: string) => void;
  onSubmitSearch: () => void;
  onClearSearch: () => void;
  onApplyFilters: (filters: ListFilters) => void;
  onResetFilters: () => void;
  onApplySort: (sortBy: string, sortOrder: ListSortOrder) => void;
  onResetAll: () => void;
  onToggleColumn: (key: string) => void;
  onResetColumns: () => void;
  visibleColumnKeys: string[];
  isPending: boolean;
}) {
  const activeFilterCount = Object.keys(query.filters).length;

  return (
    <div className="flex flex-1 flex-wrap items-center justify-end gap-2.5">
      <div className="relative w-[420px] min-w-[320px] max-w-full">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchDraft}
          onChange={(event) => setSearchDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSubmitSearch();
            }
          }}
          placeholder={config.searchPlaceholder}
          className="h-11 pl-10 pr-9 text-[15px]"
        />
        {searchDraft ? (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
            onClick={onClearSearch}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <FilterDialog
        config={config}
        initialFilters={query.filters}
        activeCount={activeFilterCount}
        onApply={onApplyFilters}
        onReset={onResetFilters}
      />

      <ColumnSelector
        columns={config.columns}
        visibleColumnKeys={visibleColumnKeys}
        onToggle={onToggleColumn}
        onReset={onResetColumns}
      />

      <SortSelector
        currentSortBy={query.sortBy}
        currentSortOrder={query.sortOrder}
        sortOptions={config.sortOptions}
        onApply={onApplySort}
      />

      <Button variant="toolbar" type="button" onClick={onResetAll} disabled={isPending}>
        <RotateCcw className={cn("h-4 w-4", isPending && "animate-spin")} />
        {isPending ? "重置中" : "重置"}
      </Button>
    </div>
  );
}

export function GenericDataTable<T extends Record<string, unknown>>({
  columns,
  data,
  emptyText
}: {
  columns: DataColumn[];
  data: T[];
  emptyText?: string;
}) {
  return <DataTable columns={columns} data={data} emptyLabel={emptyText} />;
}

export function ListPagination({
  total,
  page,
  pageSize,
  totalPages,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange
}: {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  pageSizeOptions: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3 px-5 py-3.5 md:flex-row md:items-center md:justify-between">
      <p className="text-sm text-muted-foreground">
        共 {total} 条，第 {page} / {totalPages} 页
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            上一页
          </Button>
          <div className="inline-flex h-8 min-w-8 items-center justify-center rounded-[8px] bg-[var(--color-primary)] px-2 text-sm font-semibold text-white">
            {page}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            下一页
          </Button>
        </div>

        <div className="w-[140px]">
          <SearchableSelect
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
            options={pageSizeOptions.map((option) => ({
              value: String(option),
              label: `每页 ${option} 条`
            }))}
            placeholder="每页条数"
            searchPlaceholder="搜索页大小"
            clearable={false}
          />
        </div>
      </div>
    </div>
  );
}

export function ListPageShell<T extends Record<string, unknown>>({
  config,
  data,
  exportRows,
  total,
  page,
  pageSize,
  totalPages,
  tabs = [],
  canCreate = true
}: ListPageShellProps<T>) {
  const {
    query,
    searchDraft,
    setSearchDraft,
    isPending,
    submitSearch,
    clearSearch,
    applyFilters,
    resetFilters,
    setSort,
    goToPage,
    setPageSize,
    resetAll
  } = useListQueryState({
    defaultSortBy: config.defaultSort.sortBy,
    defaultSortOrder: config.defaultSort.sortOrder
  });
  const [visibleColumnKeys, setVisibleColumnKeys] = useState(config.columns.map((column) => column.key));
  const storageKey = `ltc:list-columns:${config.moduleKey}`;

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved) as string[];
      if (Array.isArray(parsed) && parsed.length) {
        setVisibleColumnKeys(parsed);
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(visibleColumnKeys));
  }, [storageKey, visibleColumnKeys]);

  const visibleColumns = useMemo(() => {
    const filtered = config.columns.filter((column) => visibleColumnKeys.includes(column.key));
    const baseColumns = filtered.length ? filtered : [config.columns[0]];
    return [...baseColumns, { key: "__actions", header: "操作", type: "actions" as const }];
  }, [config.columns, visibleColumnKeys]);
  const exportableColumns = useMemo(
    () => visibleColumns.filter((column) => column.type !== "actions"),
    [visibleColumns]
  );

  function toggleColumn(key: string) {
    setVisibleColumnKeys((current) => {
      if (current.includes(key)) {
        return current.length > 1 ? current.filter((item) => item !== key) : current;
      }

      return [...current, key];
    });
  }

  function resetColumns() {
    setVisibleColumnKeys(config.columns.map((column) => column.key));
  }

  return (
    <section className="workspace-panel overflow-hidden">
      {tabs.length ? <ListHeaderTabs tabs={tabs} /> : null}
      <div className="flex flex-col gap-4 px-6 py-4 xl:flex-row xl:items-center xl:justify-between">
        <ListPrimaryActions
          config={config}
          canCreate={canCreate}
          visibleColumns={exportableColumns}
          rows={exportRows ?? data}
        />
        <ListToolbar
          config={config}
          query={query}
          searchDraft={searchDraft}
          setSearchDraft={setSearchDraft}
          onSubmitSearch={submitSearch}
          onClearSearch={clearSearch}
          onApplyFilters={applyFilters}
          onResetFilters={resetFilters}
          onApplySort={setSort}
          onResetAll={resetAll}
          onToggleColumn={toggleColumn}
          onResetColumns={resetColumns}
          visibleColumnKeys={visibleColumnKeys}
          isPending={isPending}
        />
      </div>
      <div className="workspace-panel-section">
        <div className="min-h-[380px]">
          <GenericDataTable columns={visibleColumns} data={data} emptyText={config.emptyText} />
        </div>
        <div className="workspace-panel-section">
          <ListPagination
            total={total}
            page={page}
            pageSize={pageSize}
            totalPages={totalPages}
            pageSizeOptions={config.pageSizeOptions ?? [10, 20, 50]}
            onPageChange={goToPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>
    </section>
  );
}
