import { ListPageShell } from "@/components/list-page-shell";
import { PageShell } from "@/components/page-shell";
import { receivableStatusLabels } from "@/lib/constants";
import { requireSessionUser } from "@/lib/auth";
import { buildListHref, normalizeListParams, omitListFilters } from "@/lib/pagination";
import { formatDate } from "@/lib/utils";
import { decimalToNumber } from "@/modules/core/decimal";
import { receivableService } from "@/modules/receivables/service";
import { receivableListConfig } from "@/modules/receivables/ui/config";
import type { PageSearchParams } from "@/types/common";

export default async function ReceivablesPage({ searchParams }: { searchParams: PageSearchParams }) {
  const user = await requireSessionUser();
  const params = normalizeListParams(searchParams);
  const view = typeof searchParams.view === "string" ? searchParams.view : "all";
  const result = await receivableService.list(params, user);
  const rows = result.items.map((item: any) => ({
    code: item.code,
    codeHref: `/receivables/${item.id}`,
    title: item.title,
    projectName: item.project.name,
    contractName: item.contract.name,
    statusLabel: receivableStatusLabels[item.status as keyof typeof receivableStatusLabels],
    dueDate: formatDate(item.dueDate),
    amountDue: decimalToNumber(item.amountDue),
    amountReceived: decimalToNumber(item.amountReceived)
  }));

  return (
    <PageShell
      title="回款管理"
      description="跟踪项目回款与资金流。"
      breadcrumbs={[
        { label: "回款" },
        { label: view === "overdue" ? "逾期回款" : "全部回款" }
      ]}
    >
      <ListPageShell
        config={receivableListConfig}
        tabs={[
          {
            label: "全部回款",
            href: buildListHref("/receivables", {
              q: params.q,
              pageSize: params.pageSize,
              sortBy: params.sortBy,
              sortOrder: params.sortOrder,
              filters: omitListFilters(params.filters, ["status"])
            }),
            active: view === "all"
          },
          {
            label: "逾期回款",
            href: buildListHref("/receivables", {
              view: "overdue",
              q: params.q,
              pageSize: params.pageSize,
              sortBy: params.sortBy,
              sortOrder: params.sortOrder,
              filters: {
                ...params.filters,
                status: params.filters.status || "OVERDUE"
              }
            }),
            active: view === "overdue"
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
