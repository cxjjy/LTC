import Link from "next/link";

import { DetailGrid } from "@/components/detail-grid";
import { LtcChain } from "@/components/ltc-chain";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { opportunityStageLabels } from "@/lib/constants";
import { requireSessionUser } from "@/lib/auth";
import { auditLogModuleService } from "@/modules/audit-logs/service";
import { decimalToNumber } from "@/modules/core/decimal";
import { opportunityService } from "@/modules/opportunities/service";
import { OpportunityConvertForm } from "@/modules/opportunities/ui/convert-form";
import { formatCurrency } from "@/lib/utils";

export default async function OpportunityDetailPage({ params }: { params: { id: string } }) {
  const user = await requireSessionUser();
  const opportunity = (await opportunityService.getDetail(params.id, user)) as any;
  const audits = (await auditLogModuleService.listByEntity("OPPORTUNITY", opportunity.id, user)) as any[];

  return (
    <div className="space-y-6">
      <PageHeader title={opportunity.name} description={`商机编号：${opportunity.code}`} actionLabel="编辑商机" actionHref={`/opportunities/${opportunity.id}/edit`} />
      <LtcChain
        nodes={[
          opportunity.lead
            ? {
                label: "Lead",
                value: opportunity.lead.title,
                href: `/leads/${opportunity.lead.id}`
              }
            : null,
          {
            label: "Opportunity",
            value: opportunity.name,
            status: opportunityStageLabels[opportunity.stage as keyof typeof opportunityStageLabels],
            href: `/opportunities/${opportunity.id}`,
            active: true
          }
        ].filter(Boolean) as any}
      />
      <DetailGrid
        title="基本信息"
        items={[
          { label: "所属客户", value: <Link href={`/customers/${opportunity.customer.id}`}>{opportunity.customer.name}</Link> },
          { label: "阶段", value: opportunityStageLabels[opportunity.stage as keyof typeof opportunityStageLabels] },
          { label: "金额", value: formatCurrency(decimalToNumber(opportunity.amount)) },
          { label: "赢率", value: `${opportunity.winRate}%` },
          {
            label: "上游线索",
            value: opportunity.lead ? <Link href={`/leads/${opportunity.lead.id}`}>{opportunity.lead.title}</Link> : "无"
          },
          { label: "描述", value: opportunity.description || "-" }
        ]}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="下游项目">
          <div className="space-y-3 text-sm">
            {opportunity.projects.length ? (
              opportunity.projects.map((project: any) => (
                <Link key={project.id} href={`/projects/${project.id}`} className="block rounded-[12px] border border-border bg-[var(--color-background)] p-3 hover:bg-[var(--color-hover)]">
                  {project.code} / {project.name}
                </Link>
              ))
            ) : (
              <div className="text-muted-foreground">当前尚无项目</div>
            )}
          </div>
        </SectionCard>
        <OpportunityConvertForm opportunityId={opportunity.id} defaultName={`${opportunity.name} 项目`} />
      </div>
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
  );
}
