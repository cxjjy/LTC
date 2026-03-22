import type { DataColumn } from "@/components/data-table";
import type { EntityFormField } from "@/components/forms/entity-form";
import { opportunityStageLabels } from "@/lib/constants";
import type { SelectOption } from "@/types/common";
import type { ListPageConfig } from "@/types/list";
import type { CreateOpportunityDto } from "@/modules/opportunities/dto";

export const opportunityStageOptions: SelectOption[] = Object.entries(opportunityStageLabels).map(
  ([value, label]) => ({
    value,
    label
  })
);

export const opportunityColumns: DataColumn[] = [
  { key: "code", header: "商机编号", type: "link" },
  { key: "name", header: "商机名称" },
  { key: "customerName", header: "客户" },
  { key: "stageLabel", header: "阶段", type: "badge" },
  { key: "expectedSignDate", header: "预计签约" },
  { key: "winRate", header: "赢率" },
  { key: "amount", header: "预计金额", type: "currency" }
];

export const opportunityListConfig: ListPageConfig = {
  moduleKey: "opportunities",
  moduleLabel: "商机",
  basePath: "/opportunities",
  createLabel: "新增",
  createHref: "/opportunities/new",
  searchPlaceholder: "搜索商机名称、商机编号或客户",
  exportFileName: "opportunities",
  columns: opportunityColumns,
  filterFields: [
    { name: "name", label: "商机名称", type: "text", placeholder: "输入商机名称" },
    { name: "status", label: "阶段", type: "select", options: opportunityStageOptions },
    { name: "customerName", label: "客户", type: "text", placeholder: "输入客户名称" },
    { name: "createdBy", label: "负责人", type: "text", placeholder: "输入负责人" },
    { name: "expectedSignFrom", label: "签约开始", type: "date" },
    { name: "expectedSignTo", label: "签约结束", type: "date" }
  ],
  sortOptions: [
    { label: "预计签约时间", value: "expectedSignDate" },
    { label: "创建时间", value: "createdAt" },
    { label: "预计金额", value: "amount" },
    { label: "赢率", value: "winRate" }
  ],
  defaultSort: {
    sortBy: "expectedSignDate",
    sortOrder: "desc"
  },
  emptyText: "暂无商机数据"
};

export function buildOpportunityFields(customerOptions: SelectOption[]): EntityFormField<CreateOpportunityDto>[] {
  return [
    { name: "customerId", label: "客户", type: "select", options: customerOptions },
    { name: "name", label: "商机名称", type: "text" },
    { name: "amount", label: "金额", type: "number" },
    { name: "expectedSignDate", label: "预计签约日期", type: "date" },
    { name: "winRate", label: "赢率", type: "number" },
    { name: "stage", label: "阶段", type: "select", options: opportunityStageOptions },
    { name: "description", label: "描述", type: "textarea" }
  ];
}
