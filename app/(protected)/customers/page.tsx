import { ListPageShell } from "@/components/list-page-shell";
import { PageShell } from "@/components/page-shell";
import { requireSessionUser } from "@/lib/auth";
import { buildListHref, normalizeListParams } from "@/lib/pagination";
import { formatDate } from "@/lib/utils";
import type { PageSearchParams } from "@/types/common";
import { customerService } from "@/modules/customers/service";
import { customerListConfig } from "@/modules/customers/ui/config";

export default async function CustomersPage({ searchParams }: { searchParams: PageSearchParams }) {
  const user = await requireSessionUser();
  const params = normalizeListParams(searchParams);
  const view = typeof searchParams.view === "string" ? searchParams.view : "all";
  const result = await customerService.list(params, user);
  const rows = result.items.map((item: any) => ({
    code: item.code,
    codeHref: `/customers/${item.id}`,
    name: item.name,
    industry: item.industry || "-",
    contactName: item.contactName || "-",
    contactPhone: item.contactPhone || "-",
    createdAt: formatDate(item.createdAt)
  }));

  return (
    <PageShell
      title="客户管理"
      description="维护客户基础信息，为项目和合同提供支撑。"
      breadcrumbs={[
        { label: "客户" },
        { label: view === "mine" ? "我的客户" : "全部客户" }
      ]}
    >
      <ListPageShell
        config={customerListConfig}
        tabs={[
          {
            label: "全部客户",
            href: buildListHref("/customers", {
              q: params.q,
              pageSize: params.pageSize,
              sortBy: params.sortBy,
              sortOrder: params.sortOrder,
              filters: params.filters
            }),
            active: view === "all"
          },
          {
            label: "我的客户",
            href: buildListHref("/customers", {
              view: "mine",
              q: params.q,
              pageSize: params.pageSize,
              sortBy: params.sortBy,
              sortOrder: params.sortOrder,
              filters: params.filters
            }),
            active: view === "mine"
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
