import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { requireSessionUser } from "@/lib/auth";
import { normalizeListParams } from "@/lib/pagination";
import { requirePagePermission } from "@/lib/rbac";
import { ProjectOverviewClient } from "@/modules/projects/overview/client";
import { projectOverviewService } from "@/modules/projects/overview/service";
import type { PageSearchParams } from "@/types/common";

export default async function ProjectOverviewPage({ searchParams }: { searchParams: PageSearchParams }) {
  const user = await requirePagePermission(requireSessionUser(), "project", "view");
  const result = await projectOverviewService.list(normalizeListParams(searchParams), user);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="overview-page-meta space-y-2 px-1">
        <PageBreadcrumb
          items={[
            { label: "工作台", href: "/dashboard" },
            { label: "项目经营视图" }
          ]}
        />
        <div className="space-y-1">
          <h1 className="text-[18px] font-semibold tracking-[-0.03em] text-foreground md:text-[20px]">项目经营视图</h1>
          <p className="text-[13px] leading-5 text-muted-foreground">
            以经营宽表方式联动查看项目、合同、回款、成本、利润与商机信息。
          </p>
        </div>
      </div>
      <ProjectOverviewClient result={result} />
    </div>
  );
}
