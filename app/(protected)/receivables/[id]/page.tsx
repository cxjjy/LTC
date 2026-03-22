import Link from "next/link";

import { DetailGrid } from "@/components/detail-grid";
import { LtcChain } from "@/components/ltc-chain";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { receivableStatusLabels } from "@/lib/constants";
import { requireSessionUser } from "@/lib/auth";
import { auditLogModuleService } from "@/modules/audit-logs/service";
import { decimalToNumber } from "@/modules/core/decimal";
import { receivableService } from "@/modules/receivables/service";
import { ReceivablePaymentForm } from "@/modules/receivables/ui/payment-form";
import { formatCurrency } from "@/lib/utils";

export default async function ReceivableDetailPage({ params }: { params: { id: string } }) {
  const user = await requireSessionUser();
  const receivable = (await receivableService.getDetail(params.id, user)) as any;
  const audits = (await auditLogModuleService.listByEntity("RECEIVABLE", receivable.id, user)) as any[];

  return (
    <div className="space-y-6">
      <PageHeader title={receivable.title} description={`回款编号：${receivable.code}`} actionLabel="编辑回款" actionHref={`/receivables/${receivable.id}/edit`} />
      <LtcChain
        nodes={[
          receivable.project.opportunity.lead
            ? {
                label: "Lead",
                value: receivable.project.opportunity.lead.title,
                href: `/leads/${receivable.project.opportunity.lead.id}`
              }
            : null,
          {
            label: "Opportunity",
            value: receivable.project.opportunity.name,
            href: `/opportunities/${receivable.project.opportunity.id}`
          },
          {
            label: "Project",
            value: receivable.project.name,
            href: `/projects/${receivable.project.id}`
          },
          {
            label: "Contract",
            value: receivable.contract.name,
            href: `/contracts/${receivable.contract.id}`
          },
          {
            label: "Receivable",
            value: receivable.title,
            status: receivableStatusLabels[receivable.status as keyof typeof receivableStatusLabels],
            href: `/receivables/${receivable.id}`,
            active: true
          }
        ].filter(Boolean) as any}
      />
      <DetailGrid
        title="基本信息"
        items={[
          { label: "所属合同", value: <Link href={`/contracts/${receivable.contract.id}`}>{receivable.contract.name}</Link> },
          { label: "所属项目", value: <Link href={`/projects/${receivable.project.id}`}>{receivable.project.name}</Link> },
          { label: "上游商机", value: <Link href={`/opportunities/${receivable.project.opportunity.id}`}>{receivable.project.opportunity.name}</Link> },
          { label: "来源线索", value: receivable.project.opportunity.lead ? <Link href={`/leads/${receivable.project.opportunity.lead.id}`}>{receivable.project.opportunity.lead.title}</Link> : "无" },
          { label: "状态", value: receivableStatusLabels[receivable.status as keyof typeof receivableStatusLabels] },
          { label: "应收金额", value: formatCurrency(decimalToNumber(receivable.amountDue)) }
        ]}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <ReceivablePaymentForm receivableId={receivable.id} defaultAmountReceived={decimalToNumber(receivable.amountReceived)} />
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
