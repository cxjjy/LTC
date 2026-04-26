import Link from "next/link";
import {
  AlertTriangle,
  BriefcaseBusiness,
  CircleDollarSign,
  Download,
  FolderKanban
} from "lucide-react";
import { ContractStatus, DeliveryStatus, ProjectStatus, ReceivableStatus } from "@prisma/client";

import { BizAttachmentManager } from "@/components/biz-attachment-manager";
import { DeleteAction } from "@/components/delete-action";
import { PageShell } from "@/components/page-shell";
import { ProjectMetricsStrip } from "@/components/project-metrics-strip";
import { ProjectSupplierPanel } from "@/modules/projects/ui/supplier-panel";
import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireSessionUser } from "@/lib/auth";
import {
  bizAttachmentTypeLabels,
  contractDirectionLabels,
  contractStatusLabels,
  costCategoryLabels,
  deliveryStatusLabels,
  invoiceDirectionLabels,
  invoiceStatusLabels,
  invoiceTypeLabels,
  paymentDirectionLabels,
  projectStatusLabels,
  receivableStatusLabels
} from "@/lib/constants";
import { getDeleteCopy } from "@/lib/delete-config";
import { prisma } from "@/lib/prisma";
import { canAccessRecord, requirePagePermission } from "@/lib/rbac";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { auditLogModuleService } from "@/modules/audit-logs/service";
import { bizAttachmentService } from "@/modules/biz-attachments/service";
import {
  CONTRACT_STATUS_ACTIVE,
  CONTRACT_STATUSES_COUNTABLE_ON_PROJECT,
  CONTRACT_STATUS_TERMINATED
} from "@/modules/contracts/status";
import { decimalToNumber, sumDecimalValues } from "@/modules/core/decimal";
import { projectService } from "@/modules/projects/service";
import type { PageSearchParams } from "@/types/common";

const detailTabs = [
  { key: "salesContracts", label: "销售合同" },
  { key: "purchaseContracts", label: "采购合同" },
  { key: "outputInvoices", label: "销项发票" },
  { key: "inputInvoices", label: "进项发票" },
  { key: "receivables", label: "回款记录" },
  { key: "supplierPayments", label: "付款记录" },
  { key: "materials", label: "资料" },
  { key: "deliveries", label: "交付" },
  { key: "costs", label: "成本" },
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
  if (status === CONTRACT_STATUS_ACTIVE) return "success";
  if (status === CONTRACT_STATUS_TERMINATED) return "default";
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

function getPlainStatusBadgeVariant(status: string) {
  if (status === "issued") return "success";
  if (status === "voided") return "muted";
  if (status === "red_flush") return "danger";
  return "default";
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

function InfoCell({
  label,
  value,
  emphasize = false
}: {
  label: string;
  value: React.ReactNode;
  emphasize?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-[10px] bg-[rgba(248,250,252,0.75)] px-3 py-3">
      <div className="text-[12px] font-medium text-muted-foreground">{label}</div>
      <div
        className={`mt-1.5 truncate text-[14px] ${emphasize ? "font-semibold tracking-[-0.02em]" : "font-medium"} text-foreground`}
      >
        {value || "-"}
      </div>
    </div>
  );
}

function FlowNode({
  title,
  value,
  meta,
  tone = "default"
}: {
  title: string;
  value: React.ReactNode;
  meta: string;
  tone?: "default" | "customer" | "project" | "supplier";
}) {
  const toneClassMap = {
    default: "border-[rgba(229,231,235,0.92)] bg-white",
    customer: "border-[rgba(59,130,246,0.18)] bg-[rgba(239,246,255,0.72)]",
    project: "border-[rgba(59,130,246,0.28)] bg-[rgba(59,130,246,0.06)]",
    supplier: "border-[rgba(16,185,129,0.18)] bg-[rgba(236,253,245,0.78)]"
  } as const;

  return (
    <div className={`rounded-[14px] border px-5 py-4 ${toneClassMap[tone]}`}>
      <div className="text-[12px] font-medium uppercase tracking-[0.06em] text-muted-foreground">{title}</div>
      <div className="mt-2 text-[18px] font-semibold tracking-[-0.03em] text-foreground">{value}</div>
      <div className="mt-2 text-sm text-muted-foreground">{meta}</div>
    </div>
  );
}

function FlowEntry({
  href,
  label,
  amount,
  meta
}: {
  href: string;
  label: string;
  amount: string;
  meta: string;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      className="surface-card block rounded-[12px] border border-[rgba(229,231,235,0.92)] px-4 py-4 transition hover:border-[rgba(59,130,246,0.3)] hover:shadow-[var(--shadow-hover)]"
    >
      <div className="text-[12px] font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 text-[22px] font-semibold tracking-[-0.04em] text-foreground">{amount}</div>
      <div className="mt-2 text-sm text-muted-foreground">{meta}</div>
    </Link>
  );
}

function SignalCard({
  icon,
  label,
  value,
  tone = "default"
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "default" | "warning" | "danger" | "success";
}) {
  const toneClassMap = {
    default: "text-muted-foreground",
    warning: "text-[rgb(180,83,9)]",
    danger: "text-[rgb(185,28,28)]",
    success: "text-[rgb(4,120,87)]"
  } as const;

  return (
    <div className="rounded-[12px] border border-[rgba(229,231,235,0.92)] bg-[rgba(249,250,251,0.88)] px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <span className={toneClassMap[tone]}>{icon}</span>
        {label}
      </div>
      <div className={`mt-2 text-sm font-medium ${toneClassMap[tone]}`}>{value}</div>
    </div>
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
    : "salesContracts";

  const project = (await projectService.getDetail(params.id, user)) as any;

  const [acceptanceFiles, settlementFiles, relatedContractFiles, invoiceRecords, paymentRecords] = await Promise.all([
    bizAttachmentService.listByProject(params.id, ["acceptance"], user),
    bizAttachmentService.listByProject(params.id, ["settlement"], user),
    bizAttachmentService.listByProject(params.id, ["contract", "invoice"], user),
    prisma.invoiceRecord.findMany({
      where: { projectId: params.id },
      orderBy: [{ invoiceDate: "desc" }, { createdAt: "desc" }]
    }),
    prisma.paymentRecord.findMany({
      where: { projectId: params.id },
      orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }]
    })
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

  const countableContracts = project.contracts.filter((item: any) =>
    CONTRACT_STATUSES_COUNTABLE_ON_PROJECT.includes(item.status)
  );
  const salesContracts = countableContracts.filter((item: any) => item.direction !== "PURCHASE");
  const purchaseContracts = countableContracts.filter((item: any) => item.direction === "PURCHASE");
  const outputInvoices = invoiceRecords.filter((item: any) => item.direction !== "INPUT");
  const inputInvoices = invoiceRecords.filter((item: any) => item.direction === "INPUT");
  const outflowPayments = paymentRecords.filter((item: any) => item.direction === "OUTFLOW");

  const contractAmount = sumDecimalValues(salesContracts.map((item: any) => item.contractAmount));
  const totalReceived = sumDecimalValues(project.receivables.map((item: any) => item.amountReceived));
  const procurementCost = sumDecimalValues(purchaseContracts.map((item: any) => item.contractAmount));
  const totalPaid = sumDecimalValues(outflowPayments.map((item: any) => item.paymentAmount));
  const unreceivedAmount = Math.max(contractAmount - totalReceived, 0);
  const unpaidAmount = Math.max(procurementCost - totalPaid, 0);
  const grossProfit = contractAmount - procurementCost;
  const cashProfit = totalReceived - totalPaid;

  const outputInvoiceAmount = sumDecimalValues(outputInvoices.map((item: any) => item.invoiceAmount));
  const inputInvoiceAmount = sumDecimalValues(inputInvoices.map((item: any) => item.invoiceAmount));
  const standaloneCostAmount = sumDecimalValues(project.costs.map((item: any) => item.amount));
  const projectSuppliers = project.projectSuppliers ?? [];
  const supplierMap = new Map<string, any>(
    projectSuppliers
      .map((item: any) => item.supplier)
      .filter(Boolean)
      .map((supplier: any) => [supplier.id, supplier])
  );

  const budgetAmount = decimalToNumber(project.budgetAmount);
  const overdueReceivables = project.receivables.filter(
    (item: any) =>
      item.status === ReceivableStatus.OVERDUE ||
      (item.dueDate && new Date(item.dueDate) < new Date() && item.status !== ReceivableStatus.RECEIVED)
  );
  const delayedDeliveries = project.deliveries.filter((item: any) => item.status === DeliveryStatus.DELAYED);
  const overBudget = budgetAmount > 0 && standaloneCostAmount > budgetAmount;
  const receivedProgress = contractAmount > 0 ? (totalReceived / contractAmount) * 100 : 0;
  const paymentProgress = procurementCost > 0 ? (totalPaid / procurementCost) * 100 : 0;
  const grossMargin = contractAmount > 0 ? (grossProfit / contractAmount) * 100 : null;

  const primaryMetrics = [
    {
      label: "合同金额",
      value: formatCurrency(contractAmount),
      meta: `${salesContracts.length} 份生效销售合同`,
      tone: "default" as const
    },
    {
      label: "已回款",
      value: formatCurrency(totalReceived),
      meta: `回款进度 ${receivedProgress.toFixed(1)}%`,
      tone: totalReceived > 0 ? ("success" as const) : ("default" as const)
    },
    {
      label: "项目利润",
      value: formatCurrency(grossProfit),
      meta: grossMargin !== null ? `利润率 ${grossMargin.toFixed(1)}%` : "合同金额 - 采购成本",
      tone: grossProfit < 0 ? ("danger" as const) : ("success" as const)
    }
  ];

  const metricGroups = [
    {
      title: "收入侧",
      accent: "income" as const,
      items: [
        {
          label: "未回款",
          value: formatCurrency(unreceivedAmount),
          tone: overdueReceivables.length ? ("warning" as const) : ("default" as const)
        },
        {
          label: "回款进度",
          value: `${receivedProgress.toFixed(1)}%`,
          tone: totalReceived > 0 ? ("success" as const) : ("default" as const)
        }
      ]
    },
    {
      title: "支出侧",
      accent: "expense" as const,
      items: [
        {
          label: "采购成本",
          value: formatCurrency(procurementCost),
          tone: "warning" as const
        },
        {
          label: "已付款",
          value: formatCurrency(totalPaid),
          tone: totalPaid > 0 ? ("warning" as const) : ("default" as const)
        },
        {
          label: "未付款",
          value: formatCurrency(unpaidAmount),
          tone: unpaidAmount > 0 ? ("warning" as const) : ("default" as const)
        }
      ]
    },
    {
      title: "经营结果",
      accent: "result" as const,
      items: [
        {
          label: "现金利润",
          value: formatCurrency(cashProfit),
          tone: cashProfit < 0 ? ("danger" as const) : ("success" as const)
        }
      ]
    }
  ];

  const projectOwner = project.ownerName || userMap.get(project.createdBy) || "暂未指定";

  return (
    <PageShell
      className="space-y-5"
      title={project.name}
      description={`${project.code} · 项目经营驾驶舱`}
      breadcrumbs={[
        { label: "项目管理", href: "/projects" },
        { label: project.code }
      ]}
      backHref="/projects"
      backLabel="返回项目列表"
      backInActions
      headerAction={
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={getBadgeVariantByProjectStatus(project.status)}>
            {projectStatusLabels[project.status as keyof typeof projectStatusLabels]}
          </Badge>
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
        <ProjectMetricsStrip primaryItems={primaryMetrics} groups={metricGroups} />

      <SectionCard
        title="项目信息"
        description="统一查看项目业务口径、客户背景、项目负责人和关键计划。"
        contentClassName="pt-0"
      >
        <div className="space-y-5">
          <div>
            <div className="mb-3 text-sm font-semibold text-foreground">业务信息</div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <InfoCell label="项目名称" value={project.name} emphasize />
              <InfoCell label="项目编号" value={project.code} emphasize />
              <InfoCell
                label="项目状态"
                value={
                  <Badge variant={getBadgeVariantByProjectStatus(project.status)}>
                    {projectStatusLabels[project.status as keyof typeof projectStatusLabels]}
                  </Badge>
                }
              />
              <InfoCell
                label="交付模式"
                value={<Badge variant="muted">{project.deliveryMode || "未设置"}</Badge>}
              />
              <InfoCell label="所属区域" value={<Badge variant="muted">{project.region || "未设置"}</Badge>} />
              <InfoCell label="项目负责人" value={projectOwner} />
              <InfoCell
                label="客户"
                value={<Link href={`/customers/${project.customer.id}`}>{project.customer.name}</Link>}
              />
              <InfoCell
                label="上游商机"
                value={<Link href={`/opportunities/${project.opportunity.id}`}>{project.opportunity.name}</Link>}
              />
              <InfoCell label="供应商数量" value={`${projectSuppliers.length} 家`} />
            </div>
          </div>

          <div className="border-t border-[rgba(229,231,235,0.9)] pt-5">
            <div className="mb-3 text-sm font-semibold text-foreground">计划与客户信息</div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <InfoCell label="计划开始时间" value={formatDate(project.plannedStartDate)} />
              <InfoCell label="计划结束时间" value={formatDate(project.plannedEndDate)} />
              <InfoCell label="预算金额" value={formatCurrency(budgetAmount)} />
              <InfoCell label="客户行业" value={project.customer.industry || "-"} />
              <InfoCell label="客户联系人" value={project.customer.contactName || "-"} />
              <InfoCell label="联系电话" value={project.customer.contactPhone || "-"} />
              <div className="md:col-span-2 xl:col-span-3">
                <InfoCell label="客户地址" value={project.customer.address || "-"} />
              </div>
            </div>
          </div>

          <div className="border-t border-[rgba(229,231,235,0.9)] pt-5">
            <div className="mb-3 text-sm font-semibold text-foreground">经营信号</div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <SignalCard
                icon={<AlertTriangle className="h-4 w-4" />}
                label="逾期回款"
                value={overdueReceivables.length ? `${overdueReceivables.length} 笔待处理` : "暂无逾期"}
                tone={overdueReceivables.length ? "danger" : "success"}
              />
              <SignalCard
                icon={<BriefcaseBusiness className="h-4 w-4" />}
                label="延期交付"
                value={delayedDeliveries.length ? `${delayedDeliveries.length} 项延期` : "交付正常"}
                tone={delayedDeliveries.length ? "warning" : "success"}
              />
              <SignalCard
                icon={<CircleDollarSign className="h-4 w-4" />}
                label="成本控制"
                value={overBudget ? "已超预算，需关注成本" : "成本处于预算内"}
                tone={overBudget ? "warning" : "success"}
              />
              <SignalCard
                icon={<FolderKanban className="h-4 w-4" />}
                label="采购协同"
                value={projectSuppliers.length ? `${projectSuppliers.length} 家供应商已关联` : "尚未建立供应商侧链路"}
                tone={projectSuppliers.length ? "default" : "warning"}
              />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="业务关系链"
        description="以客户 → 我方项目 → 供应商为主线，统一承接合同、发票、回款和付款入口。"
      >
        <div className="space-y-6">
          <div className="grid gap-4 xl:grid-cols-[1fr_auto_1fr_auto_1fr] xl:items-center">
            <FlowNode
              title="客户"
              value={<Link href={`/customers/${project.customer.id}`}>{project.customer.name}</Link>}
              meta={`${salesContracts.length} 份销售合同 · ${project.receivables.length} 笔回款记录`}
              tone="customer"
            />
            <div className="hidden text-center text-xl text-muted-foreground xl:block">→</div>
            <FlowNode
              title="我方项目"
              value={project.name}
              meta={`${project.code} · ${project.deliveryMode || "未设置交付模式"}`}
              tone="project"
            />
            <div className="hidden text-center text-xl text-muted-foreground xl:block">→</div>
            <FlowNode
              title="供应商"
              value={projectSuppliers.length ? `${projectSuppliers.length} 家已关联` : "待建立供应商链路"}
              meta={`${purchaseContracts.length} 份采购合同 · ${outflowPayments.length} 笔付款记录`}
              tone="supplier"
            />
          </div>

          <div>
            <div className="mb-3 text-sm font-semibold text-foreground">经营数据入口</div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <FlowEntry
                href={buildTabHref(project.id, "salesContracts")}
                label="销售合同"
                amount={formatCurrency(contractAmount)}
                meta={`${salesContracts.length} 份合同`}
              />
              <FlowEntry
                href={buildTabHref(project.id, "purchaseContracts")}
                label="采购合同"
                amount={formatCurrency(procurementCost)}
                meta={`${purchaseContracts.length} 份合同`}
              />
              <FlowEntry
                href={buildTabHref(project.id, "outputInvoices")}
                label="销项发票"
                amount={formatCurrency(outputInvoiceAmount)}
                meta={`${outputInvoices.length} 张发票`}
              />
              <FlowEntry
                href={buildTabHref(project.id, "inputInvoices")}
                label="进项发票"
                amount={formatCurrency(inputInvoiceAmount)}
                meta={`${inputInvoices.length} 张发票`}
              />
              <FlowEntry
                href={buildTabHref(project.id, "receivables")}
                label="回款记录"
                amount={formatCurrency(totalReceived)}
                meta={`${project.receivables.length} 笔记录`}
              />
              <FlowEntry
                href={buildTabHref(project.id, "supplierPayments")}
                label="付款记录"
                amount={formatCurrency(totalPaid)}
                meta={`${outflowPayments.length} 笔记录`}
              />
              <FlowEntry
                href={buildTabHref(project.id, "costs")}
                label="成本记录"
                amount={formatCurrency(standaloneCostAmount)}
                meta={`${project.costs.length} 条成本`}
              />
              <FlowEntry
                href={buildTabHref(project.id, "salesContracts")}
                label="利润口径"
                amount={formatCurrency(grossProfit)}
                meta={`现金利润 ${formatCurrency(cashProfit)}`}
              />
            </div>
          </div>

          <ProjectSupplierPanel projectId={project.id} suppliers={projectSuppliers} canManage={canUpdate} />
        </div>
      </SectionCard>

      <section className="workspace-panel overflow-hidden">
        <div className="workspace-panel-section border-t-0 px-6 py-4">
          <div className="text-sm font-semibold text-foreground">明细台账</div>
          <p className="mt-1 text-sm text-muted-foreground">
            继续穿透销售合同、采购合同、发票、回款、付款、交付和成本明细。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 border-b border-[rgba(229,231,235,0.9)] px-6">
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
          {activeTab === "salesContracts" ? (
            <SectionCard
              title="销售合同（客户-我方）"
              description="客户与我方签署的收入合同，作为合同金额和未回款口径来源。"
              className="border-0 shadow-none"
              contentClassName="px-0 pb-0 pt-0 md:px-0"
            >
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>合同编号</TableHead>
                      <TableHead>合同名称</TableHead>
                      <TableHead>方向</TableHead>
                      <TableHead>金额</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>生效时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesContracts.length ? (
                      salesContracts.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Link href={`/contracts/${item.id}`} className="font-medium hover:text-[var(--color-primary)]">
                              {item.code}
                            </Link>
                          </TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>
                            {contractDirectionLabels[item.direction as keyof typeof contractDirectionLabels] ?? "销售合同"}
                          </TableCell>
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
                      <EmptyRow colSpan={6} label="暂无销售合同" />
                    )}
                  </TableBody>
                </Table>
              </div>
            </SectionCard>
          ) : null}

          {activeTab === "purchaseContracts" ? (
            <SectionCard
              title="采购合同（我方-供应商）"
              description="我方与供应商签署的采购合同，作为采购成本和未付款口径来源。"
              className="border-0 shadow-none"
              contentClassName="px-0 pb-0 pt-0 md:px-0"
            >
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>合同编号</TableHead>
                      <TableHead>合同名称</TableHead>
                      <TableHead>供应商</TableHead>
                      <TableHead>金额</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>生效时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseContracts.length ? (
                      purchaseContracts.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Link href={`/contracts/${item.id}`} className="font-medium hover:text-[var(--color-primary)]">
                              {item.code}
                            </Link>
                          </TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{supplierMap.get(item.supplierId)?.name || "-"}</TableCell>
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
                      <EmptyRow colSpan={6} label="暂无采购合同" />
                    )}
                  </TableBody>
                </Table>
              </div>
            </SectionCard>
          ) : null}

          {activeTab === "outputInvoices" || activeTab === "inputInvoices" ? (
            <SectionCard
              title={activeTab === "outputInvoices" ? "销项发票（我方开给客户）" : "进项发票（供应商开给我方）"}
              description={
                activeTab === "outputInvoices"
                  ? "销售合同下我方开具给客户的发票。"
                  : "采购合同下供应商开具给我方的发票。"
              }
              className="border-0 shadow-none"
              contentClassName="px-0 pb-0 pt-0 md:px-0"
            >
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>发票号码</TableHead>
                      <TableHead>方向</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>金额</TableHead>
                      <TableHead>开票日期</TableHead>
                      <TableHead>状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(activeTab === "outputInvoices" ? outputInvoices : inputInvoices).length ? (
                      (activeTab === "outputInvoices" ? outputInvoices : inputInvoices).map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.invoiceNo}</TableCell>
                          <TableCell>
                            {invoiceDirectionLabels[item.direction as keyof typeof invoiceDirectionLabels]}
                          </TableCell>
                          <TableCell>
                            {invoiceTypeLabels[item.invoiceType as keyof typeof invoiceTypeLabels] ?? item.invoiceType}
                          </TableCell>
                          <TableCell>{formatCurrency(item.invoiceAmount)}</TableCell>
                          <TableCell>{formatDate(item.invoiceDate)}</TableCell>
                          <TableCell>
                            <Badge variant={getPlainStatusBadgeVariant(item.status)}>
                              {invoiceStatusLabels[item.status as keyof typeof invoiceStatusLabels] ?? item.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <EmptyRow colSpan={6} label={activeTab === "outputInvoices" ? "暂无销项发票" : "暂无进项发票"} />
                    )}
                  </TableBody>
                </Table>
              </div>
            </SectionCard>
          ) : null}

          {activeTab === "receivables" ? (
            <SectionCard
              title="回款记录（客户付给我方）"
              description="以项目维度查看客户侧应收、实收和回款状态。"
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

          {activeTab === "supplierPayments" ? (
            <SectionCard
              title="付款记录（我方付给供应商）"
              description="采购合同下我方向供应商支付的款项记录。"
              className="border-0 shadow-none"
              contentClassName="px-0 pb-0 pt-0 md:px-0"
            >
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>付款方向</TableHead>
                      <TableHead>付款金额</TableHead>
                      <TableHead>付款日期</TableHead>
                      <TableHead>付款方式</TableHead>
                      <TableHead>付款方</TableHead>
                      <TableHead>备注</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outflowPayments.length ? (
                      outflowPayments.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>{paymentDirectionLabels[item.direction as keyof typeof paymentDirectionLabels]}</TableCell>
                          <TableCell>{formatCurrency(item.paymentAmount)}</TableCell>
                          <TableCell>{formatDate(item.paymentDate)}</TableCell>
                          <TableCell>{item.paymentMethod || "-"}</TableCell>
                          <TableCell>{item.payerName || "我方"}</TableCell>
                          <TableCell>{item.remark || "-"}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <EmptyRow colSpan={6} label="暂无供应商付款记录" />
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
