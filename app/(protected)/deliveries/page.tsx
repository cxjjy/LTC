import { ListPageShell } from "@/components/list-page-shell";
import { PageShell } from "@/components/page-shell";
import { deliveryStatusLabels } from "@/lib/constants";
import { requireSessionUser } from "@/lib/auth";
import { getDeleteCopy } from "@/lib/delete-config";
import { buildListHref, normalizeListParams, omitListFilters } from "@/lib/pagination";
import { canAccessRecord, requirePagePermission } from "@/lib/rbac";
import { formatDate } from "@/lib/utils";
import { deliveryService } from "@/modules/deliveries/service";
import { deliveryListConfig } from "@/modules/deliveries/ui/config";
import type { PageSearchParams } from "@/types/common";

export default async function DeliveriesPage({ searchParams }: { searchParams: PageSearchParams }) {
  const user = await requirePagePermission(requireSessionUser(), "delivery", "view");
  const canCreate = canAccessRecord(user, "delivery", "create");
  const canUpdate = canAccessRecord(user, "delivery", "update");
  const canDelete = canAccessRecord(user, "delivery", "delete");
  const deleteCopy = getDeleteCopy("delivery");
  const params = normalizeListParams(searchParams);
  const view = typeof searchParams.view === "string" ? searchParams.view : "all";
  const result = await deliveryService.list(params, user);
  const exportResult =
    result.total > result.items.length
      ? await deliveryService.list({ ...params, page: 1, pageSize: result.total }, user)
      : result;
  const mapRow = (item: any) => ({
    code: item.code,
    codeHref: `/deliveries/${item.id}`,
    title: item.title,
    projectName: item.project.name,
    ownerName: item.ownerName || "-",
    statusLabel: deliveryStatusLabels[item.status as keyof typeof deliveryStatusLabels],
    plannedDate: formatDate(item.plannedDate),
    actualDate: formatDate(item.actualDate),
    rowActions: {
      moduleLabel: deleteCopy.moduleLabel,
      recordLabel: `${item.code} / ${item.title}`,
      viewHref: `/deliveries/${item.id}`,
      editHref: canUpdate ? `/deliveries/${item.id}/edit` : undefined,
      deleteEndpoint: canDelete ? `/api/deliveries/${item.id}` : undefined,
      deleteWarning: deleteCopy.warning
    }
  });
  const rows = result.items.map(mapRow);
  const exportRows = exportResult.items.map(mapRow);

  return (
    <PageShell
      title="交付管理"
      description="跟踪项目交付进度、验收状态与执行计划。"
      breadcrumbs={[
        { label: "交付" },
        { label: view === "active" ? "进行中交付" : "全部交付" }
      ]}
    >
      <ListPageShell
        config={deliveryListConfig}
        canCreate={canCreate}
        tabs={[
          {
            label: "全部交付",
            href: buildListHref("/deliveries", {
              q: params.q,
              pageSize: params.pageSize,
              sortBy: params.sortBy,
              sortOrder: params.sortOrder,
              filters: omitListFilters(params.filters, ["status"])
            }),
            active: view === "all"
          },
          {
            label: "重点交付",
            href: buildListHref("/deliveries", {
              view: "active",
              q: params.q,
              pageSize: params.pageSize,
              sortBy: params.sortBy,
              sortOrder: params.sortOrder,
              filters: {
                ...params.filters,
                status: params.filters.status || "IN_PROGRESS"
              }
            }),
            active: view === "active"
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
