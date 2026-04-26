"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  buildListHref,
  normalizeListParams,
  serializeFilters,
  type ListFilters,
  type ListSortOrder
} from "@/lib/pagination";

type UseListQueryStateOptions = {
  defaultSortBy: string;
  defaultSortOrder: ListSortOrder;
};

export function useListQueryState({
  defaultSortBy,
  defaultSortOrder
}: UseListQueryStateOptions) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchDraft, setSearchDraft] = useState("");

  const query = useMemo(() => {
    const parsed = normalizeListParams(Object.fromEntries(searchParams.entries()));

    return {
      ...parsed,
      sortBy: parsed.sortBy || defaultSortBy,
      sortOrder: parsed.sortBy ? parsed.sortOrder : defaultSortOrder
    };
  }, [defaultSortBy, defaultSortOrder, searchParams]);

  useEffect(() => {
    setSearchDraft(query.q);
  }, [query.q]);

  function navigate(nextSearchParams: URLSearchParams, replace = false) {
    const href = buildListHref(pathname, Object.fromEntries(nextSearchParams.entries()));

    startTransition(() => {
      if (replace) {
        router.replace(href, { scroll: false });
      } else {
        router.push(href, { scroll: false });
      }
    });
  }

  function updateQuery(
    patch: Partial<{
      q: string;
      page: number;
      pageSize: number;
      sortBy: string;
      sortOrder: ListSortOrder;
      filters: ListFilters;
    }>,
    options?: { resetPage?: boolean; replace?: boolean }
  ) {
    const next = new URLSearchParams(searchParams.toString());

    next.delete("keyword");
    next.delete("status");

    if (patch.q !== undefined) {
      if (patch.q.trim()) {
        next.set("q", patch.q.trim());
      } else {
        next.delete("q");
      }
    }

    if (patch.page !== undefined) {
      next.set("page", String(patch.page));
    }

    if (patch.pageSize !== undefined) {
      next.set("pageSize", String(patch.pageSize));
    }

    if (patch.sortBy !== undefined) {
      if (patch.sortBy) {
        next.set("sortBy", patch.sortBy);
      } else {
        next.delete("sortBy");
      }
    }

    if (patch.sortOrder !== undefined) {
      next.set("sortOrder", patch.sortOrder);
    }

    if (patch.filters !== undefined) {
      const serialized = serializeFilters(patch.filters);
      if (serialized) {
        next.set("filters", serialized);
      } else {
        next.delete("filters");
      }
    }

    if (options?.resetPage) {
      next.set("page", "1");
    }

    navigate(next, options?.replace);
  }

  useEffect(() => {
    if (searchDraft === query.q) {
      return;
    }

    const timeout = window.setTimeout(() => {
      updateQuery({ q: searchDraft }, { resetPage: true, replace: true });
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [query.q, searchDraft]);

  return {
    query,
    searchDraft,
    setSearchDraft,
    isPending,
    submitSearch() {
      updateQuery({ q: searchDraft }, { resetPage: true });
    },
    clearSearch() {
      setSearchDraft("");
      updateQuery({ q: "" }, { resetPage: true });
    },
    applyFilters(filters: ListFilters) {
      updateQuery({ filters }, { resetPage: true });
    },
    resetFilters() {
      updateQuery({ filters: {} }, { resetPage: true });
    },
    setSort(sortBy: string, sortOrder: ListSortOrder) {
      updateQuery({ sortBy, sortOrder }, { resetPage: true });
    },
    goToPage(page: number) {
      updateQuery({ page });
    },
    setPageSize(pageSize: number) {
      updateQuery({ pageSize }, { resetPage: true });
    },
    resetAll() {
      const next = new URLSearchParams(searchParams.toString());

      next.delete("q");
      next.delete("keyword");
      next.delete("status");
      next.delete("page");
      next.delete("pageSize");
      next.delete("sortBy");
      next.delete("sortOrder");
      next.delete("filters");

      const href = buildListHref(pathname, Object.fromEntries(next.entries()));

      startTransition(() => {
        router.replace(href, { scroll: false });
        router.refresh();
      });
    }
  };
}
