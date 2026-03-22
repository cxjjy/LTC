import type { DataColumn } from "@/components/data-table";
import type { EntityFormField } from "@/components/forms/entity-form";
import type { ListPageConfig } from "@/types/list";
import type { CreateCustomerDto } from "@/modules/customers/dto";

export const customerColumns: DataColumn[] = [
  { key: "code", header: "客户编号", type: "link" },
  { key: "name", header: "客户名称" },
  { key: "industry", header: "行业" },
  { key: "contactName", header: "联系人" },
  { key: "contactPhone", header: "联系电话" },
  { key: "createdAt", header: "创建时间" }
];

export const customerListConfig: ListPageConfig = {
  moduleKey: "customers",
  moduleLabel: "客户",
  basePath: "/customers",
  createLabel: "新增",
  createHref: "/customers/new",
  searchPlaceholder: "搜索客户名称、客户编号或联系人",
  exportFileName: "customers",
  columns: customerColumns,
  filterFields: [
    { name: "name", label: "客户名称", type: "text", placeholder: "输入客户名称" },
    { name: "industry", label: "行业", type: "text", placeholder: "输入行业关键词" },
    { name: "contactName", label: "联系人", type: "text", placeholder: "输入联系人" },
    { name: "createdFrom", label: "创建开始", type: "date" },
    { name: "createdTo", label: "创建结束", type: "date" }
  ],
  sortOptions: [
    { label: "创建时间", value: "createdAt" },
    { label: "客户名称", value: "name" },
    { label: "客户编号", value: "code" }
  ],
  defaultSort: {
    sortBy: "createdAt",
    sortOrder: "desc"
  },
  emptyText: "暂无客户数据"
};

export const customerFields: EntityFormField<CreateCustomerDto>[] = [
  { name: "name", label: "客户名称", type: "text", placeholder: "输入客户名称" },
  { name: "industry", label: "行业", type: "text", placeholder: "例如：制造、互联网" },
  { name: "contactName", label: "联系人", type: "text" },
  { name: "contactPhone", label: "联系电话", type: "text" },
  { name: "address", label: "地址", type: "text" },
  { name: "remark", label: "备注", type: "textarea" }
];
