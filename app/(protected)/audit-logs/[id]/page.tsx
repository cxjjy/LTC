import { DetailGrid } from "@/components/detail-grid";
import { PageHeader } from "@/components/page-header";
import { requireSessionUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";
import { auditLogModuleService } from "@/modules/audit-logs/service";

export default async function AuditLogDetailPage({ params }: { params: { id: string } }) {
  const user = await requireSessionUser();
  const log = (await auditLogModuleService.getById(params.id, user)) as any;

  return (
    <div className="space-y-6">
      <PageHeader title="审计日志详情" description={`日志编号：${log.id}`} />
      <DetailGrid
        title="日志内容"
        items={[
          { label: "实体类型", value: log.entityType },
          { label: "实体编号", value: log.entityCode || "-" },
          { label: "动作", value: log.action },
          { label: "操作人", value: log.actorId },
          { label: "时间", value: formatDateTime(log.createdAt) },
          { label: "说明", value: log.message }
        ]}
      />
      <pre className="overflow-x-auto rounded-xl border bg-white p-4 text-sm shadow-soft">
        {JSON.stringify(log.payload ?? {}, null, 2)}
      </pre>
    </div>
  );
}
