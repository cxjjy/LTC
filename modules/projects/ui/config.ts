import type { DataColumn } from "@/components/data-table";
import type { EntityFormField } from "@/components/forms/entity-form";
import { projectStatusLabels } from "@/lib/constants";
import type { SelectOption } from "@/types/common";
import type { ListPageConfig } from "@/types/list";
import type { CreateProjectDto } from "@/modules/projects/dto";

export const projectStatusOptions: SelectOption[] = Object.entries(projectStatusLabels).map(([value, label]) => ({
  value,
  label
}));

export const projectColumns: DataColumn[] = [
  { key: "code", header: "项目编号", type: "link" },
  { key: "name", header: "项目名称" },
  { key: "customerName", header: "客户" },
  { key: "statusLabel", header: "状态", type: "badge" },
  { key: "plannedStartDate", header: "开始时间" },
  { key: "plannedEndDate", header: "结束时间" },
  { key: "budgetAmount", header: "预算金额", type: "currency" }
];

export const projectListConfig: ListPageConfig = {
  moduleKey: "projects",
  moduleLabel: "项目",
  basePath: "/projects",
  createLabel: "新增",
  createHref: "/projects/new",
  searchPlaceholder: "搜索项目名称、项目编号或客户",
  exportFileName: "projects",
  columns: projectColumns,
  filterFields: [
    { name: "name", label: "项目名称", type: "text", placeholder: "输入项目名称" },
    { name: "status", label: "状态", type: "select", options: projectStatusOptions },
    { name: "customerName", label: "客户", type: "text", placeholder: "输入客户名称" },
    { name: "createdBy", label: "项目经理", type: "text", placeholder: "输入项目经理" },
    { name: "plannedStartFrom", label: "开始时间从", type: "date" },
    { name: "plannedEndTo", label: "结束时间至", type: "date" }
  ],
  sortOptions: [
    { label: "创建时间", value: "createdAt" },
    { label: "计划开始时间", value: "plannedStartDate" },
    { label: "计划结束时间", value: "plannedEndDate" },
    { label: "预算金额", value: "budgetAmount" }
  ],
  defaultSort: {
    sortBy: "createdAt",
    sortOrder: "desc"
  },
  emptyText: "暂无项目数据"
};

export function buildProjectFields(opportunityOptions: SelectOption[]): EntityFormField<CreateProjectDto>[] {
  return [
    { name: "opportunityId", label: "商机", type: "select", options: opportunityOptions },
    { name: "name", label: "项目名称", type: "text" },
    { name: "budgetAmount", label: "预算金额", type: "number" },
    { name: "plannedStartDate", label: "计划开始日期", type: "date" },
    { name: "plannedEndDate", label: "计划结束日期", type: "date" },
    { name: "status", label: "状态", type: "select", options: projectStatusOptions },
    { name: "description", label: "描述", type: "textarea" }
  ];
}
