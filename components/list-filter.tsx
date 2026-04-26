import { Search } from "lucide-react";

import { SearchableSelect } from "@/components/common/SearchableSelect";
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
          <SearchableSelect
            name="status"
            defaultValue={status}
            options={statusOptions}
            placeholder="全部状态"
            searchPlaceholder="搜索状态"
          />
          <Button type="submit" variant="secondary">
            <Search className="h-4 w-4" />
            筛选
          </Button>
        </form>
    </SectionCard>
  );
}
