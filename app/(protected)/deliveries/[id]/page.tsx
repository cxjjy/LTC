import Link from "next/link";

import { DeleteAction } from "@/components/delete-action";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DetailGrid } from "@/components/detail-grid";
import { PageHeader } from "@/components/page-header";
import { deliveryStatusLabels } from "@/lib/constants";
import { requireSessionUser } from "@/lib/auth";
import { getDeleteCopy } from "@/lib/delete-config";
import { canAccessRecord, requirePagePermission } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { auditLogModuleService } from "@/modules/audit-logs/service";
import { deliveryService } from "@/modules/deliveries/service";

export default async function DeliveryDetailPage({ params }: { params: { id: string } }) {
  const user = await requirePagePermission(requireSessionUser(), "delivery", "view");
  const canUpdate = canAccessRecord(user, "delivery", "update");
  const canDelete = canAccessRecord(user, "delivery", "delete");
  const canViewAuditLog = canAccessRecord(user, "auditLog", "view");
  const deleteCopy = getDeleteCopy("delivery");
  const delivery = (await deliveryService.getDetail(params.id, user)) as any;
  const audits = canViewAuditLog
    ? ((await auditLogModuleService.listByEntity("DELIVERY", delivery.id, user)) as any[])
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={delivery.title}
        description={`交付编号：${delivery.code}`}
        breadcrumbs={[
          { label: "交付管理", href: "/deliveries" },
          { label: delivery.code }
        ]}
        backHref="/deliveries"
        backLabel="交付管理"
        backInActions
        actions={
          <>
            {canUpdate ? (
              <Button asChild>
                <Link href={`/deliveries/${delivery.id}/edit`}>编辑交付</Link>
              </Button>
            ) : null}
            {canDelete ? (
              <DeleteAction
                moduleLabel={deleteCopy.moduleLabel}
                recordLabel={`${delivery.code} / ${delivery.title}`}
                endpoint={`/api/deliveries/${delivery.id}`}
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
          { label: "所属项目", value: <Link href={`/projects/${delivery.project.id}`}>{delivery.project.name}</Link> },
          { label: "上游商机", value: <Link href={`/opportunities/${delivery.project.opportunity.id}`}>{delivery.project.opportunity.name}</Link> },
          { label: "来源线索", value: delivery.project.opportunity.lead ? <Link href={`/leads/${delivery.project.opportunity.lead.id}`}>{delivery.project.opportunity.lead.title}</Link> : "无" },
          { label: "状态", value: deliveryStatusLabels[delivery.status as keyof typeof deliveryStatusLabels] },
          { label: "负责人", value: delivery.ownerName || "-" },
          { label: "说明", value: delivery.description || "-" }
        ]}
      />
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
