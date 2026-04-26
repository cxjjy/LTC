import type { DataColumn } from "@/components/data-table";
import type { SelectOption } from "@/types/common";

export type ListSortOrder = "asc" | "desc";
export type ListFilters = Record<string, string>;

export type ListHeaderTabItem = {
  label: string;
  href: string;
  active?: boolean;
};

export type ListFilterField = {
  name: string;
  label: string;
  type: "text" | "select" | "date" | "number";
  placeholder?: string;
  options?: SelectOption[];
};

export type ListSortOption = {
  label: string;
  value: string;
};

export type ListPageConfig = {
  moduleKey: string;
  moduleLabel: string;
  basePath: string;
  createLabel?: string;
  createHref?: string;
  searchPlaceholder: string;
  exportFileName: string;
  columns: DataColumn[];
  filterFields: ListFilterField[];
  sortOptions: ListSortOption[];
  defaultSort: {
    sortBy: string;
    sortOrder: ListSortOrder;
  };
  emptyText?: string;
  pageSizeOptions?: number[];
};
