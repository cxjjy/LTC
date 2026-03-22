import { PAGE_SIZE } from "@/lib/constants";

export type ListFilters = Record<string, string>;
export type ListSortOrder = "asc" | "desc";

export type ListParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  keyword?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: ListSortOrder;
  filters?: ListFilters;
};

function parseFilters(raw?: string | string[]) {
  if (typeof raw !== "string" || !raw.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([, value]) => typeof value === "string" && value.trim() !== ""
      )
    ) as ListFilters;
  } catch {
    return {};
  }
}

export function serializeFilters(filters?: ListFilters) {
  const entries = Object.entries(filters ?? {}).filter(([, value]) => value !== "");
  return entries.length ? JSON.stringify(Object.fromEntries(entries)) : "";
}

export function omitListFilters(filters: ListFilters = {}, keys: string[] = []) {
  return Object.fromEntries(
    Object.entries(filters).filter(([key]) => !keys.includes(key))
  ) as ListFilters;
}

export function buildListHref(
  basePath: string,
  params: (Partial<ListParams> & Record<string, string | number | ListFilters | undefined>) = {}
) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (key === "filters" && value && typeof value === "object" && !Array.isArray(value)) {
      const serialized = serializeFilters(value as ListFilters);
      if (serialized) {
        search.set("filters", serialized);
      }
      return;
    }

    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  });

  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function normalizeListParams(
  searchParams?: Record<string, string | string[] | undefined>
): Required<ListParams> {
  const page = Number(searchParams?.page ?? 1);
  const pageSize = Number(searchParams?.pageSize ?? PAGE_SIZE);
  const q =
    typeof searchParams?.q === "string"
      ? searchParams.q.trim()
      : typeof searchParams?.keyword === "string"
        ? searchParams.keyword.trim()
        : "";
  const filters = parseFilters(searchParams?.filters);
  const status =
    typeof searchParams?.status === "string" ? searchParams.status : filters.status ?? "";
  const sortBy = typeof searchParams?.sortBy === "string" ? searchParams.sortBy : "";
  const sortOrder: ListSortOrder = searchParams?.sortOrder === "asc" ? "asc" : "desc";

  return {
    page: Number.isNaN(page) || page < 1 ? 1 : page,
    pageSize: Number.isNaN(pageSize) || pageSize < 1 ? PAGE_SIZE : pageSize,
    q,
    keyword: q,
    status,
    sortBy,
    sortOrder,
    filters
  };
}

export function createPaginationMeta(total: number, page: number, pageSize: number) {
  return {
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize))
  };
}

export function parseNumberFilter(value?: string) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function parseDateStart(value?: string) {
  return value ? new Date(value) : undefined;
}

export function parseDateEnd(value?: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}
