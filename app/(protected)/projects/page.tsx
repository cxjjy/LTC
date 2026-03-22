import { ListPageShell } from "@/components/list-page-shell";
import { PageShell } from "@/components/page-shell";
import { projectStatusLabels } from "@/lib/constants";
import { requireSessionUser } from "@/lib/auth";
import { buildListHref, normalizeListParams, omitListFilters } from "@/lib/pagination";
import { formatDate } from "@/lib/utils";
import { decimalToNumber } from "@/modules/core/decimal";
import { projectService } from "@/modules/projects/service";
import { projectListConfig } from "@/modules/projects/ui/config";
import type { PageSearchParams } from "@/types/common";

export default async function ProjectsPage({ searchParams }: { searchParams: PageSearchParams }) {
  const user = await requireSessionUser();
  const params = normalizeListParams(searchParams);
  const view = typeof searchParams.view === "string" ? searchParams.view : "all";
  const result = await projectService.list(params, user);
  const rows = result.items.map((item: any) => ({
    code: item.code,
    codeHref: `/projects/${item.id}`,
    name: item.name,
    customerName: item.customer.name,
    statusLabel: projectStatusLabels[item.status as keyof typeof projectStatusLabels],
    plannedStartDate: formatDate(item.plannedStartDate),
    plannedEndDate: formatDate(item.plannedEndDate),
    budgetAmount: decimalToNumber(item.budgetAmount)
  }));

  return (
    <PageShell
      title="项目管理"
      description="管理项目全生命周期，包括交付、成本和回款。"
      breadcrumbs={[
        { label: "项目" },
        { label: view === "progress" ? "进行中项目" : "全部项目" }
      ]}
    >
      <ListPageShell
        config={projectListConfig}
        tabs={[
          {
            label: "全部项目",
            href: buildListHref("/projects", {
              q: params.q,
              pageSize: params.pageSize,
              sortBy: params.sortBy,
              sortOrder: params.sortOrder,
              filters: omitListFilters(params.filters, ["status"])
            }),
            active: view === "all"
          },
          {
            label: "重点项目",
            href: buildListHref("/projects", {
              view: "progress",
              q: params.q,
              pageSize: params.pageSize,
              sortBy: params.sortBy,
              sortOrder: params.sortOrder,
              filters: {
                ...params.filters,
                status: params.filters.status || "IN_PROGRESS"
              }
            }),
            active: view === "progress"
          }
        ]}
        data={rows}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        totalPages={result.totalPages}
      />
    </PageShell>
  );
}
