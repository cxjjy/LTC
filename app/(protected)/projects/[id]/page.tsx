import Link from "next/link";
import {
  AlertTriangle,
  BriefcaseBusiness,
  CircleDollarSign,
  Download,
  FolderKanban
} from "lucide-react";
import {
  ContractStatus,
  DeliveryStatus,
  ProjectStatus,
  ReceivableStatus
} from "@prisma/client";

import { BizAttachmentManager } from "@/components/biz-attachment-manager";
import { DetailGrid } from "@/components/detail-grid";
import { DeleteAction } from "@/components/delete-action";
import { LtcChain } from "@/components/ltc-chain";
import { PageShell } from "@/components/page-shell";
import { ProjectMetricsStrip } from "@/components/project-metrics-strip";
import { ProjectStatusForm } from "@/modules/projects/ui/status-form";
import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { requireSessionUser } from "@/lib/auth";
import {
  bizAttachmentTypeLabels,
  contractStatusLabels,
  costCategoryLabels,
  deliveryStatusLabels,
  projectStatusLabels,
  receivableStatusLabels
} from "@/lib/constants";
import { getDeleteCopy } from "@/lib/delete-config";
import { prisma } from "@/lib/prisma";
import { canAccessRecord, requirePagePermission } from "@/lib/rbac";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { auditLogModuleService } from "@/modules/audit-logs/service";
import { bizAttachmentService } from "@/modules/biz-attachments/service";
import { decimalToNumber, sumDecimalValues } from "@/modules/core/decimal";
import { projectService } from "@/modules/projects/service";
import { projectStatusOptions } from "@/modules/projects/ui/config";
import type { PageSearchParams } from "@/types/common";

const detailTabs = [
  { key: "contracts", label: "合同" },
  { key: "materials", label: "资料" },
  { key: "deliveries", label: "交付" },
  { key: "costs", label: "成本" },
  { key: "receivables", label: "回款" },
  { key: "logs", label: "日志" }
] as const;

type DetailTab = (typeof detailTabs)[number]["key"];

function buildTabHref(projectId: string, tab: DetailTab) {
  return `/projects/${projectId}?tab=${tab}`;
}

function getBadgeVariantByProjectStatus(status: ProjectStatus) {
  if (status === ProjectStatus.COMPLETED) return "success";
  if (status === ProjectStatus.IN_PROGRESS) return "default";
  if (status === ProjectStatus.PAUSED) return "warning";
  if (status === ProjectStatus.CANCELED) return "danger";
  return "muted";
}

function getBadgeVariantByContractStatus(status: ContractStatus) {
  if (status === ContractStatus.EFFECTIVE) return "success";
  if (status === ContractStatus.APPROVING) return "warning";
  if (status === ContractStatus.TERMINATED) return "danger";
  return "muted";
}

function getBadgeVariantByDeliveryStatus(status: DeliveryStatus) {
  if (status === DeliveryStatus.ACCEPTED) return "success";
  if (status === DeliveryStatus.IN_PROGRESS) return "default";
  if (status === DeliveryStatus.DELAYED) return "warning";
  if (status === DeliveryStatus.CANCELED) return "danger";
  return "muted";
}

function getBadgeVariantByReceivableStatus(status: ReceivableStatus) {
  if (status === ReceivableStatus.RECEIVED) return "success";
  if (status === ReceivableStatus.PARTIAL) return "default";
  if (status === ReceivableStatus.OVERDUE) return "danger";
  return "warning";
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-24 text-center text-muted-foreground">
        {label}
      </TableCell>
    </TableRow>
  );
}

export default async function ProjectDetailPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams: PageSearchParams;
}) {
  const user = await requirePagePermission(requireSessionUser(), "project", "view");
  const canUpdate = canAccessRecord(user, "project", "update");
  const canDelete = canAccessRecord(user, "project", "delete");
  const canChangeStatus = canAccessRecord(user, "project", "status");
  const canViewAuditLog = canAccessRecord(user, "auditLog", "view");
  const canManageMaterials =
    canUpdate ||
    canAccessRecord(user, "delivery", "update") ||
    user.role === "FINANCE" ||
    user.roles.some((item) => item.code === "FINANCE" || item.code === "SUPER_ADMIN");
  const deleteCopy = getDeleteCopy("project");
  const visibleDetailTabs = canViewAuditLog ? detailTabs : detailTabs.filter((item) => item.key !== "logs");
  const activeTab = visibleDetailTabs.some((item) => item.key === searchParams.tab)
    ? (searchParams.tab as DetailTab)
    : "contracts";
  const project = (await projectService.getDetail(params.id, user)) as any;
  const [acceptanceFiles, settlementFiles, relatedContractFiles] = await Promise.all([
    bizAttachmentService.listByProject(params.id, ["acceptance"], user),
    bizAttachmentService.listByProject(params.id, ["settlement"], user),
    bizAttachmentService.listByProject(params.id, ["contract", "invoice"], user)
  ]);
  const audits = canViewAuditLog
    ? ((await auditLogModuleService.listByEntity("PROJECT", project.id, user)) as any[])
    : [];
  const users = await prisma.user.findMany({
    where: {
      id: {
        in: [project.createdBy, project.updatedBy]
      }
    },
    select: {
      id: true,
      name: true
    }
  });
  const userMap = new Map(users.map((item) => [item.id, item.name]));

  const contractAmount = sumDecimalValues(project.contracts.map((item: any) => item.contractAmount));
  const totalReceived = sumDecimalValues(project.receivables.map((item: any) => item.amountReceived));
  const totalDue = sumDecimalValues(project.receivables.map((item: any) => item.amountDue));
  const totalCost = sumDecimalValues(project.costs.map((item: any) => item.amount));
  const grossProfit = contractAmount - totalCost;
  const unreceivedAmount = Math.max(totalDue - totalReceived, 0);
  const budgetAmount = decimalToNumber(project.budgetAmount);
  const overdueReceivables = project.receivables.filter(
    (item: any) =>
      item.status === ReceivableStatus.OVERDUE ||
      (item.dueDate && new Date(item.dueDate) < new Date() && item.status !== ReceivableStatus.RECEIVED)
  );
  const delayedDeliveries = project.deliveries.filter(
    (item: any) => item.status === DeliveryStatus.DELAYED
  );
  const overBudget = budgetAmount > 0 && totalCost > budgetAmount;
  const receivedProgress = contractAmount > 0 ? (totalReceived / contractAmount) * 100 : 0;
  const budgetRatio = budgetAmount > 0 ? (totalCost / budgetAmount) * 100 : null;
  const grossMargin = contractAmount > 0 ? (grossProfit / contractAmount) * 100 : null;
  const overdueSummary = overdueReceivables.length ? `${overdueReceivables.length} 笔逾期` : "待跟进";

  const metrics = [
    {
      label: "合同金额",
      value: formatCurrency(contractAmount),
      meta: "总收入",
      tone: "default" as const
    },
    {
      label: "已回款",
      value: formatCurrency(totalReceived),
      meta: `到账进度 ${receivedProgress.toFixed(1)}%`,
      tone: receivedProgress > 0 ? ("success" as const) : ("default" as const)
    },
    {
      label: "未回款",
      value: formatCurrency(unreceivedAmount),
      meta: overdueReceivables.length ? `待跟进 · ${overdueSummary}` : "待跟进",
      tone: overdueReceivables.length ? ("warning" as const) : ("default" as const)
    },
    {
      label: "成本",
      value: formatCurrency(totalCost),
      meta: budgetRatio !== null ? `预算占比 ${budgetRatio.toFixed(1)}%` : "累计成本",
      tone: overBudget ? ("warning" as const) : ("default" as const)
    },
    {
      label: "毛利",
      value: formatCurrency(grossProfit),
      meta: grossMargin !== null ? `毛利率 ${grossMargin.toFixed(1)}%` : "当前毛利",
      tone: grossProfit < 0 ? ("danger" as const) : ("success" as const)
    }
  ];

  return (
    <PageShell
      title={project.name}
      description="项目经营控制中心，围绕收入、成本、回款、交付和风险统一查看。"
      breadcrumbs={[
        { label: "项目管理", href: "/projects" },
        { label: project.code }
      ]}
      backHref="/projects"
      backLabel="项目管理"
      backInActions
      headerAction={
        <div className="flex flex-wrap items-center gap-3">
          {canUpdate ? (
            <Button asChild>
              <Link href={`/projects/${project.id}/edit`}>编辑项目</Link>
            </Button>
          ) : null}
          {canDelete ? (
            <DeleteAction
              moduleLabel={deleteCopy.moduleLabel}
              recordLabel={`${project.code} / ${project.name}`}
              endpoint={`/api/projects/${project.id}`}
              warning={deleteCopy.warning}
              redirectTo={deleteCopy.listPath}
            />
          ) : null}
        </div>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <div className="space-y-4">
          <LtcChain
            title="项目关联链路"
            nodes={[
              project.opportunity.lead
                ? {
                    label: "Lead",
                    value: project.opportunity.lead.title,
                    href: `/leads/${project.opportunity.lead.id}`
                  }
                : null,
              {
                label: "Opportunity",
                value: project.opportunity.name,
                href: `/opportunities/${project.opportunity.id}`
              },
              {
                label: "Project",
                value: project.name,
                status: projectStatusLabels[project.status as keyof typeof projectStatusLabels],
                href: `/projects/${project.id}`,
                active: true
              }
            ].filter(Boolean) as any}
          />
          <DetailGrid
            title="项目基本信息"
            items={[
              { label: "项目名称", value: project.name },
              { label: "项目编号", value: project.code },
              { label: "客户", value: <Link href={`/customers/${project.customer.id}`}>{project.customer.name}</Link> },
              { label: "项目经理", value: userMap.get(project.createdBy) || "暂未指定" },
              {
                label: "项目状态",
                value: (
                  <Badge variant={getBadgeVariantByProjectStatus(project.status)}>
                    {projectStatusLabels[project.status as keyof typeof projectStatusLabels]}
                  </Badge>
                )
              },
              { label: "开始时间", value: formatDate(project.plannedStartDate) },
              { label: "结束时间", value: formatDate(project.plannedEndDate) },
              { label: "预算金额", value: formatCurrency(decimalToNumber(project.budgetAmount)) },
              { label: "上游商机", value: <Link href={`/opportunities/${project.opportunity.id}`}>{project.opportunity.name}</Link> }
            ]}
          />
        </div>

        <div className="space-y-4">
          {canChangeStatus ? (
            <ProjectStatusForm projectId={project.id} currentStatus={project.status} options={projectStatusOptions} />
          ) : null}
          <SectionCard title="经营提示" description="围绕资金、交付和成本快速识别当前风险。">
            <div className="space-y-3">
              <div className="rounded-[12px] border border-border bg-[var(--color-background)] p-4">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                    <AlertTriangle className="h-4 w-4 text-[var(--color-warning)]" />
                    逾期回款
                  </div>
                  <Badge variant={overdueReceivables.length ? "danger" : "success"}>
                    {overdueReceivables.length} 项
                  </Badge>
                </div>
              </div>
              <div className="rounded-[12px] border border-border bg-[var(--color-background)] p-4">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                    <BriefcaseBusiness className="h-4 w-4 text-[var(--color-warning)]" />
                    延期交付
                  </div>
                  <Badge variant={delayedDeliveries.length ? "warning" : "success"}>
                    {delayedDeliveries.length} 项
                  </Badge>
                </div>
              </div>
              <div className="rounded-[12px] border border-border bg-[var(--color-background)] p-4">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                    <CircleDollarSign className="h-4 w-4 text-[var(--color-warning)]" />
                    成本控制
                  </div>
                  <Badge variant={overBudget ? "warning" : "success"}>
                    {overBudget ? "超预算" : "正常"}
                  </Badge>
                </div>
                <div className="mt-3 text-sm text-muted-foreground">
                  当前预算 {formatCurrency(budgetAmount)}，累计成本 {formatCurrency(totalCost)}
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      <ProjectMetricsStrip items={metrics} />

      <section className="workspace-panel overflow-hidden">
        <div className="flex items-center gap-7 border-b border-[rgba(229,231,235,0.9)] px-6">
          {visibleDetailTabs.map((tab) => (
            <Link
              key={tab.key}
              href={buildTabHref(project.id, tab.key)}
              scroll={false}
              className={`inline-flex h-12 items-center border-b-2 px-1 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "workspace-tab-active"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        <div className="px-6 py-5">
          {activeTab === "contracts" ? (
            <SectionCard
              title="合同收入"
              description="以项目为中心查看全部合同金额与当前状态。"
              className="border-0 shadow-none"
              contentClassName="px-0 pb-0 pt-0 md:px-0"
            >
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>合同编号</TableHead>
                      <TableHead>合同名称</TableHead>
                      <TableHead>金额</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>生效时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {project.contracts.length ? (
                      project.contracts.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Link href={`/contracts/${item.id}`} className="font-medium hover:text-[var(--color-primary)]">
                              {item.code}
                            </Link>
                          </TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{formatCurrency(item.contractAmount)}</TableCell>
                          <TableCell>
                            <Badge variant={getBadgeVariantByContractStatus(item.status)}>
                              {contractStatusLabels[item.status as keyof typeof contractStatusLabels]}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(item.effectiveDate)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <EmptyRow colSpan={5} label="暂无合同数据" />
                    )}
                  </TableBody>
                </Table>
              </div>
            </SectionCard>
          ) : null}

          {activeTab === "materials" ? (
            <div className="space-y-6">
              <BizAttachmentManager
                title="项目验收单"
                description="归档验收确认单、验收报告等项目完工资料。"
                uploadLabel="上传验收单"
                emptyLabel="当前项目还没有验收资料。"
                bizType="acceptance"
                bizId={project.id}
                projectId={project.id}
                uploadUrl={`/api/projects/${project.id}/biz-attachments`}
                attachments={acceptanceFiles}
                canManage={canManageMaterials}
              />
              <BizAttachmentManager
                title="项目结算单"
                description="维护项目结算、补差和收尾资料。"
                uploadLabel="上传结算单"
                emptyLabel="当前项目还没有结算资料。"
                bizType="settlement"
                bizId={project.id}
                projectId={project.id}
                uploadUrl={`/api/projects/${project.id}/biz-attachments`}
                attachments={settlementFiles}
                canManage={canManageMaterials}
              />
              <SectionCard
                title="关联合同资料"
                description="汇总展示该项目下的合同电子版和发票附件，便于按项目整体查看。"
              >
                <div className="space-y-3">
                  {relatedContractFiles.length ? (
                    relatedContractFiles.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex flex-col gap-3 rounded-[12px] border border-border bg-[var(--color-background)] px-4 py-3 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground">{item.fileName}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {bizAttachmentTypeLabels[item.bizType as keyof typeof bizAttachmentTypeLabels] ?? item.bizType} ·{" "}
                            {formatDateTime(item.uploadedAt)}
                          </div>
                          {item.remark ? <div className="mt-2 text-xs text-muted-foreground">备注：{item.remark}</div> : null}
                        </div>
                        <Button asChild variant="outline" size="sm">
                          <Link href={item.fileUrl}>
                            <Download className="h-4 w-4" />
                            下载
                          </Link>
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[12px] border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                      当前项目下暂无关联合同资料。
                    </div>
                  )}
                </div>
              </SectionCard>
            </div>
          ) : null}

          {activeTab === "deliveries" ? (
            <SectionCard
              title="交付执行"
              description="查看交付任务、负责人和当前执行状态。"
              className="border-0 shadow-none"
              contentClassName="px-0 pb-0 pt-0 md:px-0"
            >
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>交付编号</TableHead>
                      <TableHead>交付任务</TableHead>
                      <TableHead>负责人</TableHead>
                      <TableHead>进度状态</TableHead>
                      <TableHead>计划日期</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {project.deliveries.length ? (
                      project.deliveries.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Link href={`/deliveries/${item.id}`} className="font-medium hover:text-[var(--color-primary)]">
                              {item.code}
                            </Link>
                          </TableCell>
                          <TableCell>{item.title}</TableCell>
                          <TableCell>{item.ownerName || "未分配"}</TableCell>
                          <TableCell>
                            <Badge variant={getBadgeVariantByDeliveryStatus(item.status)}>
                              {deliveryStatusLabels[item.status as keyof typeof deliveryStatusLabels]}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(item.plannedDate)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <EmptyRow colSpan={5} label="暂无交付任务" />
                    )}
                  </TableBody>
                </Table>
              </div>
            </SectionCard>
          ) : null}

          {activeTab === "costs" ? (
            <SectionCard
              title="成本记录"
              description="查看项目成本结构和累计支出情况。"
              className="border-0 shadow-none"
              contentClassName="px-0 pb-0 pt-0 md:px-0"
            >
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>成本编号</TableHead>
                      <TableHead>成本项</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>金额</TableHead>
                      <TableHead>发生日期</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {project.costs.length ? (
                      project.costs.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Link href={`/costs/${item.id}`} className="font-medium hover:text-[var(--color-primary)]">
                              {item.code}
                            </Link>
                          </TableCell>
                          <TableCell>{item.title}</TableCell>
                          <TableCell>{costCategoryLabels[item.category as keyof typeof costCategoryLabels]}</TableCell>
                          <TableCell>{formatCurrency(item.amount)}</TableCell>
                          <TableCell>{formatDate(item.occurredAt)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <EmptyRow colSpan={5} label="暂无成本记录" />
                    )}
                  </TableBody>
                </Table>
              </div>
            </SectionCard>
          ) : null}

          {activeTab === "receivables" ? (
            <SectionCard
              title="回款记录"
              description="以项目维度查看应收、实收和回款状态。"
              className="border-0 shadow-none"
              contentClassName="px-0 pb-0 pt-0 md:px-0"
            >
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>回款编号</TableHead>
                      <TableHead>回款名称</TableHead>
                      <TableHead>应收</TableHead>
                      <TableHead>实收</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>到期日期</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {project.receivables.length ? (
                      project.receivables.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Link href={`/receivables/${item.id}`} className="font-medium hover:text-[var(--color-primary)]">
                              {item.code}
                            </Link>
                          </TableCell>
                          <TableCell>{item.title}</TableCell>
                          <TableCell>{formatCurrency(item.amountDue)}</TableCell>
                          <TableCell>{formatCurrency(item.amountReceived)}</TableCell>
                          <TableCell>
                            <Badge variant={getBadgeVariantByReceivableStatus(item.status)}>
                              {receivableStatusLabels[item.status as keyof typeof receivableStatusLabels]}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(item.dueDate)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <EmptyRow colSpan={6} label="暂无回款记录" />
                    )}
                  </TableBody>
                </Table>
              </div>
            </SectionCard>
          ) : null}

          {activeTab === "logs" ? (
            <SectionCard
              title="项目日志"
              description="记录项目关键状态变化、更新与转换动作。"
              className="border-0 shadow-none"
              contentClassName="px-0 pb-0 pt-0 md:px-0"
            >
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>时间</TableHead>
                      <TableHead>动作</TableHead>
                      <TableHead>内容</TableHead>
                      <TableHead>详情</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {audits.length ? (
                      audits.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{formatDateTime(item.createdAt)}</TableCell>
                          <TableCell>{item.action}</TableCell>
                          <TableCell>{item.message}</TableCell>
                          <TableCell>
                            <Link href={`/audit-logs/${item.id}`} className="font-medium hover:text-[var(--color-primary)]">
                              查看日志
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <EmptyRow colSpan={4} label="暂无操作日志" />
                    )}
                  </TableBody>
                </Table>
              </div>
            </SectionCard>
          ) : null}
        </div>
      </section>
    </PageShell>
  );
}
