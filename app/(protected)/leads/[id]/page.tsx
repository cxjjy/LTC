import Link from "next/link";

import { DeleteAction } from "@/components/delete-action";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DetailGrid } from "@/components/detail-grid";
import { PageHeader } from "@/components/page-header";
import { leadStatusLabels } from "@/lib/constants";
import { requireSessionUser } from "@/lib/auth";
import { getDeleteCopy } from "@/lib/delete-config";
import { canAccessRecord, requirePagePermission } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { auditLogModuleService } from "@/modules/audit-logs/service";
import { decimalToNumber } from "@/modules/core/decimal";
import { leadService } from "@/modules/leads/service";
import { LeadConvertForm } from "@/modules/leads/ui/convert-form";
import { formatCurrency } from "@/lib/utils";

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const user = await requirePagePermission(requireSessionUser(), "lead", "view");
  const canUpdate = canAccessRecord(user, "lead", "update");
  const canDelete = canAccessRecord(user, "lead", "delete");
  const canViewAuditLog = canAccessRecord(user, "auditLog", "view");
  const deleteCopy = getDeleteCopy("lead");
  const lead = (await leadService.getDetail(params.id, user)) as any;
  const audits = canViewAuditLog ? ((await auditLogModuleService.listByEntity("LEAD", lead.id, user)) as any[]) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={lead.title}
        description={`线索编号：${lead.code}`}
        breadcrumbs={[
          { label: "线索管理", href: "/leads" },
          { label: lead.code }
        ]}
        backHref="/leads"
        backLabel="线索管理"
        backInActions
        actions={
          <>
            {canUpdate ? (
              <Button asChild>
                <Link href={`/leads/${lead.id}/edit`}>编辑线索</Link>
              </Button>
            ) : null}
            {canDelete ? (
              <DeleteAction
                moduleLabel={deleteCopy.moduleLabel}
                recordLabel={`${lead.code} / ${lead.title}`}
                endpoint={`/api/leads/${lead.id}`}
                warning={deleteCopy.warning}
                redirectTo={deleteCopy.listPath}
              />
            ) : null}
          </>
        }
      />
      <DetailGrid
        title="基本信息"
        items={[
          { label: "所属客户", value: <Link href={`/customers/${lead.customer.id}`}>{lead.customer.name}</Link> },
          { label: "状态", value: leadStatusLabels[lead.status as keyof typeof leadStatusLabels] },
          { label: "来源", value: lead.source || "-" },
          { label: "联系人", value: lead.contactName || "-" },
          { label: "联系电话", value: lead.contactPhone || "-" },
          { label: "预计金额", value: formatCurrency(decimalToNumber(lead.expectedAmount)) }
        ]}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>链路追溯</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>客户：{lead.customer.name}</div>
            <div>
              商机：
              {lead.opportunity ? (
                <Link href={`/opportunities/${lead.opportunity.id}`} className="text-primary">
                  {lead.opportunity.name}
                </Link>
              ) : (
                "未转换"
              )}
            </div>
          </CardContent>
        </Card>
        {lead.opportunity ? null : (
          <LeadConvertForm leadId={lead.id} defaultName={`${lead.title} 商机`} defaultAmount={decimalToNumber(lead.expectedAmount)} />
        )}
      </div>
      {canViewAuditLog ? (
        <Card>
          <CardHeader>
            <CardTitle>审计日志</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {audits.map((item) => (
              <Link key={item.id} href={`/audit-logs/${item.id}`} className="block rounded-lg bg-muted/50 p-3 hover:bg-muted">
                <div className="font-medium">{item.message}</div>
                <div className="text-muted-foreground">{new Date(item.createdAt).toLocaleString("zh-CN")}</div>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
