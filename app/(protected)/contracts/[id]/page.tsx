import Link from "next/link";

import { BizAttachmentManager } from "@/components/biz-attachment-manager";
import { DeleteAction } from "@/components/delete-action";
import { DetailGrid } from "@/components/detail-grid";
import { InvoiceRecordsPanel } from "@/components/invoice-records-panel";
import { LtcChain } from "@/components/ltc-chain";
import { PageHeader } from "@/components/page-header";
import { PaymentRecordsPanel } from "@/components/payment-records-panel";
import { SectionCard } from "@/components/section-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { contractStatusLabels } from "@/lib/constants";
import { requireSessionUser } from "@/lib/auth";
import { getDeleteCopy } from "@/lib/delete-config";
import { canAccessRecord, requirePagePermission } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { bizAttachmentService } from "@/modules/biz-attachments/service";
import { auditLogModuleService } from "@/modules/audit-logs/service";
import { decimalToNumber } from "@/modules/core/decimal";
import { contractService } from "@/modules/contracts/service";
import { invoiceRecordService } from "@/modules/invoice-records/service";
import { paymentRecordService } from "@/modules/payment-records/service";
import { formatCurrency, toDateInputValue } from "@/lib/utils";

export default async function ContractDetailPage({ params }: { params: { id: string } }) {
  const user = await requirePagePermission(requireSessionUser(), "contract", "view");
  const canUpdate = canAccessRecord(user, "contract", "update");
  const canDelete = canAccessRecord(user, "contract", "delete");
  const canViewAuditLog = canAccessRecord(user, "auditLog", "view");
  const canManageAttachments =
    canUpdate ||
    user.role === "SUPER_ADMIN" ||
    user.role === "ADMIN" ||
    user.role === "FINANCE" ||
    user.roles.some((role) => role.code === "SUPER_ADMIN" || role.code === "FINANCE");
  const deleteCopy = getDeleteCopy("contract");
  const contract = (await contractService.getDetail(params.id, user)) as any;
  const [contractFiles, invoiceRecords, paymentRecords, acceptanceFiles, settlementFiles] = await Promise.all([
    bizAttachmentService.listByContract(contract.id, "contract", user),
    invoiceRecordService.listByContract(contract.id, user),
    paymentRecordService.listByContract(contract.id, user),
    bizAttachmentService.listByProject(contract.project.id, ["acceptance"], user),
    bizAttachmentService.listByProject(contract.project.id, ["settlement"], user)
  ]);
  const audits: Array<{ id: string; message: string; createdAt: Date | string }> = canViewAuditLog
    ? ((await auditLogModuleService.listByEntity("CONTRACT", contract.id, user)) as Array<{
        id: string;
        message: string;
        createdAt: Date | string;
      }>)
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={contract.name}
        description={`合同编号：${contract.code}`}
        breadcrumbs={[
          { label: "合同管理", href: "/contracts" },
          { label: contract.code }
        ]}
        backHref="/contracts"
        backLabel="合同管理"
        backInActions
        actions={
          <>
            {canUpdate ? (
              <Button asChild>
                <Link href={`/contracts/${contract.id}/edit`}>编辑合同</Link>
              </Button>
            ) : null}
            {canDelete ? (
              <DeleteAction
                moduleLabel={deleteCopy.moduleLabel}
                recordLabel={`${contract.code} / ${contract.name}`}
                endpoint={`/api/contracts/${contract.id}`}
                warning={deleteCopy.warning}
                redirectTo={deleteCopy.listPath}
              />
            ) : null}
          </>
        }
      />
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
          {
            label: "状态",
            value: (
              <Badge variant={getContractStatusBadgeVariant(contract.status)}>
                {contractStatusLabels[contract.status as keyof typeof contractStatusLabels]}
              </Badge>
            )
          },
          { label: "合同金额", value: formatCurrency(decimalToNumber(contract.contractAmount)) },
          { label: "生效日期", value: toDateInputValue(contract.effectiveDate) || "-" }
        ]}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="应收计划" description="保留当前合同下原有应收计划链路，不影响新回款台账。">
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
      <section className="workspace-panel overflow-hidden">
        <Tabs defaultValue="contract-files">
          <TabsList className="w-full px-6">
            <TabsTrigger value="contract-files">合同电子版</TabsTrigger>
            <TabsTrigger value="invoices">发票记录</TabsTrigger>
            <TabsTrigger value="payments">回款记录</TabsTrigger>
            <TabsTrigger value="materials">业务资料</TabsTrigger>
          </TabsList>
          <div className="px-6 py-5">
            <TabsContent value="contract-files" className="mt-0">
              <BizAttachmentManager
                title="合同电子版"
                description="维护合同原件、补充协议和签章扫描件。"
                uploadLabel="上传合同"
                emptyLabel="当前合同还没有上传电子版。"
                bizType="contract"
                bizId={contract.id}
                projectId={contract.project.id}
                uploadUrl={`/api/contracts/${contract.id}/biz-attachments`}
                attachments={contractFiles}
                canManage={canManageAttachments}
              />
            </TabsContent>
            <TabsContent value="invoices" className="mt-0">
              <InvoiceRecordsPanel
                contractId={contract.id}
                records={invoiceRecords.map((item: any) => ({
                  ...item,
                  invoiceAmount: decimalToNumber(item.invoiceAmount)
                }))}
                canManage={canManageAttachments}
              />
            </TabsContent>
            <TabsContent value="payments" className="mt-0">
              <PaymentRecordsPanel
                contractId={contract.id}
                records={paymentRecords.map((item: any) => ({
                  ...item,
                  paymentAmount: decimalToNumber(item.paymentAmount)
                }))}
                canManage={canManageAttachments}
              />
            </TabsContent>
            <TabsContent value="materials" className="mt-0 space-y-6">
              <BizAttachmentManager
                title="项目验收单"
                description="按项目维度沉淀验收确认资料，合同侧同步查看。"
                uploadLabel="上传验收单"
                emptyLabel="当前项目还没有验收资料。"
                bizType="acceptance"
                bizId={contract.project.id}
                projectId={contract.project.id}
                uploadUrl={`/api/contracts/${contract.id}/biz-attachments`}
                attachments={acceptanceFiles}
                canManage={canManageAttachments}
              />
              <BizAttachmentManager
                title="项目结算单"
                description="归档结算清单、补差说明等项目结算资料。"
                uploadLabel="上传结算单"
                emptyLabel="当前项目还没有结算资料。"
                bizType="settlement"
                bizId={contract.project.id}
                projectId={contract.project.id}
                uploadUrl={`/api/contracts/${contract.id}/biz-attachments`}
                attachments={settlementFiles}
                canManage={canManageAttachments}
              />
            </TabsContent>
          </div>
        </Tabs>
      </section>
      {canViewAuditLog ? (
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
      ) : null}
    </div>
  );
}

function getContractStatusBadgeVariant(status: string): "muted" | "warning" | "success" | "danger" | "default" {
  if (status === "ACTIVE") return "success";
  if (status === "TERMINATED") return "default";
  return "muted";
}
