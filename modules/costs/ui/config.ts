import type { DataColumn } from "@/components/data-table";
import type { EntityFormField } from "@/components/forms/entity-form";
import { costCategoryLabels } from "@/lib/constants";
import type { SelectOption } from "@/types/common";
import type { ListPageConfig } from "@/types/list";
import type { CreateCostDto } from "@/modules/costs/dto";

export const costCategoryOptions: SelectOption[] = Object.entries(costCategoryLabels).map(([value, label]) => ({
  value,
  label
}));

export const costColumns: DataColumn[] = [
  { key: "code", header: "成本编号", type: "link" },
  { key: "title", header: "成本标题" },
  { key: "projectName", header: "所属项目" },
  { key: "categoryLabel", header: "类别", type: "badge" },
  { key: "occurredAt", header: "发生时间" },
  { key: "amount", header: "金额", type: "currency" }
];

export const costListConfig: ListPageConfig = {
  moduleKey: "costs",
  moduleLabel: "成本",
  basePath: "/costs",
  createLabel: "新增",
  createHref: "/costs/new",
  searchPlaceholder: "搜索成本标题、成本编号或所属项目",
  exportFileName: "costs",
  columns: costColumns,
  filterFields: [
    { name: "status", label: "成本类型", type: "select", options: costCategoryOptions },
    { name: "projectName", label: "所属项目", type: "text", placeholder: "输入项目名称" },
    { name: "minAmount", label: "最小金额", type: "number", placeholder: "例如 1000" },
    { name: "maxAmount", label: "最大金额", type: "number", placeholder: "例如 50000" },
    { name: "occurredFrom", label: "发生开始", type: "date" },
    { name: "occurredTo", label: "发生结束", type: "date" }
  ],
  sortOptions: [
    { label: "创建时间", value: "createdAt" },
    { label: "更新时间", value: "updatedAt" },
    { label: "发生时间", value: "occurredAt" },
    { label: "金额", value: "amount" },
    { label: "成本标题", value: "title" }
  ],
  defaultSort: {
    sortBy: "createdAt",
    sortOrder: "desc"
  },
  emptyText: "暂无成本数据"
};

export function buildCostFields(projectOptions: SelectOption[]): EntityFormField<CreateCostDto>[] {
  return [
    { name: "projectId", label: "项目", type: "select", options: projectOptions },
    { name: "title", label: "成本标题", type: "text" },
    { name: "category", label: "成本类别", type: "select", options: costCategoryOptions },
    { name: "amount", label: "金额", type: "number" },
    { name: "occurredAt", label: "发生日期", type: "date" },
    { name: "description", label: "描述", type: "textarea" }
  ];
}
