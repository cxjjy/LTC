export type SelectOption = {
  label: string;
  value: string;
  keywords?: string[];
  pinyin?: string;
  initials?: string;
  description?: string;
};

export type PageSearchParams = Record<string, string | string[] | undefined>;

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
