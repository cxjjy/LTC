import { ListPageShell } from "@/components/list-page-shell";
import { PageShell } from "@/components/page-shell";
import { requireSessionUser } from "@/lib/auth";
import { getDeleteCopy } from "@/lib/delete-config";
import { buildListHref, normalizeListParams } from "@/lib/pagination";
import { canAccessRecord, requirePagePermission } from "@/lib/rbac";
import { formatDate } from "@/lib/utils";
import type { PageSearchParams } from "@/types/common";
import { customerService } from "@/modules/customers/service";
import { customerListConfig } from "@/modules/customers/ui/config";

export default async function CustomersPage({ searchParams }: { searchParams: PageSearchParams }) {
  const user = await requirePagePermission(requireSessionUser(), "customer", "view");
  const canCreate = canAccessRecord(user, "customer", "create");
  const canUpdate = canAccessRecord(user, "customer", "update");
  const canDelete = canAccessRecord(user, "customer", "delete");
  const deleteCopy = getDeleteCopy("customer");
  const params = normalizeListParams(searchParams);
  const view = typeof searchParams.view === "string" ? searchParams.view : "all";
  const result = await customerService.list(params, user);
  const exportResult =
    result.total > result.items.length
      ? await customerService.list({ ...params, page: 1, pageSize: result.total }, user)
      : result;
  const mapRow = (item: any) => ({
    code: item.code,
    codeHref: `/customers/${item.id}`,
    name: item.name,
    industry: item.industry || "-",
    contactName: item.contactName || "-",
    contactPhone: item.contactPhone || "-",
    createdAt: formatDate(item.createdAt),
    rowActions: {
      moduleLabel: deleteCopy.moduleLabel,
      recordLabel: `${item.code} / ${item.name}`,
      viewHref: `/customers/${item.id}`,
      editHref: canUpdate ? `/customers/${item.id}/edit` : undefined,
      deleteEndpoint: canDelete ? `/api/customers/${item.id}` : undefined,
      deleteWarning: deleteCopy.warning
    }
  });
  const rows = result.items.map(mapRow);
  const exportRows = exportResult.items.map(mapRow);

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
        canCreate={canCreate}
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
        exportRows={exportRows}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        totalPages={result.totalPages}
      />
    </PageShell>
  );
}
