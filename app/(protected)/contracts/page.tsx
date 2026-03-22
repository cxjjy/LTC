import { ListPageShell } from "@/components/list-page-shell";
import { PageShell } from "@/components/page-shell";
import { contractStatusLabels } from "@/lib/constants";
import { requireSessionUser } from "@/lib/auth";
import { buildListHref, normalizeListParams, omitListFilters } from "@/lib/pagination";
import { formatDate } from "@/lib/utils";
import { decimalToNumber } from "@/modules/core/decimal";
import { contractService } from "@/modules/contracts/service";
import { contractListConfig } from "@/modules/contracts/ui/config";
import type { PageSearchParams } from "@/types/common";

export default async function ContractsPage({ searchParams }: { searchParams: PageSearchParams }) {
  const user = await requireSessionUser();
  const params = normalizeListParams(searchParams);
  const view = typeof searchParams.view === "string" ? searchParams.view : "all";
  const result = await contractService.list(params, user);
  const rows = result.items.map((item: any) => ({
    code: item.code,
    codeHref: `/contracts/${item.id}`,
    name: item.name,
    projectName: item.project.name,
    statusLabel: contractStatusLabels[item.status as keyof typeof contractStatusLabels],
    signedDate: formatDate(item.signedDate),
    effectiveDate: formatDate(item.effectiveDate),
    contractAmount: decimalToNumber(item.contractAmount)
  }));

  return (
    <PageShell
      title="合同管理"
      description="管理项目合同及回款计划。"
      breadcrumbs={[
        { label: "合同" },
        { label: view === "effective" ? "生效合同" : "全部合同" }
      ]}
    >
      <ListPageShell
        config={contractListConfig}
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
              view: "effective",
              q: params.q,
              pageSize: params.pageSize,
              sortBy: params.sortBy,
              sortOrder: params.sortOrder,
              filters: {
                ...params.filters,
                status: params.filters.status || "EFFECTIVE"
              }
            }),
            active: view === "effective"
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
