import Link from "next/link";

import { DetailGrid } from "@/components/detail-grid";
import { LtcChain } from "@/components/ltc-chain";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { contractStatusLabels } from "@/lib/constants";
import { requireSessionUser } from "@/lib/auth";
import { auditLogModuleService } from "@/modules/audit-logs/service";
import { decimalToNumber } from "@/modules/core/decimal";
import { contractService } from "@/modules/contracts/service";
import { contractStatusOptions } from "@/modules/contracts/ui/config";
import { ContractStatusForm } from "@/modules/contracts/ui/status-form";
import { formatCurrency, toDateInputValue } from "@/lib/utils";

export default async function ContractDetailPage({ params }: { params: { id: string } }) {
  const user = await requireSessionUser();
  const contract = (await contractService.getDetail(params.id, user)) as any;
  const audits = (await auditLogModuleService.listByEntity("CONTRACT", contract.id, user)) as any[];

  return (
    <div className="space-y-6">
      <PageHeader title={contract.name} description={`合同编号：${contract.code}`} actionLabel="编辑合同" actionHref={`/contracts/${contract.id}/edit`} />
      <LtcChain
        nodes={[
          contract.project.opportunity.lead
            ? {
                label: "Lead",
                value: contract.project.opportunity.lead.title,
                href: `/leads/${contract.project.opportunity.lead.id}`
              }
            : null,
          {
            label: "Opportunity",
            value: contract.project.opportunity.name,
            href: `/opportunities/${contract.project.opportunity.id}`
          },
          {
            label: "Project",
            value: contract.project.name,
            href: `/projects/${contract.project.id}`
          },
          {
            label: "Contract",
            value: contract.name,
            status: contractStatusLabels[contract.status as keyof typeof contractStatusLabels],
            href: `/contracts/${contract.id}`,
            active: true
          }
        ].filter(Boolean) as any}
      />
      <DetailGrid
        title="基本信息"
        items={[
          { label: "所属项目", value: <Link href={`/projects/${contract.project.id}`}>{contract.project.name}</Link> },
          { label: "上游商机", value: <Link href={`/opportunities/${contract.project.opportunity.id}`}>{contract.project.opportunity.name}</Link> },
          { label: "来源线索", value: contract.project.opportunity.lead ? <Link href={`/leads/${contract.project.opportunity.lead.id}`}>{contract.project.opportunity.lead.title}</Link> : "无" },
          { label: "状态", value: contractStatusLabels[contract.status as keyof typeof contractStatusLabels] },
          { label: "合同金额", value: formatCurrency(decimalToNumber(contract.contractAmount)) },
          { label: "生效日期", value: toDateInputValue(contract.effectiveDate) || "-" }
        ]}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <ContractStatusForm contractId={contract.id} currentStatus={contract.status} options={contractStatusOptions} />
        <SectionCard title="回款记录列表" description="仅已生效合同可创建回款记录。">
          <div className="space-y-3 text-sm">
            {contract.receivables.length ? (
              contract.receivables.map((item: any) => (
                <Link key={item.id} href={`/receivables/${item.id}`} className="block rounded-[12px] border border-border bg-[var(--color-background)] p-3 hover:bg-[var(--color-hover)]">
                  {item.code} / {item.title}
                </Link>
              ))
            ) : (
              <div className="text-muted-foreground">暂无回款记录</div>
            )}
          </div>
        </SectionCard>
      </div>
      <SectionCard title="状态流转与审计">
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
  );
}
