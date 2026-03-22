import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DetailGrid } from "@/components/detail-grid";
import { PageHeader } from "@/components/page-header";
import { deliveryStatusLabels } from "@/lib/constants";
import { requireSessionUser } from "@/lib/auth";
import { auditLogModuleService } from "@/modules/audit-logs/service";
import { deliveryService } from "@/modules/deliveries/service";

export default async function DeliveryDetailPage({ params }: { params: { id: string } }) {
  const user = await requireSessionUser();
  const delivery = (await deliveryService.getDetail(params.id, user)) as any;
  const audits = (await auditLogModuleService.listByEntity("DELIVERY", delivery.id, user)) as any[];

  return (
    <div className="space-y-6">
      <PageHeader title={delivery.title} description={`交付编号：${delivery.code}`} actionLabel="编辑交付" actionHref={`/deliveries/${delivery.id}/edit`} />
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
    </div>
  );
}
