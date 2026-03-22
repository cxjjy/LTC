import type { DataColumn } from "@/components/data-table";
import type { EntityFormField } from "@/components/forms/entity-form";
import { leadStatusLabels } from "@/lib/constants";
import type { SelectOption } from "@/types/common";
import type { ListPageConfig } from "@/types/list";
import type { CreateLeadDto } from "@/modules/leads/dto";

export const leadStatusOptions: SelectOption[] = Object.entries(leadStatusLabels).map(([value, label]) => ({
  value,
  label
}));

export const leadColumns: DataColumn[] = [
  { key: "code", header: "线索编号", type: "link" },
  { key: "title", header: "线索标题" },
  { key: "customerName", header: "客户" },
  { key: "source", header: "来源" },
  { key: "statusLabel", header: "状态", type: "badge" },
  { key: "expectedCloseDate", header: "预计关闭" },
  { key: "expectedAmount", header: "预计金额", type: "currency" }
];

export const leadListConfig: ListPageConfig = {
  moduleKey: "leads",
  moduleLabel: "线索",
  basePath: "/leads",
  createLabel: "新增",
  createHref: "/leads/new",
  searchPlaceholder: "搜索线索名称、线索编号或客户",
  exportFileName: "leads",
  columns: leadColumns,
  filterFields: [
    { name: "title", label: "线索名称", type: "text", placeholder: "输入线索名称" },
    { name: "status", label: "状态", type: "select", options: leadStatusOptions },
    { name: "source", label: "来源", type: "text", placeholder: "输入来源" },
    { name: "contactName", label: "负责人/联系人", type: "text", placeholder: "输入联系人" },
    { name: "createdFrom", label: "创建开始", type: "date" },
    { name: "createdTo", label: "创建结束", type: "date" }
  ],
  sortOptions: [
    { label: "创建时间", value: "createdAt" },
    { label: "预计关闭时间", value: "expectedCloseDate" },
    { label: "预计金额", value: "expectedAmount" },
    { label: "线索标题", value: "title" }
  ],
  defaultSort: {
    sortBy: "createdAt",
    sortOrder: "desc"
  },
  emptyText: "暂无线索数据"
};

export function buildLeadFields(customerOptions: SelectOption[]): EntityFormField<CreateLeadDto>[] {
  return [
    { name: "customerId", label: "客户", type: "select", options: customerOptions },
    { name: "title", label: "线索标题", type: "text" },
    { name: "source", label: "线索来源", type: "text" },
    { name: "contactName", label: "联系人", type: "text" },
    { name: "contactPhone", label: "联系电话", type: "text" },
    { name: "expectedAmount", label: "预计金额", type: "number" },
    { name: "expectedCloseDate", label: "预计关闭日期", type: "date" },
    { name: "latestFollowUpAt", label: "最近跟进时间", type: "date" },
    { name: "status", label: "状态", type: "select", options: leadStatusOptions },
    { name: "description", label: "描述", type: "textarea" }
  ];
}
