import type { DataColumn } from "@/components/data-table";
import type { EntityFormField } from "@/components/forms/entity-form";
import { contractStatusLabels } from "@/lib/constants";
import type { SelectOption } from "@/types/common";
import type { ListPageConfig } from "@/types/list";
import type { CreateContractDto } from "@/modules/contracts/dto";

export const contractStatusOptions: SelectOption[] = Object.entries(contractStatusLabels).map(([value, label]) => ({
  value,
  label
}));

export const contractColumns: DataColumn[] = [
  { key: "code", header: "合同编号", type: "link" },
  { key: "name", header: "合同名称" },
  { key: "projectName", header: "所属项目" },
  { key: "statusLabel", header: "状态", type: "badge" },
  { key: "signedDate", header: "签约时间" },
  { key: "effectiveDate", header: "生效时间" },
  { key: "contractAmount", header: "合同金额", type: "currency" }
];

export const contractListConfig: ListPageConfig = {
  moduleKey: "contracts",
  moduleLabel: "合同",
  basePath: "/contracts",
  createLabel: "新增",
  createHref: "/contracts/new",
  searchPlaceholder: "搜索合同名称、合同编号或所属项目",
  exportFileName: "contracts",
  columns: contractColumns,
  filterFields: [
    { name: "name", label: "合同名称", type: "text", placeholder: "输入合同名称" },
    { name: "status", label: "状态", type: "select", options: contractStatusOptions },
    { name: "projectName", label: "所属项目", type: "text", placeholder: "输入项目名称" },
    { name: "minAmount", label: "最小金额", type: "number", placeholder: "例如 10000" },
    { name: "maxAmount", label: "最大金额", type: "number", placeholder: "例如 500000" },
    { name: "createdFrom", label: "创建开始", type: "date" },
    { name: "createdTo", label: "创建结束", type: "date" },
    { name: "signedFrom", label: "签约开始", type: "date" },
    { name: "signedTo", label: "签约结束", type: "date" }
  ],
  sortOptions: [
    { label: "签约时间", value: "signedDate" },
    { label: "创建时间", value: "createdAt" },
    { label: "合同金额", value: "contractAmount" },
    { label: "合同名称", value: "name" }
  ],
  defaultSort: {
    sortBy: "signedDate",
    sortOrder: "desc"
  },
  emptyText: "暂无合同数据"
};

export function buildContractFields(projectOptions: SelectOption[]): EntityFormField<CreateContractDto>[] {
  return [
    { name: "projectId", label: "项目", type: "select", options: projectOptions },
    { name: "name", label: "合同名称", type: "text" },
    { name: "contractAmount", label: "合同金额", type: "number" },
    { name: "signedDate", label: "签署日期", type: "date" },
    { name: "effectiveDate", label: "生效日期", type: "date" },
    { name: "endDate", label: "结束日期", type: "date" },
    { name: "status", label: "状态", type: "select", options: contractStatusOptions },
    { name: "description", label: "描述", type: "textarea" }
  ];
}
