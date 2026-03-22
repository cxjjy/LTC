import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DetailGrid } from "@/components/detail-grid";
import { PageHeader } from "@/components/page-header";
import { costCategoryLabels } from "@/lib/constants";
import { requireSessionUser } from "@/lib/auth";
import { auditLogModuleService } from "@/modules/audit-logs/service";
import { costService } from "@/modules/costs/service";
import { decimalToNumber } from "@/modules/core/decimal";
import { formatCurrency } from "@/lib/utils";

export default async function CostDetailPage({ params }: { params: { id: string } }) {
  const user = await requireSessionUser();
  const cost = (await costService.getDetail(params.id, user)) as any;
  const audits = (await auditLogModuleService.listByEntity("COST", cost.id, user)) as any[];

  return (
    <div className="space-y-6">
      <PageHeader title={cost.title} description={`成本编号：${cost.code}`} actionLabel="编辑成本" actionHref={`/costs/${cost.id}/edit`} />
      <DetailGrid
        title="基本信息"
        items={[
          { label: "所属项目", value: <Link href={`/projects/${cost.project.id}`}>{cost.project.name}</Link> },
          { label: "上游商机", value: <Link href={`/opportunities/${cost.project.opportunity.id}`}>{cost.project.opportunity.name}</Link> },
          { label: "来源线索", value: cost.project.opportunity.lead ? <Link href={`/leads/${cost.project.opportunity.lead.id}`}>{cost.project.opportunity.lead.title}</Link> : "无" },
          { label: "成本类别", value: costCategoryLabels[cost.category as keyof typeof costCategoryLabels] },
          { label: "金额", value: formatCurrency(decimalToNumber(cost.amount)) },
          { label: "说明", value: cost.description || "-" }
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
