import Link from "next/link";

import { DeleteAction } from "@/components/delete-action";
import { DetailGrid } from "@/components/detail-grid";
import { LtcChain } from "@/components/ltc-chain";
import { OpportunityContractApprovalPanel } from "@/components/opportunity-contract-approval-panel";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { opportunityStageLabels } from "@/lib/constants";
import { requireSessionUser } from "@/lib/auth";
import { getDeleteCopy } from "@/lib/delete-config";
import { canAccessRecord, requirePagePermission } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { auditLogModuleService } from "@/modules/audit-logs/service";
import { decimalToNumber } from "@/modules/core/decimal";
import { calculateOpportunityEstimate } from "@/modules/opportunities/profit";
import { opportunityService } from "@/modules/opportunities/service";
import { OpportunityConvertForm } from "@/modules/opportunities/ui/convert-form";
import { opportunityContractApprovalService } from "@/modules/opportunity-contract-approvals/service";
import { formatCurrency } from "@/lib/utils";

export default async function OpportunityDetailPage({ params }: { params: { id: string } }) {
  const user = await requirePagePermission(requireSessionUser(), "opportunity", "view");
  const canUpdate = canAccessRecord(user, "opportunity", "update");
  const canDelete = canAccessRecord(user, "opportunity", "delete");
  const canViewAuditLog = canAccessRecord(user, "auditLog", "view");
  const canViewContractApproval = canAccessRecord(user, "contractApproval", "view");
  const canApplyContractApproval = canAccessRecord(user, "contractApproval", "create");
  const canReviewContractApproval = canAccessRecord(user, "contractApproval", "status");
  const canCreateContract = canAccessRecord(user, "contract", "create");
  const deleteCopy = getDeleteCopy("opportunity");
  const opportunity = (await opportunityService.getDetail(params.id, user)) as any;
  const latestApproval = canViewContractApproval
    ? await opportunityContractApprovalService.getLatestByOpportunity(params.id, user)
    : null;
  const audits = canViewAuditLog
    ? ((await auditLogModuleService.listByEntity("OPPORTUNITY", opportunity.id, user)) as any[])
    : [];
  const estimate = calculateOpportunityEstimate({
    estimatedRevenue: decimalToNumber(opportunity.estimatedRevenue ?? opportunity.amount),
    estimatedLaborCost: decimalToNumber(opportunity.estimatedLaborCost),
    estimatedOutsourceCost: decimalToNumber(opportunity.estimatedOutsourceCost),
    estimatedProcurementCost: decimalToNumber(opportunity.estimatedProcurementCost),
    estimatedTravelCost: decimalToNumber(opportunity.estimatedTravelCost),
    estimatedOtherCost: decimalToNumber(opportunity.estimatedOtherCost)
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={opportunity.name}
        description={`商机编号：${opportunity.code}`}
        breadcrumbs={[
          { label: "商机管理", href: "/opportunities" },
          { label: opportunity.code }
        ]}
        backHref="/opportunities"
        backLabel="商机管理"
        backInActions
        actions={
          <>
            {canUpdate ? (
              <Button asChild>
                <Link href={`/opportunities/${opportunity.id}/edit`}>编辑商机</Link>
              </Button>
            ) : null}
            {canDelete ? (
              <DeleteAction
                moduleLabel={deleteCopy.moduleLabel}
                recordLabel={`${opportunity.code} / ${opportunity.name}`}
                endpoint={`/api/opportunities/${opportunity.id}`}
                warning={deleteCopy.warning}
                redirectTo={deleteCopy.listPath}
              />
            ) : null}
          </>
        }
      />
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
          { label: "商机金额", value: formatCurrency(decimalToNumber(opportunity.amount)) },
          { label: "赢率", value: `${opportunity.winRate}%` },
          {
            label: "上游线索",
            value: opportunity.lead ? <Link href={`/leads/${opportunity.lead.id}`}>{opportunity.lead.title}</Link> : "无"
          },
          { label: "描述", value: opportunity.description || "-" }
        ]}
      />
      <SectionCard title="商业测算 / 毛利预估" description="在售前阶段快速评估收入、成本与利润空间。">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <MetricCard label="预估收入" value={formatCurrency(estimate.estimatedRevenue)} note="售前收入预测" />
            <MetricCard label="人工成本" value={formatCurrency(estimate.estimatedLaborCost)} note="顾问与实施投入" />
            <MetricCard label="外包成本" value={formatCurrency(estimate.estimatedOutsourceCost)} note="外部服务支出" />
            <MetricCard label="采购成本" value={formatCurrency(estimate.estimatedProcurementCost)} note="软硬件与物料采购" />
            <MetricCard label="差旅成本" value={formatCurrency(estimate.estimatedTravelCost)} note="现场差旅预算" />
            <MetricCard label="其他成本" value={formatCurrency(estimate.estimatedOtherCost)} note="其他测算支出" />
          </div>
          <div className="rounded-[16px] border border-border bg-[var(--color-background)] p-5">
            <div className="text-sm font-medium text-foreground">测算汇总</div>
            <div className="mt-4 grid gap-4">
              <MetricSummary label="成本合计" value={formatCurrency(estimate.estimatedTotalCost)} />
              <MetricSummary label="预估毛利" value={formatCurrency(estimate.estimatedProfit)} />
              <MetricSummary label="毛利率" value={`${estimate.estimatedProfitMargin.toFixed(1)}%`} />
            </div>
            <div
              className={`mt-5 rounded-[12px] px-4 py-3 text-sm ${
                estimate.riskLevel === "high_risk"
                  ? "bg-[rgba(239,68,68,0.08)] text-[rgb(185,28,28)]"
                  : estimate.riskLevel === "low_margin"
                    ? "bg-[rgba(245,158,11,0.10)] text-[rgb(180,83,9)]"
                    : "bg-[rgba(16,185,129,0.10)] text-[rgb(4,120,87)]"
              }`}
            >
              <div className="font-medium">{estimate.riskLabel}</div>
              <div className="mt-1 text-xs opacity-90">
                {estimate.riskLevel === "high_risk"
                  ? "毛利率低于 10%，建议立即复核报价、范围和交付方式。"
                  : estimate.riskLevel === "low_margin"
                    ? "毛利率低于 20%，建议重点跟进成本和报价边界。"
                    : "当前测算结果良好，可继续推进售前评审和项目准备。"}
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
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
      {canViewContractApproval ? (
        <OpportunityContractApprovalPanel
          opportunityId={opportunity.id}
          latestApproval={latestApproval}
          defaultProjectId={opportunity.projects[0]?.id}
          canApply={canApplyContractApproval}
          canReview={canReviewContractApproval}
          canCreateContract={canCreateContract && Boolean(opportunity.projects[0]?.id)}
          canAutoCreateContract={canCreateContract && Boolean(opportunity.projects[0]?.id)}
        />
      ) : null}
      {canViewAuditLog ? (
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
      ) : null}
    </div>
  );
}

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-[14px] border border-border bg-[var(--color-background)] p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-foreground">{value}</div>
      <div className="mt-2 text-xs text-muted-foreground">{note}</div>
    </div>
  );
}

function MetricSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border pb-3 last:border-b-0 last:pb-0">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-[24px] font-semibold tracking-[-0.03em] text-foreground">{value}</div>
    </div>
  );
}
