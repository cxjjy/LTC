import { ListPageShell } from "@/components/list-page-shell";
import { PageShell } from "@/components/page-shell";
import { leadStatusLabels } from "@/lib/constants";
import { requireSessionUser } from "@/lib/auth";
import { buildListHref, normalizeListParams, omitListFilters } from "@/lib/pagination";
import { formatDate } from "@/lib/utils";
import { decimalToNumber } from "@/modules/core/decimal";
import type { PageSearchParams } from "@/types/common";
import { leadService } from "@/modules/leads/service";
import { leadListConfig } from "@/modules/leads/ui/config";

export default async function LeadsPage({ searchParams }: { searchParams: PageSearchParams }) {
  const user = await requireSessionUser();
  const params = normalizeListParams(searchParams);
  const view = typeof searchParams.view === "string" ? searchParams.view : "all";
  const result = await leadService.list(params, user);
  const rows = result.items.map((item: any) => ({
    code: item.code,
    codeHref: `/leads/${item.id}`,
    title: item.title,
    customerName: item.customer.name,
    source: item.source || "-",
    statusLabel: leadStatusLabels[item.status as keyof typeof leadStatusLabels],
    expectedCloseDate: formatDate(item.expectedCloseDate),
    expectedAmount: decimalToNumber(item.expectedAmount)
  }));

  return (
    <PageShell
      title="线索管理"
      description="维护项目机会来源，跟踪客户需求并沉淀前期信息。"
      breadcrumbs={[
        { label: "线索" },
        { label: view === "following" ? "跟进线索" : "全部线索" }
      ]}
    >
      <ListPageShell
        config={leadListConfig}
        tabs={[
          {
            label: "全部线索",
            href: buildListHref("/leads", {
              q: params.q,
              pageSize: params.pageSize,
              sortBy: params.sortBy,
              sortOrder: params.sortOrder,
              filters: omitListFilters(params.filters, ["status"])
            }),
            active: view === "all"
          },
          {
            label: "重点跟进",
            href: buildListHref("/leads", {
              view: "following",
              q: params.q,
              pageSize: params.pageSize,
              sortBy: params.sortBy,
              sortOrder: params.sortOrder,
              filters: {
                ...params.filters,
                status: params.filters.status || "FOLLOWING"
              }
            }),
            active: view === "following"
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
