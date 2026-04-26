import Link from "next/link";

import { Button } from "@/components/ui/button";

type PaginationBarProps = {
  total?: number;
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
};

export function PaginationBar({ total, page, totalPages, buildHref }: PaginationBarProps) {
  return (
    <div className="flex flex-col gap-3 px-5 py-3.5 md:flex-row md:items-center md:justify-between">
      <p className="text-sm text-muted-foreground">
        {typeof total === "number" ? `共 ${total} 条` : "数据列表"}，第 {page} / {totalPages} 页
      </p>
      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="sm" disabled={page <= 1}>
          <Link href={buildHref(page - 1)}>上一页</Link>
        </Button>
        <div className="inline-flex h-8 min-w-8 items-center justify-center rounded-[8px] bg-[var(--color-primary)] px-2 text-sm font-semibold text-white">
          {page}
        </div>
        <Button asChild variant="outline" size="sm" disabled={page >= totalPages}>
          <Link href={buildHref(page + 1)}>下一页</Link>
        </Button>
      </div>
    </div>
  );
}
