import { ListPageShell } from "@/components/list-page-shell";
import { PageShell } from "@/components/page-shell";
import { opportunityStageLabels } from "@/lib/constants";
import { requireSessionUser } from "@/lib/auth";
import { buildListHref, normalizeListParams, omitListFilters } from "@/lib/pagination";
import { formatDate } from "@/lib/utils";
import { decimalToNumber } from "@/modules/core/decimal";
import type { PageSearchParams } from "@/types/common";
import { opportunityService } from "@/modules/opportunities/service";
import { opportunityListConfig } from "@/modules/opportunities/ui/config";

export default async function OpportunitiesPage({ searchParams }: { searchParams: PageSearchParams }) {
  const user = await requireSessionUser();
  const params = normalizeListParams(searchParams);
  const view = typeof searchParams.view === "string" ? searchParams.view : "all";
  const result = await opportunityService.list(params, user);
  const rows = result.items.map((item: any) => ({
    code: item.code,
    codeHref: `/opportunities/${item.id}`,
    name: item.name,
    customerName: item.customer.name,
    stageLabel: opportunityStageLabels[item.stage as keyof typeof opportunityStageLabels],
    expectedSignDate: formatDate(item.expectedSignDate),
    winRate: `${item.winRate ?? 0}%`,
    amount: decimalToNumber(item.amount)
  }));

  return (
    <PageShell
      title="商机管理"
      description="跟踪客户商机阶段，为项目立项和经营决策提供依据。"
      breadcrumbs={[
        { label: "商机" },
        { label: view === "won" ? "重点商机" : "全部商机" }
      ]}
    >
      <ListPageShell
        config={opportunityListConfig}
        tabs={[
          {
            label: "全部商机",
            href: buildListHref("/opportunities", {
              q: params.q,
              pageSize: params.pageSize,
              sortBy: params.sortBy,
              sortOrder: params.sortOrder,
              filters: omitListFilters(params.filters, ["status"])
            }),
            active: view === "all"
          },
          {
            label: "重点商机",
            href: buildListHref("/opportunities", {
              view: "won",
              q: params.q,
              pageSize: params.pageSize,
              sortBy: params.sortBy,
              sortOrder: params.sortOrder,
              filters: {
                ...params.filters,
                status: params.filters.status || "WON"
              }
            }),
            active: view === "won"
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
