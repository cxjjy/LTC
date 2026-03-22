import Link from "next/link";

import { DetailGrid } from "@/components/detail-grid";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { requireSessionUser } from "@/lib/auth";
import { auditLogModuleService } from "@/modules/audit-logs/service";
import { customerService } from "@/modules/customers/service";

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const user = await requireSessionUser();
  const customer = (await customerService.getDetail(params.id, user)) as any;
  const audits = (await auditLogModuleService.listByEntity("CUSTOMER", customer.id, user)) as any[];

  return (
    <div className="space-y-6">
      <PageHeader title={customer.name} description={`客户编号：${customer.code}`} actionLabel="编辑客户" actionHref={`/customers/${customer.id}/edit`} />
      <DetailGrid
        title="基本信息"
        items={[
          { label: "客户编号", value: customer.code },
          { label: "行业", value: customer.industry || "-" },
          { label: "联系人", value: customer.contactName || "-" },
          { label: "联系电话", value: customer.contactPhone || "-" },
          { label: "地址", value: customer.address || "-" },
          { label: "备注", value: customer.remark || "-" }
        ]}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="上下游关联">
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <div className="rounded-[12px] border border-border bg-[var(--color-background)] p-4">线索数量：{customer.leads.length}</div>
            <div className="rounded-[12px] border border-border bg-[var(--color-background)] p-4">商机数量：{customer.opportunities.length}</div>
            <div className="rounded-[12px] border border-border bg-[var(--color-background)] p-4">项目数量：{customer.projects.length}</div>
            <div className="rounded-[12px] border border-border bg-[var(--color-background)] p-4">合同数量：{customer.contracts.length}</div>
          </div>
        </SectionCard>
        <SectionCard title="审计日志">
          <div className="space-y-3 text-sm">
            {audits.map((item) => (
              <Link key={item.id} href={`/audit-logs/${item.id}`} className="block rounded-[12px] border border-border bg-[var(--color-background)] p-3 hover:bg-[var(--color-hover)]">
                <div className="font-medium">{item.message}</div>
                <div className="text-muted-foreground">{new Date(item.createdAt).toLocaleString("zh-CN")}</div>
              </Link>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
