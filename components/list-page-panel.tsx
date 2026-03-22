import Link from "next/link";
import {
  ArrowUpDown,
  Columns3,
  Download,
  Ellipsis,
  Filter,
  Plus,
  RotateCcw,
  Search,
  Upload
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { SelectOption } from "@/types/common";

export type ListHeaderTabItem = {
  label: string;
  href: string;
  active?: boolean;
};

type QueryParams = Record<string, string | number | undefined>;

function HiddenQueryInputs({ params }: { params?: QueryParams }) {
  return (
    <>
      {Object.entries(params ?? {}).map(([key, value]) =>
        value ? <input key={key} type="hidden" name={key} value={String(value)} /> : null
      )}
    </>
  );
}

export function buildQueryHref(basePath: string, params: QueryParams) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  });

  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function ListHeaderTabs({ tabs }: { tabs: ListHeaderTabItem[] }) {
  return (
    <div className="flex items-center gap-7 border-b border-[rgba(229,231,235,0.9)] px-6">
      {tabs.map((tab) => (
        <Link
          key={tab.label}
          href={tab.href}
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

export function PrimaryActions({
  createLabel,
  createHref
}: {
  createLabel?: string;
  createHref?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {createLabel && createHref ? (
        <Button asChild className="h-9 rounded-[10px] px-4 font-medium">
          <Link href={createHref}>
            <Plus className="h-4 w-4" />
            {createLabel}
          </Link>
        </Button>
      ) : null}
      <Button variant="action" size="default" type="button">
        <Upload className="h-4 w-4" />
        导入
      </Button>
      <Button variant="action" size="default" type="button">
        <Download className="h-4 w-4" />
        导出
      </Button>
      <Button variant="action" size="default" type="button">
        <Ellipsis className="h-4 w-4" />
        更多
      </Button>
    </div>
  );
}

export function SecondaryToolbar({
  basePath,
  keyword,
  status,
  statusOptions = [],
  extraParams
}: {
  basePath: string;
  keyword?: string;
  status?: string;
  statusOptions?: SelectOption[];
  extraParams?: QueryParams;
}) {
  const refreshHref = buildQueryHref(basePath, {
    ...extraParams
  });

  return (
    <div className="flex flex-1 flex-wrap items-center justify-end gap-2.5">
      <form action={basePath} className="flex flex-wrap items-center justify-end gap-2.5">
        <HiddenQueryInputs params={extraParams} />
        <div className="relative w-[220px] min-w-[180px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="keyword"
            defaultValue={keyword}
            placeholder="搜索编号、名称或关键字"
            className="pl-9"
          />
        </div>
        {statusOptions.length ? (
          <select
            name="status"
            defaultValue={status}
            className="control-surface h-9 rounded-[10px] px-3 text-sm text-foreground outline-none transition-all duration-150 focus:border-[rgba(59,130,246,0.42)] focus:ring-2 focus:ring-[rgba(59,130,246,0.16)]"
          >
            <option value="">全部状态</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : null}
        <Button variant="toolbar" type="submit">
          <Filter className="h-4 w-4" />
          筛选
        </Button>
      </form>
      <Button variant="toolbar" type="button">
        <Columns3 className="h-4 w-4" />
        显示列
      </Button>
      <Button variant="toolbar" type="button">
        <ArrowUpDown className="h-4 w-4" />
        排序
      </Button>
      <Button asChild variant="toolbar">
        <Link href={refreshHref}>
          <RotateCcw className="h-4 w-4" />
          重置
        </Link>
      </Button>
    </div>
  );
}

export function IntegratedTableSection({
  children,
  pagination
}: {
  children: React.ReactNode;
  pagination?: React.ReactNode;
}) {
  return (
    <>
      <div className="min-h-[380px]">{children}</div>
      {pagination ? <div className="workspace-panel-section">{pagination}</div> : null}
    </>
  );
}

export function ListPagePanel({
  tabs,
  createLabel,
  createHref,
  basePath,
  keyword,
  status,
  statusOptions,
  extraParams,
  children,
  pagination
}: {
  tabs: ListHeaderTabItem[];
  createLabel?: string;
  createHref?: string;
  basePath: string;
  keyword?: string;
  status?: string;
  statusOptions?: SelectOption[];
  extraParams?: QueryParams;
  children: React.ReactNode;
  pagination?: React.ReactNode;
}) {
  return (
    <section className="workspace-panel overflow-hidden">
      <ListHeaderTabs tabs={tabs} />
      <div className="flex flex-col gap-4 px-6 py-4 xl:flex-row xl:items-center xl:justify-between">
        <PrimaryActions createLabel={createLabel} createHref={createHref} />
        <SecondaryToolbar
          basePath={basePath}
          keyword={keyword}
          status={status}
          statusOptions={statusOptions}
          extraParams={extraParams}
        />
      </div>
      <div className="workspace-panel-section">
        <IntegratedTableSection pagination={pagination}>{children}</IntegratedTableSection>
      </div>
    </section>
  );
}
