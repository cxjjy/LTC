import { AuditAction, EntityType } from "@prisma/client";

import type { DataColumn } from "@/components/data-table";
import type { ListPageConfig } from "@/types/list";

const auditEntityOptions = Object.values(EntityType).map((value) => ({
  label: value,
  value
}));

const auditActionOptions = Object.values(AuditAction).map((value) => ({
  label: value,
  value
}));

export const auditLogColumns: DataColumn[] = [
  { key: "createdAt", header: "时间" },
  { key: "entityType", header: "实体类型" },
  { key: "entityCode", header: "业务编号", type: "link" },
  { key: "action", header: "动作", type: "badge" },
  { key: "actorId", header: "操作人" },
  { key: "message", header: "说明" }
];

export const auditLogListConfig: ListPageConfig = {
  moduleKey: "audit-logs",
  moduleLabel: "审计日志",
  basePath: "/audit-logs",
  searchPlaceholder: "搜索业务编号、实体编号或日志说明",
  exportFileName: "audit-logs",
  columns: auditLogColumns,
  filterFields: [
    { name: "entityType", label: "模块", type: "select", options: auditEntityOptions },
    { name: "action", label: "操作类型", type: "select", options: auditActionOptions },
    { name: "actorId", label: "操作人", type: "text", placeholder: "输入操作人" },
    { name: "createdFrom", label: "开始时间", type: "date" },
    { name: "createdTo", label: "结束时间", type: "date" }
  ],
  sortOptions: [
    { label: "操作时间", value: "createdAt" },
    { label: "动作", value: "action" },
    { label: "模块", value: "entityType" }
  ],
  defaultSort: {
    sortBy: "createdAt",
    sortOrder: "desc"
  },
  emptyText: "暂无审计日志"
};
