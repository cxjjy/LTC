import { ListPageShell } from "@/components/list-page-shell";
import { PageShell } from "@/components/page-shell";
import { projectStatusLabels } from "@/lib/constants";
import { requireSessionUser } from "@/lib/auth";
import { getDeleteCopy } from "@/lib/delete-config";
import { buildListHref, normalizeListParams, omitListFilters } from "@/lib/pagination";
import { canAccessRecord, requirePagePermission } from "@/lib/rbac";
import { formatDate } from "@/lib/utils";
import { decimalToNumber } from "@/modules/core/decimal";
import { projectService } from "@/modules/projects/service";
import { projectListConfig } from "@/modules/projects/ui/config";
import type { PageSearchParams } from "@/types/common";

export default async function ProjectsPage({ searchParams }: { searchParams: PageSearchParams }) {
  const user = await requirePagePermission(requireSessionUser(), "project", "view");
  const canCreate = canAccessRecord(user, "project", "create");
  const canUpdate = canAccessRecord(user, "project", "update");
  const canDelete = canAccessRecord(user, "project", "delete");
  const deleteCopy = getDeleteCopy("project");
  const params = normalizeListParams(searchParams);
  const view = typeof searchParams.view === "string" ? searchParams.view : "all";
  const result = await projectService.list(params, user);
  const exportResult =
    result.total > result.items.length
      ? await projectService.list({ ...params, page: 1, pageSize: result.total }, user)
      : result;
  const mapRow = (item: any) => ({
    code: item.code,
    codeHref: `/projects/${item.id}`,
    name: item.name,
    customerName: item.customer.name,
    statusLabel: projectStatusLabels[item.status as keyof typeof projectStatusLabels],
    plannedStartDate: formatDate(item.plannedStartDate),
    plannedEndDate: formatDate(item.plannedEndDate),
    budgetAmount: decimalToNumber(item.budgetAmount),
    rowActions: {
      moduleLabel: deleteCopy.moduleLabel,
      recordLabel: `${item.code} / ${item.name}`,
      viewHref: `/projects/${item.id}`,
      editHref: canUpdate ? `/projects/${item.id}/edit` : undefined,
      deleteEndpoint: canDelete ? `/api/projects/${item.id}` : undefined,
      deleteWarning: deleteCopy.warning
    }
  });
  const rows = result.items.map(mapRow);
  const exportRows = exportResult.items.map(mapRow);

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
        canCreate={canCreate}
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
        exportRows={exportRows}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        totalPages={result.totalPages}
      />
    </PageShell>
  );
}
