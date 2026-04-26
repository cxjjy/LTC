"use client";

import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpDown,
  Banknote,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  Columns3,
  Download,
  Eye,
  Landmark,
  Maximize2,
  Minimize2,
  PanelRightOpen,
  Rows3,
  Search,
  SlidersHorizontal,
  TrendingUp,
  WalletCards,
  X
} from "lucide-react";

import { ListPagination } from "@/components/list-page-shell";
import { useShellLayout } from "@/components/layout/shell-context";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useListQueryState } from "@/lib/use-list-query-state";
import { buildListHref } from "@/lib/pagination";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { ProjectOverviewListResult, ProjectOverviewRecord, ProjectOverviewSummary } from "@/modules/projects/overview/types";
import type { ListSortOrder } from "@/types/list";

type ProjectOverviewClientProps = {
  result: ProjectOverviewListResult;
};

type ColumnDefinition = {
  key: string;
  header: string;
  group: string;
  width: number;
  align?: "left" | "right" | "center";
};

type TagTone = "green" | "blue" | "orange" | "purple" | "gray" | "yellow" | "red";
type DensityMode = "comfortable" | "standard" | "compact";
type OpenPopover = "sort" | "density" | "columns" | null;

type DensityTokens = {
  groupHeadHeight: string;
  secondHeadTop: string;
  columnHeadHeight: string;
  rowHeight: string;
  cellPadding: string;
  cellText: string;
  badge: string;
  badgeMinWidth: string;
  progressTrack: string;
  progressText: string;
  projectSubText: string;
  toolbarButton: string;
  searchInput: string;
};

const columns: ColumnDefinition[] = [
  { key: "projectName", header: "项目名称", group: "项目名称", width: 290 },
  { key: "customerName", header: "客户名称", group: "项目基础信息", width: 152 },
  { key: "deliveryMode", header: "交付模式", group: "项目基础信息", width: 118, align: "center" },
  { key: "projectStatus", header: "项目状态", group: "项目基础信息", width: 116, align: "center" },
  { key: "owner", header: "项目负责人", group: "项目基础信息", width: 124 },
  { key: "region", header: "所属区域", group: "项目基础信息", width: 112, align: "center" },
  { key: "contractStatus", header: "合同状态", group: "合同信息", width: 152, align: "center" },
  { key: "contractSignedAt", header: "合同签回日期", group: "合同信息", width: 120 },
  { key: "contractAmount", header: "合同总额", group: "合同信息", width: 150, align: "right" },
  { key: "projectProgressText", header: "项目进展（周度更新）", group: "项目进展", width: 260 },
  { key: "projectProgressPercent", header: "项目进度", group: "项目进展", width: 156, align: "center" },
  { key: "repaymentDate", header: "回款日期", group: "回款与资金结构", width: 120 },
  { key: "receivedAmount", header: "已回款金额", group: "回款与资金结构", width: 150, align: "right" },
  { key: "receivableAmount", header: "应收款金额", group: "回款与资金结构", width: 150, align: "right" },
  { key: "repaymentPercent", header: "回款进度（%）", group: "回款与资金结构", width: 156, align: "center" },
  { key: "expectedRepaymentDate", header: "预计回款日期", group: "回款与资金结构", width: 126, align: "center" },
  { key: "totalCost", header: "项目总成本", group: "成本与利润结构", width: 148, align: "right" },
  { key: "paidCost", header: "已付成本", group: "成本与利润结构", width: 144, align: "right" },
  { key: "payableCost", header: "待支付成本", group: "成本与利润结构", width: 150, align: "right" },
  { key: "projectProfit", header: "项目利润", group: "成本与利润结构", width: 146, align: "right" },
  { key: "profitRate", header: "利润率", group: "成本与利润结构", width: 110, align: "right" },
  { key: "businessAmount", header: "商机金额", group: "商机与商务字段", width: 148, align: "right" },
  { key: "businessStage", header: "商机阶段", group: "商机与商务字段", width: 126, align: "center" },
  { key: "expectedSignDate", header: "预计签约日期", group: "商机与商务字段", width: 120 }
];

const sortOptions = [
  { label: "合同签回日期", value: "contractSignedAt" },
  { label: "应收款金额", value: "receivableAmount" },
  { label: "项目利润", value: "projectProfit" },
  { label: "利润率", value: "profitRate" }
];

const groupOrder = [
  "项目名称",
  "项目基础信息",
  "合同信息",
  "项目进展",
  "回款与资金结构",
  "成本与利润结构",
  "商机与商务字段"
];

const defaultVisibleColumnKeys = [
  "projectName",
  "customerName",
  "projectStatus",
  "owner",
  "contractStatus",
  "contractAmount",
  "receivedAmount",
  "repaymentPercent",
  "projectProfit",
  "profitRate"
];

const densityTokens: Record<DensityMode, DensityTokens> = {
  comfortable: {
    groupHeadHeight: "h-11",
    secondHeadTop: "top-[44px]",
    columnHeadHeight: "h-10",
    rowHeight: "h-[58px]",
    cellPadding: "px-4 py-3",
    cellText: "text-[13px]",
    badge: "h-7 text-[11px] px-2.5",
    badgeMinWidth: "min-w-[74px]",
    progressTrack: "h-2.5 w-24",
    progressText: "text-xs",
    projectSubText: "text-xs",
    toolbarButton: "h-10 rounded-[10px]",
    searchInput: "h-10 rounded-[10px] text-[14px]"
  },
  standard: {
    groupHeadHeight: "h-10",
    secondHeadTop: "top-[40px]",
    columnHeadHeight: "h-9",
    rowHeight: "h-[52px]",
    cellPadding: "px-3 py-2.5",
    cellText: "text-[13px]",
    badge: "h-6 text-[11px] px-2.5",
    badgeMinWidth: "min-w-[70px]",
    progressTrack: "h-2.5 w-24",
    progressText: "text-xs",
    projectSubText: "text-xs",
    toolbarButton: "h-9 rounded-[10px]",
    searchInput: "h-9 rounded-[10px] text-[14px]"
  },
  compact: {
    groupHeadHeight: "h-9",
    secondHeadTop: "top-[36px]",
    columnHeadHeight: "h-8",
    rowHeight: "h-[46px]",
    cellPadding: "px-2.5 py-2",
    cellText: "text-[12px]",
    badge: "h-5 text-[10px] px-2",
    badgeMinWidth: "min-w-[62px]",
    progressTrack: "h-2 w-20",
    progressText: "text-[11px]",
    projectSubText: "text-[11px]",
    toolbarButton: "h-8 rounded-[9px] px-3 text-[13px]",
    searchInput: "h-8 rounded-[9px] text-[13px]"
  }
};

const densityOptions: Array<{ value: DensityMode; label: string }> = [
  { value: "comfortable", label: "舒适" },
  { value: "standard", label: "标准" },
  { value: "compact", label: "紧凑" }
];

const columnStorageKey = "ltc:project-overview:columns:v2";
const densityStorageKey = "ltc:project-overview:density:v1";

function buildHref(pathname: string, params?: Record<string, string | Record<string, string> | undefined>) {
  const search = new URLSearchParams();

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (!value) {
      return;
    }

    search.set(key, typeof value === "string" ? value : JSON.stringify(value));
  });

  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function projectStatusListHref(status: string) {
  return buildListHref("/projects", {
    filters: { status }
  });
}

function overviewFilterHref(filters: Record<string, string>, extra?: Record<string, string>) {
  return buildHref("/dashboard/projects/overview", {
    ...extra,
    filters
  });
}

function projectPaymentsHref(projectId: string) {
  return `/projects/${projectId}/payments`;
}

function clickableClassName(className?: string) {
  return cn(
    "cursor-pointer rounded-[8px] transition hover:text-[var(--color-primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(59,130,246,0.35)]",
    className
  );
}

function exportRowsAsCsv(rows: ProjectOverviewRecord[], visibleColumns: ColumnDefinition[]) {
  const filename = `project-overview-${new Date().toISOString().slice(0, 10)}.csv`;
  const header = visibleColumns.map((column) => `"${column.header}"`).join(",");
  const body = rows
    .map((row) =>
      visibleColumns
        .map((column) => {
          const value = row[column.key as keyof ProjectOverviewRecord];
          const text =
            typeof value === "number"
              ? column.key.includes("Amount") || column.key.includes("Cost") || column.key.includes("Profit")
                ? formatCurrency(value)
                : String(value)
              : String(value ?? "");
          return `"${text.replace(/"/g, '""')}"`;
        })
        .join(",")
    )
    .join("\n");
  const blob = new Blob([`\ufeff${header}\n${body}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function getTagTone(value: string): TagTone {
  if (["进行中", "90天内"].includes(value)) {
    return "green";
  }
  if (["合同已签回", "华东区", "华北区", "华南区", "西南区", "西北区", "东北区", "全国", "自交付"].includes(value)) {
    return "blue";
  }
  if (["合同待签回-交付中", "180天内"].includes(value)) {
    return "orange";
  }
  if (["商机阶段50%", "商机阶段30%"].includes(value)) {
    return "purple";
  }
  if (["未开始", "60天内", "未设置"].includes(value)) {
    return "gray";
  }
  if (["暂停", "整体转包"].includes(value)) {
    return "yellow";
  }
  if (["联合交付"].includes(value)) {
    return "green";
  }
  if (["180天以上", "风险"].includes(value)) {
    return "red";
  }
  return "gray";
}

function toneClassName(tone: TagTone) {
  switch (tone) {
    case "green":
      return "border-[rgba(34,197,94,0.14)] bg-[rgba(34,197,94,0.08)] text-[rgb(21,128,61)]";
    case "blue":
      return "border-[rgba(59,130,246,0.14)] bg-[rgba(59,130,246,0.08)] text-[rgb(37,99,235)]";
    case "orange":
      return "border-[rgba(249,115,22,0.14)] bg-[rgba(249,115,22,0.10)] text-[rgb(194,65,12)]";
    case "purple":
      return "border-[rgba(168,85,247,0.14)] bg-[rgba(168,85,247,0.10)] text-[rgb(126,34,206)]";
    case "yellow":
      return "border-[rgba(234,179,8,0.16)] bg-[rgba(234,179,8,0.10)] text-[rgb(161,98,7)]";
    case "red":
      return "border-[rgba(239,68,68,0.14)] bg-[rgba(239,68,68,0.08)] text-[rgb(185,28,28)]";
    default:
      return "border-[rgba(203,213,225,0.9)] bg-[rgba(241,245,249,0.92)] text-[rgb(100,116,139)]";
  }
}

function UnifiedTag({ value, density }: { value: string; density: DensityTokens }) {
  return (
    <Badge
      variant="muted"
      className={cn(density.badge, density.badgeMinWidth, "justify-center", toneClassName(getTagTone(value)))}
    >
      {value}
    </Badge>
  );
}

function ProgressBar({ value, tone, density }: { value: number; tone: "project" | "repayment"; density: DensityTokens }) {
  const percent = Math.max(0, Math.min(100, value));
  const barColor =
    tone === "project"
      ? "bg-[rgb(59,130,246)]"
      : percent <= 30
        ? "bg-[rgb(239,68,68)]"
        : percent <= 70
          ? "bg-[rgb(245,158,11)]"
          : "bg-[rgb(37,99,235)]";

  return (
    <div className="flex items-center justify-center gap-2">
      <div className={cn("overflow-hidden rounded-full bg-[rgba(226,232,240,0.75)]", density.progressTrack)}>
        <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${percent}%` }} />
      </div>
      <span className={cn("min-w-[38px] text-right font-medium tabular-nums text-muted-foreground", density.progressText)}>
        {percent.toFixed(0)}%
      </span>
    </div>
  );
}

function FilterDialog({
  open,
  onOpenChange,
  options,
  initialFilters,
  onApply,
  onReset
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: ProjectOverviewListResult["filterOptions"];
  initialFilters: Record<string, string>;
  onApply: (filters: Record<string, string>) => void;
  onReset: () => void;
}) {
  const [draft, setDraft] = useState(initialFilters);

  useEffect(() => {
    setDraft(initialFilters);
  }, [initialFilters]);

  const fields = [
    { key: "customerName", label: "客户名称", options: options.customers },
    { key: "projectStatus", label: "项目状态", options: options.projectStatuses },
    { key: "owner", label: "项目负责人", options: options.owners },
    { key: "region", label: "所属区域", options: options.regions },
    { key: "contractStatus", label: "合同状态", options: options.contractStatuses },
    { key: "deliveryMode", label: "交付模式", options: options.deliveryModes }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(92vw,760px)] rounded-[18px] border-[var(--color-border-subtle)]">
        <DialogHeader>
          <DialogTitle>筛选项目经营视图</DialogTitle>
          <DialogDescription>按客户、状态、负责人、区域与合同/交付条件组合筛选。</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2 md:grid-cols-2">
          {fields.map((field) => (
            <div key={field.key} className="space-y-2">
              <div className="text-sm font-medium text-foreground">{field.label}</div>
              <SearchableSelect
                value={draft[field.key] ?? ""}
                onValueChange={(value) => setDraft((current) => ({ ...current, [field.key]: value }))}
                options={field.options}
                placeholder={`全部${field.label}`}
                searchPlaceholder={`搜索${field.label}`}
              />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-[var(--color-border-subtle)] pt-4">
          <Button
            variant="ghost"
            type="button"
            onClick={() => {
              setDraft({});
              onReset();
              onOpenChange(false);
            }}
          >
            重置
          </Button>
          <Button
            type="button"
            onClick={() => {
              onApply(Object.fromEntries(Object.entries(draft).filter(([, value]) => value)));
              onOpenChange(false);
            }}
          >
            应用筛选
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function OverviewSummaryStrip({ summary }: { summary: ProjectOverviewSummary }) {
  const items = [
    { label: "项目数", value: `${summary.projectCount} 个`, hint: "经营项目总览", icon: BriefcaseBusiness, tone: "neutral", href: "/projects" },
    { label: "合同总额", value: formatCurrency(summary.contractTotal), hint: "已签回合同口径", icon: Landmark, tone: "neutral", href: "/contracts?sortBy=contractAmount&sortOrder=desc" },
    { label: "已回款", value: formatCurrency(summary.receivedTotal), hint: "真实回款累计", icon: Banknote, tone: "neutral", href: buildListHref("/receivables", { filters: { status: "RECEIVED" } }) },
    { label: "应收总额", value: formatCurrency(summary.receivableTotal), hint: "待跟进回款规模", icon: WalletCards, tone: "neutral", href: "/receivables?sortBy=amountDue&sortOrder=desc" },
    { label: "总利润", value: formatCurrency(summary.profitTotal), hint: "项目利润合计", icon: TrendingUp, tone: "success", href: overviewFilterHref({}, { sortBy: "projectProfit", sortOrder: "desc" }) },
    { label: "高风险项目", value: `${summary.highRiskProjectCount} 个`, hint: "需优先关注", icon: AlertTriangle, tone: "danger", href: overviewFilterHref({ riskLevel: "high" }) }
  ];

  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">
      {items.map((item) => {
        const Icon = item.icon;
        const isSuccess = item.tone === "success";
        const isDanger = item.tone === "danger";

        return (
          <Link
            key={item.label}
            href={item.href}
            title="点击查看详情"
            className="surface-card relative min-w-0 cursor-pointer overflow-hidden rounded-[12px] border border-[var(--color-border-subtle)] bg-white px-4 py-3 transition hover:-translate-y-0.5 hover:border-[rgba(59,130,246,0.32)] hover:shadow-[var(--shadow-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(59,130,246,0.35)]"
          >
            <div
              className={cn(
                "absolute inset-y-3 left-0 w-1 rounded-r-full bg-[rgba(148,163,184,0.45)]",
                isSuccess && "bg-[var(--color-success)]",
                isDanger && "bg-[var(--color-danger)]"
              )}
            />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-medium text-[#64748b]">{item.label}</div>
                <div
                  className={cn(
                    "mt-1 truncate text-[18px] font-semibold tracking-[-0.03em] text-foreground",
                    isSuccess && "text-[rgb(4,120,87)]",
                    isDanger && "text-[rgb(185,28,28)]"
                  )}
                >
                  {item.value}
                </div>
                <div className="mt-1 truncate text-[11px] text-muted-foreground">{item.hint}</div>
              </div>
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-[var(--color-border-subtle)] bg-[rgba(248,250,252,0.9)] text-[#64748b]",
                  isSuccess && "border-[rgba(16,185,129,0.18)] bg-[rgba(16,185,129,0.08)] text-[rgb(4,120,87)]",
                  isDanger && "border-[rgba(239,68,68,0.18)] bg-[rgba(239,68,68,0.08)] text-[rgb(185,28,28)]"
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
            </div>
          </Link>
        );
      })}
    </section>
  );
}

function DataCell({
  column,
  row,
  onOpenDetail,
  density
}: {
  column: ColumnDefinition;
  row: ProjectOverviewRecord;
  onOpenDetail: (row: ProjectOverviewRecord) => void;
  density: DensityTokens;
}) {
  if (column.key === "projectName") {
    return (
      <div className="space-y-1">
        <Link
          href={`/projects/${row.id}`}
          title="点击查看详情"
          className={clickableClassName("block truncate font-semibold text-foreground underline-offset-4")}
        >
          {row.projectName}
        </Link>
        <div className={cn("truncate text-muted-foreground", density.projectSubText)}>{row.customerName}</div>
      </div>
    );
  }

  if (column.key === "projectStatus") {
    return (
      <Link href={projectStatusListHref(row.projectStatusKey)} title="点击查看详情" className="inline-flex">
        <UnifiedTag value={row.projectStatus} density={density} />
      </Link>
    );
  }

  if (["deliveryMode", "projectStatus", "region", "contractStatus", "expectedRepaymentDate", "businessStage"].includes(column.key)) {
    return <UnifiedTag value={String(row[column.key as keyof ProjectOverviewRecord] ?? "-")} density={density} />;
  }

  if (column.key === "projectProgressText") {
    return (
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1 truncate text-left text-[#374151]" title={row.projectProgressText}>
          {row.projectProgressText}
        </div>
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-1 rounded-[8px] px-2 py-1 text-[11px] text-[rgb(37,99,235)] transition hover:bg-[rgba(59,130,246,0.08)]"
          onClick={() => onOpenDetail(row)}
        >
          <Eye className="h-3.5 w-3.5" />
          查看
        </button>
      </div>
    );
  }

  if (column.key === "projectProgressPercent") {
    return <ProgressBar value={row.projectProgressPercent} tone="project" density={density} />;
  }

  if (column.key === "repaymentPercent") {
    return (
      <Link href={projectPaymentsHref(row.id)} title="点击查看详情" className="inline-flex cursor-pointer rounded-[8px] px-1 py-1 transition hover:bg-[rgba(59,130,246,0.08)]">
        <ProgressBar value={row.repaymentPercent} tone="repayment" density={density} />
      </Link>
    );
  }

  if (column.key === "receivedAmount") {
    return (
      <Link href={projectPaymentsHref(row.id)} title="点击查看详情" className={clickableClassName("inline-block font-medium tabular-nums underline-offset-4")}>
        {formatCurrency(row.receivedAmount)}
      </Link>
    );
  }

  if (column.key === "contractAmount") {
    if (!row.contractId) {
      return <span className="font-medium tabular-nums">{formatCurrency(row.contractAmount)}</span>;
    }

    return (
      <Link href={`/contracts/${row.contractId}`} title="点击查看详情" className={clickableClassName("inline-block font-medium tabular-nums underline-offset-4")}>
        {formatCurrency(row.contractAmount)}
      </Link>
    );
  }

  if (["contractAmount", "receivedAmount", "receivableAmount", "totalCost", "paidCost", "payableCost", "projectProfit", "businessAmount"].includes(column.key)) {
    return <span className="font-medium tabular-nums">{formatCurrency(row[column.key as keyof ProjectOverviewRecord] as number)}</span>;
  }

  if (column.key === "profitRate") {
    return <span className="font-medium tabular-nums">{row.profitRate.toFixed(1)}%</span>;
  }

  if (column.key === "contractSignedAt") {
    return formatDate(row.contractSignedAt, "yyyy-MM");
  }

  if (column.key === "repaymentDate") {
    return formatDate(row.repaymentDate);
  }

  if (column.key === "expectedSignDate") {
    return formatDate(row.expectedSignDate);
  }

  return String(row[column.key as keyof ProjectOverviewRecord] ?? "-");
}

function SortDropdown({
  open,
  currentSortBy,
  currentSortOrder,
  onToggle,
  onApply,
  buttonClassName
}: {
  open: boolean;
  currentSortBy: string;
  currentSortOrder: ListSortOrder;
  onToggle: () => void;
  onApply: (sortBy: string, sortOrder: ListSortOrder) => void;
  buttonClassName: string;
}) {
  const [sortBy, setSortBy] = useState(currentSortBy);
  const [sortOrder, setSortOrder] = useState<ListSortOrder>(currentSortOrder);

  useEffect(() => {
    setSortBy(currentSortBy);
    setSortOrder(currentSortOrder);
  }, [currentSortBy, currentSortOrder]);

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        className={buttonClassName}
        aria-expanded={open}
        onClick={onToggle}
      >
        <ArrowUpDown className="h-4 w-4" />
        排序
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </Button>
      {open ? (
        <div className="surface-card-strong absolute right-0 top-[calc(100%+8px)] z-30 w-[240px] rounded-[12px] p-2 shadow-[var(--shadow-hover)]">
          <div className="space-y-1">
            {sortOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={cn(
                  "flex w-full items-center justify-between rounded-[10px] px-3 py-2 text-left text-sm transition hover:bg-[var(--color-hover)]",
                  sortBy === option.value ? "bg-[var(--color-primary-soft)] text-[rgb(29,78,216)]" : "text-foreground"
                )}
                onClick={() => setSortBy(option.value)}
              >
                <span>{option.label}</span>
                {sortBy === option.value ? <Check className="h-4 w-4" /> : null}
              </button>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 border-t border-[var(--color-border-subtle)] pt-2">
            <Button type="button" variant={sortOrder === "asc" ? "default" : "outline"} onClick={() => setSortOrder("asc")}>
              升序
            </Button>
            <Button type="button" variant={sortOrder === "desc" ? "default" : "outline"} onClick={() => setSortOrder("desc")}>
              降序
            </Button>
          </div>
          <Button type="button" className="mt-2 w-full" onClick={() => onApply(sortBy, sortOrder)}>
            应用排序
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function DensityDropdown({
  open,
  densityMode,
  onToggle,
  onChange,
  buttonClassName
}: {
  open: boolean;
  densityMode: DensityMode;
  onToggle: () => void;
  onChange: (density: DensityMode) => void;
  buttonClassName: string;
}) {
  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        className={buttonClassName}
        aria-expanded={open}
        onClick={onToggle}
      >
        <Rows3 className="h-4 w-4" />
        密度
        <span className="text-[12px] text-muted-foreground">{densityOptions.find((item) => item.value === densityMode)?.label}</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </Button>
      {open ? (
        <div className="surface-card-strong absolute right-0 top-[calc(100%+8px)] z-30 min-w-[188px] rounded-[12px] p-2 shadow-[var(--shadow-hover)]">
          <div className="space-y-1">
            {densityOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={cn(
                  "flex w-full items-center justify-between rounded-[10px] px-3 py-2 text-sm transition hover:bg-[var(--color-hover)]",
                  densityMode === option.value ? "bg-[var(--color-primary-soft)] text-[rgb(29,78,216)]" : "text-foreground"
                )}
                onClick={() => onChange(option.value)}
              >
                <span>{option.label}</span>
                {densityMode === option.value ? <span className="text-[12px] font-medium">当前</span> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ColumnPanel({
  open,
  columns,
  visibleColumnKeys,
  panelRef,
  onOpenChange,
  onToggle,
  onToggleAll,
  onReset
}: {
  open: boolean;
  columns: ColumnDefinition[];
  visibleColumnKeys: string[];
  panelRef: MutableRefObject<HTMLElement | null>;
  onOpenChange: (open: boolean) => void;
  onToggle: (key: string) => void;
  onToggleAll: () => void;
  onReset: () => void;
}) {
  if (!open) {
    return null;
  }

  const optionalColumns = columns.filter((column) => column.key !== "projectName");
  const allSelected = visibleColumnKeys.length === columns.length;
  const selectedOptionalCount = optionalColumns.filter((column) => visibleColumnKeys.includes(column.key)).length;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="关闭显示列面板"
        className="absolute inset-0 cursor-default bg-[rgba(15,23,42,0.16)]"
        onClick={() => onOpenChange(false)}
      />
      <aside
        ref={panelRef}
        className="surface-card-strong absolute right-0 top-0 flex h-full w-[min(92vw,420px)] flex-col rounded-l-[16px] border-y-0 border-r-0 p-0 shadow-[0_20px_50px_rgba(15,23,42,0.12)]"
      >
        <div className="flex items-start justify-between border-b border-[var(--color-border-subtle)] px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
              <PanelRightOpen className="h-4 w-4 text-[var(--color-primary)]" />
              显示列
            </div>
            <div className="mt-1 text-[12px] text-muted-foreground">
              已显示 {visibleColumnKeys.length} / {columns.length} 列，项目名称固定显示
            </div>
          </div>
          <button
            type="button"
            className="rounded-[8px] p-2 text-muted-foreground transition hover:bg-[var(--color-hover)] hover:text-foreground"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-[var(--color-border-subtle)] px-5 py-3">
          <button
            type="button"
            className={cn(
              "flex min-h-10 w-full items-center justify-between rounded-[10px] border px-3 py-2 text-left text-[13px] transition",
              allSelected
                ? "border-[rgba(59,130,246,0.22)] bg-[rgba(59,130,246,0.06)] text-foreground"
                : "border-[var(--color-border-subtle)] bg-white text-[#4b5563] hover:bg-[var(--color-hover)]"
            )}
            onClick={onToggleAll}
          >
            <span className="min-w-0">
              <span className="block font-medium">全选</span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">
                已选 {selectedOptionalCount} / {optionalColumns.length} 个可选字段
              </span>
            </span>
            <span
              className={cn(
                "ml-3 flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border",
                allSelected
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                  : "border-[rgba(203,213,225,0.9)] bg-white"
              )}
            >
              {allSelected ? <Check className="h-3.5 w-3.5" /> : null}
            </span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="grid gap-2">
            {optionalColumns.map((column) => {
              const checked = visibleColumnKeys.includes(column.key);

              return (
                <button
                  key={column.key}
                  type="button"
                  className={cn(
                    "flex min-h-10 w-full items-center justify-between rounded-[10px] border px-3 py-2 text-left text-[13px] transition",
                    checked
                      ? "border-[rgba(59,130,246,0.22)] bg-[rgba(59,130,246,0.06)] text-foreground"
                      : "border-[var(--color-border-subtle)] bg-white text-[#4b5563] hover:bg-[var(--color-hover)]"
                  )}
                  onClick={() => onToggle(column.key)}
                >
                  <span className="min-w-0 truncate">{column.header}</span>
                  <span
                    className={cn(
                      "ml-3 flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border",
                      checked
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                        : "border-[rgba(203,213,225,0.9)] bg-white"
                    )}
                  >
                    {checked ? <Check className="h-3.5 w-3.5" /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--color-border-subtle)] px-5 py-4">
          <Button type="button" variant="ghost" onClick={onReset}>
            恢复默认
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>
            完成
          </Button>
        </div>
      </aside>
    </div>
  );
}

export function ProjectOverviewClient({ result }: ProjectOverviewClientProps) {
  const { setSidebarCollapsed } = useShellLayout();
  const {
    query,
    searchDraft,
    setSearchDraft,
    clearSearch,
    applyFilters,
    setSort,
    goToPage,
    setPageSize
  } = useListQueryState({
    defaultSortBy: "contractSignedAt",
    defaultSortOrder: "desc"
  });
  const [visibleColumnKeys, setVisibleColumnKeys] = useState(defaultVisibleColumnKeys);
  const [densityMode, setDensityMode] = useState<DensityMode>("standard");
  const [filterOpen, setFilterOpen] = useState(false);
  const [openPopover, setOpenPopover] = useState<OpenPopover>(null);
  const [activeDetail, setActiveDetail] = useState<ProjectOverviewRecord | null>(null);
  const [isBoardMode, setIsBoardMode] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const densityDropdownRef = useRef<HTMLDivElement>(null);
  const columnTriggerRef = useRef<HTMLDivElement>(null);
  const columnDrawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const savedColumns = window.localStorage.getItem(columnStorageKey);
    const savedDensity = window.localStorage.getItem(densityStorageKey);

    if (savedColumns) {
      try {
        const parsed = JSON.parse(savedColumns) as string[];
        if (Array.isArray(parsed) && parsed.length) {
          const allowed = parsed.filter((item) => columns.some((column) => column.key === item));
          setVisibleColumnKeys(Array.from(new Set(["projectName", ...allowed])));
        }
      } catch {
        window.localStorage.removeItem(columnStorageKey);
      }
    }

    if (savedDensity && densityOptions.some((option) => option.value === savedDensity)) {
      setDensityMode(savedDensity as DensityMode);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(columnStorageKey, JSON.stringify(visibleColumnKeys));
  }, [visibleColumnKeys]);

  useEffect(() => {
    window.localStorage.setItem(densityStorageKey, densityMode);
  }, [densityMode]);

  useEffect(() => {
    document.body.classList.toggle("overview-board-mode", isBoardMode);
    return () => document.body.classList.remove("overview-board-mode");
  }, [isBoardMode]);

  useEffect(() => {
    if (isBoardMode) {
      setSidebarCollapsed(true);
    }
  }, [isBoardMode, setSidebarCollapsed]);

  useEffect(() => {
    if (!openPopover) {
      return;
    }

    function handleDocumentClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (
        sortDropdownRef.current?.contains(target) ||
        densityDropdownRef.current?.contains(target) ||
        columnTriggerRef.current?.contains(target) ||
        columnDrawerRef.current?.contains(target)
      ) {
        return;
      }

      setOpenPopover(null);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenPopover(null);
      }
    }

    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("click", handleDocumentClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openPopover]);

  const density = densityTokens[densityMode];

  const visibleColumns = useMemo(() => {
    const filtered = columns.filter((column) => visibleColumnKeys.includes(column.key));
    return filtered.length ? filtered : [columns[0]];
  }, [visibleColumnKeys]);

  const groupedHeaders = useMemo(
    () =>
      groupOrder
        .map((group) => ({
          group,
          items: visibleColumns.filter((column) => column.group === group)
        }))
        .filter((item) => item.items.length),
    [visibleColumns]
  );

  function toggleColumn(key: string) {
    if (key === "projectName") {
      return;
    }

    setVisibleColumnKeys((current) => {
      if (current.includes(key)) {
        return current.length > 2 ? current.filter((item) => item !== key) : current;
      }

      return [...current, key];
    });
  }

  function resetColumns() {
    setVisibleColumnKeys(defaultVisibleColumnKeys);
  }

  function toggleAllColumns() {
    setVisibleColumnKeys((current) => (current.length === columns.length ? defaultVisibleColumnKeys : columns.map((column) => column.key)));
  }

  function togglePopover(popover: Exclude<OpenPopover, null>) {
    setOpenPopover((current) => (current === popover ? null : popover));
  }

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", isBoardMode ? "gap-2" : "gap-3")}>
      {!isBoardMode ? <OverviewSummaryStrip summary={result.summary} /> : null}

      <section className="overview-section-card flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="border-b border-[var(--color-border-subtle)] bg-white px-4 py-3">
          <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-2 lg:flex-row lg:items-center">
              <div className="relative w-full lg:max-w-[420px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  placeholder="搜索项目名称 / 客户名称"
                  className={cn("border-[var(--color-border)] bg-white pl-10 pr-10 shadow-none", density.searchInput)}
                />
                {searchDraft ? (
                  <button
                    type="button"
                    aria-label="清空搜索"
                    className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-[7px] text-muted-foreground transition hover:bg-[var(--color-hover)] hover:text-foreground"
                    onClick={clearSearch}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  type="button"
                  className={density.toolbarButton}
                  onClick={() => {
                    setOpenPopover(null);
                    setFilterOpen(true);
                  }}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  筛选
                  {Object.keys(query.filters).length ? (
                    <span className="text-[var(--color-primary)]">({Object.keys(query.filters).length})</span>
                  ) : null}
                </Button>
                <div ref={columnTriggerRef}>
                  <Button
                    variant="outline"
                    type="button"
                    className={density.toolbarButton}
                    aria-expanded={openPopover === "columns"}
                    onClick={() => togglePopover("columns")}
                  >
                    <Columns3 className="h-4 w-4" />
                    显示列
                    <span className="text-[12px] text-muted-foreground">{visibleColumnKeys.length}</span>
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap items-center gap-2 border-l border-[var(--color-border-subtle)] pl-3">
                <div ref={sortDropdownRef}>
                  <SortDropdown
                    open={openPopover === "sort"}
                    currentSortBy={query.sortBy || "contractSignedAt"}
                    currentSortOrder={query.sortOrder}
                    onToggle={() => togglePopover("sort")}
                    onApply={(sortBy, sortOrder) => {
                      setSort(sortBy, sortOrder);
                      setOpenPopover(null);
                    }}
                    buttonClassName={density.toolbarButton}
                  />
                </div>
                <div ref={densityDropdownRef}>
                  <DensityDropdown
                    open={openPopover === "density"}
                    densityMode={densityMode}
                    onToggle={() => togglePopover("density")}
                    onChange={(nextDensity) => {
                      setDensityMode(nextDensity);
                      setOpenPopover(null);
                    }}
                    buttonClassName={density.toolbarButton}
                  />
                </div>
              </div>
              {!isBoardMode ? (
                <div className="flex flex-wrap items-center gap-2 border-l border-[var(--color-border-subtle)] pl-3">
                  <Button
                    type="button"
                    variant="outline"
                    className={density.toolbarButton}
                    onClick={() => exportRowsAsCsv(result.list, visibleColumns)}
                  >
                    <Download className="h-4 w-4" />
                    导出
                  </Button>
                </div>
              ) : null}
              <Button
                type="button"
                variant={isBoardMode ? "default" : "outline"}
                className={density.toolbarButton}
                onClick={() => setIsBoardMode((current) => !current)}
              >
                {isBoardMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                {isBoardMode ? "退出看板" : "全屏视图"}
              </Button>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 bg-white px-4 py-3">
          <div className="overview-table-shell flex h-full min-h-0 flex-col rounded-[16px] border border-[var(--color-border-subtle)] bg-white">
            <div className="h-full min-h-0 overflow-auto rounded-t-[16px]">
              <table className="min-w-max border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    {groupedHeaders.map((group) =>
                      group.group === "项目名称" ? (
                        <th
                          key={group.group}
                          rowSpan={2}
                          className={cn(
                            "overview-table-group-head overview-table-sticky-shadow sticky left-0 top-0 z-30 border-b border-r border-[var(--color-border-strong)] bg-[#edf2f8]",
                            density.groupHeadHeight,
                            density.cellPadding
                          )}
                          style={{ width: group.items[0]?.width, minWidth: group.items[0]?.width }}
                        >
                          项目名称
                        </th>
                      ) : (
                        <th
                          key={group.group}
                          colSpan={group.items.length}
                          className={cn(
                            "overview-table-group-head sticky top-0 z-20 border-b border-r border-[var(--color-border-strong)]",
                            density.groupHeadHeight,
                            density.cellPadding
                          )}
                        >
                          {group.group}
                        </th>
                      )
                    )}
                  </tr>
                  <tr>
                    {groupedHeaders
                      .filter((group) => group.group !== "项目名称")
                      .flatMap((group) => group.items)
                      .map((column) => (
                        <th
                          key={column.key}
                          className={cn(
                            "overview-table-column-head sticky z-20 border-b border-r border-[var(--color-border-subtle)]",
                            density.secondHeadTop,
                            density.columnHeadHeight,
                            density.cellPadding,
                            column.align === "right" && "text-right",
                            column.align === "center" ? "text-center" : "text-left"
                          )}
                          style={{ width: column.width, minWidth: column.width }}
                        >
                          {column.header}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {result.list.length ? (
                    result.list.map((row) => (
                      <tr
                        key={row.id}
                        className={cn("group transition-colors hover:bg-[rgba(239,246,255,0.52)]", density.rowHeight)}
                      >
                        {visibleColumns.map((column, index) => {
                          const isSticky = index === 0;

                          return (
                            <td
                              key={column.key}
                              className={cn(
                                "border-b border-r border-[var(--color-border-subtle)] align-middle text-[#1f2937]",
                                density.cellPadding,
                                density.cellText,
                                column.align === "right" && "text-right",
                                column.align === "center" ? "text-center" : "text-left",
                                isSticky &&
                                  "overview-table-sticky-shadow sticky left-0 z-10 bg-white group-hover:bg-[rgba(249,251,254,1)]"
                              )}
                              style={{ width: column.width, minWidth: column.width }}
                            >
                              <DataCell column={column} row={row} onOpenDetail={setActiveDetail} density={density} />
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={visibleColumns.length} className="px-4 py-16 text-center text-muted-foreground">
                        暂无符合条件的项目经营数据
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="sticky bottom-0 z-20 border-t border-[var(--color-border-subtle)] bg-white/95 backdrop-blur-sm">
              <ListPagination
                total={result.total}
                page={result.page}
                pageSize={result.pageSize}
                totalPages={result.totalPages}
                pageSizeOptions={[10, 20, 50]}
                onPageChange={goToPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          </div>
        </div>
      </section>

      <ColumnPanel
        open={openPopover === "columns"}
        columns={columns}
        visibleColumnKeys={visibleColumnKeys}
        panelRef={columnDrawerRef}
        onOpenChange={(open) => setOpenPopover(open ? "columns" : null)}
        onToggle={toggleColumn}
        onToggleAll={toggleAllColumns}
        onReset={resetColumns}
      />

      <FilterDialog
        open={filterOpen}
        onOpenChange={setFilterOpen}
        options={result.filterOptions}
        initialFilters={query.filters}
        onApply={applyFilters}
        onReset={() => applyFilters({})}
      />

      <Dialog open={Boolean(activeDetail)} onOpenChange={(open) => !open && setActiveDetail(null)}>
        <DialogContent className="w-[min(92vw,720px)] rounded-[18px] border-[var(--color-border-subtle)]">
          <DialogHeader>
            <DialogTitle>{activeDetail?.projectName}</DialogTitle>
            <DialogDescription>项目进展周度更新详情</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm leading-7 text-[#374151]">
            <div className="rounded-[14px] bg-[rgba(248,250,252,0.96)] px-4 py-3">
              {activeDetail?.projectProgressText || "暂无进展说明"}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground">项目进度</span>
              <ProgressBar value={activeDetail?.projectProgressPercent ?? 0} tone="project" density={density} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
