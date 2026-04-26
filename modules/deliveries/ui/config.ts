import type { DataColumn } from "@/components/data-table";
import type { EntityFormField } from "@/components/forms/entity-form";
import { deliveryStatusLabels } from "@/lib/constants";
import type { SelectOption } from "@/types/common";
import type { ListPageConfig } from "@/types/list";
import type { CreateDeliveryDto } from "@/modules/deliveries/dto";

export const deliveryStatusOptions: SelectOption[] = Object.entries(deliveryStatusLabels).map(([value, label]) => ({
  value,
  label
}));

export const deliveryColumns: DataColumn[] = [
  { key: "code", header: "交付编号", type: "link" },
  { key: "title", header: "交付标题" },
  { key: "projectName", header: "所属项目" },
  { key: "ownerName", header: "负责人" },
  { key: "statusLabel", header: "状态", type: "badge" },
  { key: "plannedDate", header: "计划日期" },
  { key: "actualDate", header: "实际完成" }
];

export const deliveryListConfig: ListPageConfig = {
  moduleKey: "deliveries",
  moduleLabel: "交付",
  basePath: "/deliveries",
  createLabel: "新增",
  createHref: "/deliveries/new",
  searchPlaceholder: "搜索交付名称、交付编号或所属项目",
  exportFileName: "deliveries",
  columns: deliveryColumns,
  filterFields: [
    { name: "title", label: "交付名称", type: "text", placeholder: "输入交付名称" },
    { name: "status", label: "状态", type: "select", options: deliveryStatusOptions },
    { name: "projectName", label: "所属项目", type: "text", placeholder: "输入项目名称" },
    { name: "ownerName", label: "负责人", type: "text", placeholder: "输入负责人" },
    { name: "plannedFrom", label: "计划开始", type: "date" },
    { name: "plannedTo", label: "计划结束", type: "date" }
  ],
  sortOptions: [
    { label: "创建时间", value: "createdAt" },
    { label: "更新时间", value: "updatedAt" },
    { label: "计划结束时间", value: "plannedDate" },
    { label: "交付标题", value: "title" }
  ],
  defaultSort: {
    sortBy: "createdAt",
    sortOrder: "desc"
  },
  emptyText: "暂无交付数据"
};

export function buildDeliveryFields(projectOptions: SelectOption[]): EntityFormField<CreateDeliveryDto>[] {
  return [
    {
      name: "projectId",
      label: "项目",
      type: "select",
      options: projectOptions,
      requestUrl: "/api/options/projects"
    },
    { name: "title", label: "交付标题", type: "text" },
    { name: "ownerName", label: "负责人", type: "text" },
    { name: "plannedDate", label: "计划日期", type: "date" },
    { name: "actualDate", label: "实际完成日期", type: "date" },
    { name: "acceptanceDate", label: "验收日期", type: "date" },
    { name: "status", label: "状态", type: "select", options: deliveryStatusOptions },
    { name: "description", label: "描述", type: "textarea" }
  ];
}
