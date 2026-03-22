import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/section-card";
import { SearchBar } from "@/components/search-bar";
import type { SelectOption } from "@/types/common";

type ListFilterProps = {
  keyword?: string;
  status?: string;
  statusOptions?: SelectOption[];
};

export function ListFilter({ keyword, status, statusOptions = [] }: ListFilterProps) {
  return (
    <SectionCard title="筛选与搜索" description="快速定位当前模块中的关键记录。">
        <form className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
          <div className="relative">
            <SearchBar
              name="keyword"
              defaultValue={keyword}
              placeholder="搜索编号、名称或关键字"
            />
          </div>
          <select
            name="status"
            defaultValue={status}
            className="control-surface flex h-10 rounded-[var(--radius-control)] px-3.5 py-2 text-sm text-foreground outline-none focus:ring-4 focus:ring-[rgba(59,130,246,0.10)]"
          >
            <option value="">全部状态</option>
            {statusOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <Button type="submit" variant="secondary">
            <Search className="h-4 w-4" />
            筛选
          </Button>
        </form>
    </SectionCard>
  );
}
