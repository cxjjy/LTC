import { ListPageShell } from "@/components/list-page-shell";
import { PageShell } from "@/components/page-shell";
import { costCategoryLabels } from "@/lib/constants";
import { requireSessionUser } from "@/lib/auth";
import { getDeleteCopy } from "@/lib/delete-config";
import { buildListHref, normalizeListParams } from "@/lib/pagination";
import { canAccessRecord, requirePagePermission } from "@/lib/rbac";
import { formatDate } from "@/lib/utils";
import { decimalToNumber } from "@/modules/core/decimal";
import { costService } from "@/modules/costs/service";
import { costListConfig } from "@/modules/costs/ui/config";
import type { PageSearchParams } from "@/types/common";

export default async function CostsPage({ searchParams }: { searchParams: PageSearchParams }) {
  const user = await requirePagePermission(requireSessionUser(), "cost", "view");
  const canCreate = canAccessRecord(user, "cost", "create");
  const canUpdate = canAccessRecord(user, "cost", "update");
  const canDelete = canAccessRecord(user, "cost", "delete");
  const deleteCopy = getDeleteCopy("cost");
  const params = normalizeListParams(searchParams);
  const view = typeof searchParams.view === "string" ? searchParams.view : "all";
  const result = await costService.list(params, user);
  const exportResult =
    result.total > result.items.length
      ? await costService.list({ ...params, page: 1, pageSize: result.total }, user)
      : result;
  const mapRow = (item: any) => ({
    code: item.code,
    codeHref: `/costs/${item.id}`,
    title: item.title,
    projectName: item.project.name,
    categoryLabel: costCategoryLabels[item.category as keyof typeof costCategoryLabels],
    occurredAt: formatDate(item.occurredAt),
    amount: decimalToNumber(item.amount),
    rowActions: {
      moduleLabel: deleteCopy.moduleLabel,
      recordLabel: `${item.code} / ${item.title}`,
      viewHref: `/costs/${item.id}`,
      editHref: canUpdate ? `/costs/${item.id}/edit` : undefined,
      deleteEndpoint: canDelete ? `/api/costs/${item.id}` : undefined,
      deleteWarning: deleteCopy.warning
    }
  });
  const rows = result.items.map(mapRow);
  const exportRows = exportResult.items.map(mapRow);

  return (
    <PageShell
      title="成本管理"
      description="记录项目成本支出，支撑经营分析与毛利测算。"
      breadcrumbs={[
        { label: "成本" },
        { label: view === "monthly" ? "本月支出" : "全部成本" }
      ]}
    >
      <ListPageShell
        config={costListConfig}
        canCreate={canCreate}
        tabs={[
          {
            label: "全部成本",
            href: buildListHref("/costs", {
              q: params.q,
              pageSize: params.pageSize,
              sortBy: params.sortBy,
              sortOrder: params.sortOrder,
              filters: params.filters
            }),
            active: view === "all"
          },
          {
            label: "本期支出",
            href: buildListHref("/costs", {
              view: "monthly",
              q: params.q,
              pageSize: params.pageSize,
              sortBy: params.sortBy,
              sortOrder: params.sortOrder,
              filters: params.filters
            }),
            active: view === "monthly"
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
