import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock3, FileText, Target, XCircle } from "lucide-react";

import { OpportunityContractApprovalPanel } from "@/components/opportunity-contract-approval-panel";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { requireSessionUser } from "@/lib/auth";
import { approvalStatusLabels, opportunityStageLabels } from "@/lib/constants";
import { AppError } from "@/lib/errors";
import { requirePagePermission, canAccessRecord } from "@/lib/rbac";
import { decimalToNumber } from "@/modules/core/decimal";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { opportunityContractApprovalService } from "@/modules/opportunity-contract-approvals/service";

function getBadgeVariant(status: string) {
  if (status === "approved") return "success";
  if (status === "rejected") return "danger";
  return "default";
}

function getStatusMeta(status: string) {
  if (status === "approved") {
    return {
      icon: CheckCircle2,
      title: "审批已通过",
      description: "当前商机已经完成转合同审批，可继续进入合同创建或生成合同草稿。",
      tone: "success" as const,
      iconClassName: "bg-[rgba(16,185,129,0.10)] text-[rgb(4,120,87)]"
    };
  }

  if (status === "rejected") {
    return {
      icon: XCircle,
      title: "审批已驳回",
      description: "当前申请未通过，需要补充信息后重新发起转合同审批。",
      tone: "danger" as const,
      iconClassName: "bg-[rgba(239,68,68,0.10)] text-[rgb(185,28,28)]"
    };
  }

  return {
    icon: Clock3,
    title: "等待审批",
    description: "申请已提交，等待审批人处理后才能继续进入合同流程。",
    tone: "default" as const,
    iconClassName: "bg-[rgba(59,130,246,0.10)] text-[rgb(37,99,235)]"
  };
}

export default async function ContractApprovalDetailPage({ params }: { params: { id: string } }) {
  const user = await requirePagePermission(requireSessionUser(), "contractApproval", "view");
  const approval = await opportunityContractApprovalService.getById(params.id, user).catch((error) => {
    if (error instanceof AppError) {
      if (error.code === "FORBIDDEN") {
        return null;
      }

      if (error.code === "NOT_FOUND") {
        notFound();
      }
    }

    throw error;
  });
  const canReview = canAccessRecord(user, "contractApproval", "status");
  const canCreateContract = canAccessRecord(user, "contract", "create");
  const statusMeta = approval ? getStatusMeta(approval.status) : null;

  if (!approval) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="合同审批详情"
          description="当前账号不能查看这条审批单详情。"
          breadcrumbs={[
            { label: "合同审批", href: "/contract-approvals" },
            { label: "无权限" }
          ]}
          backHref="/contract-approvals"
          backLabel="返回审批列表"
          backInActions
        />
        <SectionCard title="无法查看审批单">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>这条审批单不在你当前角色的可见范围内，通常只有申请人、审批人和管理员可以打开详情。</p>
            <p>如果你只是想知道这个商机当前是否有转合同审批，请回到商机详情页查看审批状态。</p>
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="合同审批单"
        description={`审批单号：${approval.id.slice(0, 8)} · 围绕商机转合同的审批结论与后续动作统一查看。`}
        breadcrumbs={[
          { label: "合同审批", href: "/contract-approvals" },
          { label: approval.id.slice(0, 8) }
        ]}
        backHref="/contract-approvals"
        backLabel="合同审批"
        backInActions
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <SectionCard title="审批结果" description="当前审批结论与处理进度。">
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] ${statusMeta?.iconClassName}`}>
                {statusMeta ? <statusMeta.icon className="h-5 w-5" /> : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-[20px] font-semibold tracking-[-0.03em] text-foreground">{statusMeta?.title}</div>
                  <Badge variant={getBadgeVariant(approval.status)}>
                    {approvalStatusLabels[approval.status as keyof typeof approvalStatusLabels] ?? approval.status}
                  </Badge>
                </div>
                <div className="mt-2 text-sm leading-6 text-muted-foreground">{statusMeta?.description}</div>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard label="申请人" value={approval.applicantName || "-"} />
              <SummaryCard label="审批人" value={approval.approverName || "-"} />
              <SummaryCard label="提交时间" value={formatDateTime(approval.submittedAt)} />
              <SummaryCard
                label={approval.status === "approved" ? "通过时间" : approval.status === "rejected" ? "驳回时间" : "当前状态"}
                value={
                  approval.status === "approved"
                    ? formatDateTime(approval.approvedAt)
                    : approval.status === "rejected"
                      ? formatDateTime(approval.rejectedAt)
                      : "待处理"
                }
              />
            </div>
          </div>
        </SectionCard>
        <div className="grid gap-6">
          <MetricTile label="关联网商机" value={approval.opportunity.code} note={approval.opportunity.name} icon={Target} />
          <MetricTile
            label="合同动作"
            value={approval.createdContract ? approval.createdContract.code : approval.status === "approved" ? "待创建" : "未开放"}
            note={approval.createdContract ? "已生成合同" : approval.status === "approved" ? "可进入合同流程" : "待审批完成"}
            icon={FileText}
          />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard
          title="商机摘要"
          description="审批人最关心的业务背景信息，直接围绕商机推进和合同准备展开。"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <InfoBlock
              label="商机名称"
              value={
                <Link href={`/opportunities/${approval.opportunity.id}`} className="hover:text-[var(--color-primary)]">
                  {approval.opportunity.name}
                </Link>
              }
            />
            <InfoBlock
              label="商机阶段"
              value={opportunityStageLabels[approval.opportunity.stage as keyof typeof opportunityStageLabels] ?? approval.opportunity.stage}
            />
            <InfoBlock label="所属客户" value={approval.opportunity.customer.name} />
            <InfoBlock label="商机金额" value={formatCurrency(decimalToNumber(approval.opportunity.amount))} />
            <InfoBlock label="预估收入" value={formatCurrency(decimalToNumber(approval.opportunity.estimatedRevenue ?? approval.opportunity.amount))} />
            <InfoBlock label="预计签约日期" value={formatDate(approval.opportunity.expectedSignDate)} />
            <div className="md:col-span-2">
              <InfoBlock label="商机说明" value={approval.opportunity.description || "-"} />
            </div>
            <div className="md:col-span-2">
              <InfoBlock
                label="下游项目"
                value={
                  approval.opportunity.projects.length ? (
                    <div className="flex flex-wrap gap-2">
                      {approval.opportunity.projects.map((project: any) => (
                        <Link
                          key={project.id}
                          href={`/projects/${project.id}`}
                          className="rounded-[10px] border border-border bg-[var(--color-background)] px-3 py-1.5 text-sm hover:bg-[var(--color-hover)]"
                        >
                          {project.code} / {project.name}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    "当前尚未转为项目"
                  )
                }
              />
            </div>
          </div>
        </SectionCard>

        <div className="space-y-6">
          <OpportunityContractApprovalPanel
            opportunityId={approval.opportunity.id}
            latestApproval={approval}
            defaultProjectId={approval.opportunity.projects[0]?.id}
            canApply={false}
            canReview={canReview}
            canCreateContract={canCreateContract && Boolean(approval.opportunity.projects[0]?.id)}
            canAutoCreateContract={canCreateContract && Boolean(approval.opportunity.projects[0]?.id)}
          />
          {approval.approvalComment ? (
            <SectionCard title="审批意见" description="保留本次申请的审批说明，便于申请人与审批人对齐结论。">
              <div className="rounded-[12px] border border-border bg-[var(--color-background)] px-4 py-3 text-sm leading-6 text-muted-foreground">
                {approval.approvalComment}
              </div>
            </SectionCard>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-border bg-[var(--color-background)] px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1.5 text-sm font-medium leading-6 text-foreground">{value}</div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  note,
  icon: Icon
}: {
  label: string;
  value: string;
  note: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-[18px] border border-border bg-white px-5 py-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-2 text-[18px] font-semibold tracking-[-0.02em] text-foreground">{value}</div>
          <div className="mt-1.5 text-sm text-muted-foreground">{note}</div>
        </div>
        <div className="mt-0.5 text-muted-foreground/70">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-[12px] border border-border bg-[var(--color-background)] px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1.5 text-sm leading-6 text-foreground">{value}</div>
    </div>
  );
}
