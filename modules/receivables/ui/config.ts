import type { DataColumn } from "@/components/data-table";
import type { EntityFormField } from "@/components/forms/entity-form";
import { receivableStatusLabels } from "@/lib/constants";
import type { SelectOption } from "@/types/common";
import type { ListPageConfig } from "@/types/list";
import type { CreateReceivableDto } from "@/modules/receivables/dto";

export const receivableStatusOptions: SelectOption[] = Object.entries(receivableStatusLabels).map(([value, label]) => ({
  value,
  label
}));

export const receivableColumns: DataColumn[] = [
  { key: "code", header: "回款编号", type: "link" },
  { key: "title", header: "回款标题" },
  { key: "projectName", header: "所属项目" },
  { key: "contractName", header: "所属合同" },
  { key: "statusLabel", header: "状态", type: "badge" },
  { key: "dueDate", header: "应收日期" },
  { key: "amountDue", header: "应收金额", type: "currency" },
  { key: "amountReceived", header: "实收金额", type: "currency" }
];

export const receivableListConfig: ListPageConfig = {
  moduleKey: "receivables",
  moduleLabel: "回款",
  basePath: "/receivables",
  createLabel: "新增",
  createHref: "/receivables/new",
  searchPlaceholder: "搜索回款标题、回款编号或所属合同",
  exportFileName: "receivables",
  columns: receivableColumns,
  filterFields: [
    { name: "contractName", label: "所属合同", type: "text", placeholder: "输入合同名称" },
    { name: "projectName", label: "所属项目", type: "text", placeholder: "输入项目名称" },
    { name: "status", label: "回款状态", type: "select", options: receivableStatusOptions },
    { name: "dueFrom", label: "应收开始", type: "date" },
    { name: "dueTo", label: "应收结束", type: "date" },
    { name: "minAmount", label: "最小金额", type: "number", placeholder: "例如 10000" },
    { name: "maxAmount", label: "最大金额", type: "number", placeholder: "例如 200000" }
  ],
  sortOptions: [
    { label: "创建时间", value: "createdAt" },
    { label: "更新时间", value: "updatedAt" },
    { label: "应收日期", value: "dueDate" },
    { label: "应收金额", value: "amountDue" },
    { label: "实收金额", value: "amountReceived" }
  ],
  defaultSort: {
    sortBy: "createdAt",
    sortOrder: "desc"
  },
  emptyText: "暂无回款数据"
};

export function buildReceivableFields(contractOptions: SelectOption[]): EntityFormField<CreateReceivableDto>[] {
  return [
    { name: "contractId", label: "合同", type: "select", options: contractOptions },
    { name: "title", label: "回款标题", type: "text" },
    { name: "amountDue", label: "应收金额", type: "number" },
    { name: "dueDate", label: "应收日期", type: "date" },
    { name: "description", label: "描述", type: "textarea" }
  ];
}
