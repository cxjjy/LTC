import { ListPageShell } from "@/components/list-page-shell";
import { PageShell } from "@/components/page-shell";
import { requireSessionUser } from "@/lib/auth";
import { requirePagePermission } from "@/lib/rbac";
import { buildListHref, normalizeListParams } from "@/lib/pagination";
import { formatDateTime } from "@/lib/utils";
import { auditLogModuleService } from "@/modules/audit-logs/service";
import { auditLogListConfig } from "@/modules/audit-logs/ui/config";
import type { PageSearchParams } from "@/types/common";

export default async function AuditLogsPage({ searchParams }: { searchParams: PageSearchParams }) {
  const user = await requirePagePermission(requireSessionUser(), "auditLog", "view");
  const params = normalizeListParams(searchParams);
  const view = typeof searchParams.view === "string" ? searchParams.view : "all";
  const result = await auditLogModuleService.list(params, user);
  const exportResult =
    result.total > result.items.length
      ? await auditLogModuleService.list({ ...params, page: 1, pageSize: result.total }, user)
      : result;
  const mapRow = (item: any) => ({
    createdAt: formatDateTime(item.createdAt),
    entityType: item.entityType,
    entityCode: item.entityCode || item.entityId,
    entityCodeHref: `/audit-logs/${item.id}`,
    action: item.action,
    actorId: item.actorId,
    message: item.message,
    rowActions: {
      moduleLabel: "审计日志",
      recordLabel: item.entityCode || item.entityId,
      viewHref: `/audit-logs/${item.id}`
    }
  });
  const rows = result.items.map(mapRow);
  const exportRows = exportResult.items.map(mapRow);

  return (
    <PageShell
      title="审计日志"
      description="记录关键状态变化、流程动作和重要操作。"
      breadcrumbs={[
        { label: "系统管理" },
        { label: view === "key" ? "关键操作" : "全部日志" }
      ]}
    >
      <ListPageShell
        config={auditLogListConfig}
        tabs={[
          {
            label: "全部日志",
            href: buildListHref("/audit-logs", {
              q: params.q,
              pageSize: params.pageSize,
              sortBy: params.sortBy,
              sortOrder: params.sortOrder,
              filters: params.filters
            }),
            active: view === "all"
          },
          {
            label: "关键操作",
            href: buildListHref("/audit-logs", {
              view: "key",
              q: params.q,
              pageSize: params.pageSize,
              sortBy: params.sortBy,
              sortOrder: params.sortOrder,
              filters: params.filters
            }),
            active: view === "key"
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
