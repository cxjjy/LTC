import { ListPageShell } from "@/components/list-page-shell";
import { PageShell } from "@/components/page-shell";
import { contractStatusLabels } from "@/lib/constants";
import { requireSessionUser } from "@/lib/auth";
import { getDeleteCopy } from "@/lib/delete-config";
import { buildListHref, normalizeListParams, omitListFilters } from "@/lib/pagination";
import { canAccessRecord, requirePagePermission } from "@/lib/rbac";
import { formatDate } from "@/lib/utils";
import { decimalToNumber } from "@/modules/core/decimal";
import { contractService } from "@/modules/contracts/service";
import { contractListConfig } from "@/modules/contracts/ui/config";
import type { PageSearchParams } from "@/types/common";

export default async function ContractsPage({ searchParams }: { searchParams: PageSearchParams }) {
  const user = await requirePagePermission(requireSessionUser(), "contract", "view");
  const canCreate = canAccessRecord(user, "contract", "create");
  const canUpdate = canAccessRecord(user, "contract", "update");
  const canDelete = canAccessRecord(user, "contract", "delete");
  const deleteCopy = getDeleteCopy("contract");
  const params = normalizeListParams(searchParams);
  const view = typeof searchParams.view === "string" ? searchParams.view : "all";
  const result = await contractService.list(params, user);
  const exportResult =
    result.total > result.items.length
      ? await contractService.list({ ...params, page: 1, pageSize: result.total }, user)
      : result;
  const mapRow = (item: any) => ({
    code: item.code,
    codeHref: `/contracts/${item.id}`,
    name: item.name,
    projectName: item.project.name,
    statusLabel: contractStatusLabels[item.status as keyof typeof contractStatusLabels],
    signedDate: formatDate(item.signedDate),
    effectiveDate: formatDate(item.effectiveDate),
    contractAmount: decimalToNumber(item.contractAmount),
    rowActions: {
      moduleLabel: deleteCopy.moduleLabel,
      recordLabel: `${item.code} / ${item.name}`,
      viewHref: `/contracts/${item.id}`,
      editHref: canUpdate ? `/contracts/${item.id}/edit` : undefined,
      deleteEndpoint: canDelete ? `/api/contracts/${item.id}` : undefined,
      deleteWarning: deleteCopy.warning
    }
  });
  const rows = result.items.map(mapRow);
  const exportRows = exportResult.items.map(mapRow);

  return (
    <PageShell
      title="合同管理"
      description="管理项目合同及回款计划。"
        breadcrumbs={[
          { label: "合同" },
        { label: view === "active" ? "生效合同" : "全部合同" }
        ]}
    >
      <ListPageShell
        config={contractListConfig}
        canCreate={canCreate}
        tabs={[
          {
            label: "全部合同",
            href: buildListHref("/contracts", {
              q: params.q,
              pageSize: params.pageSize,
              sortBy: params.sortBy,
              sortOrder: params.sortOrder,
              filters: omitListFilters(params.filters, ["status"])
            }),
            active: view === "all"
          },
          {
            label: "生效合同",
            href: buildListHref("/contracts", {
              view: "active",
              q: params.q,
              pageSize: params.pageSize,
              sortBy: params.sortBy,
              sortOrder: params.sortOrder,
              filters: {
                ...params.filters,
                status: params.filters.status || "ACTIVE"
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
