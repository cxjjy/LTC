import { PageHeader } from "@/components/page-header";
import { requireSessionUser } from "@/lib/auth";
import { requirePagePermission } from "@/lib/rbac";
import { CostForm } from "@/modules/costs/ui/form";
import { projectService } from "@/modules/projects/service";

export default async function NewCostPage() {
  const user = await requirePagePermission(requireSessionUser(), "cost", "create");
  const projectOptions = await projectService.getOptions(user);

  return (
    <div className="space-y-6">
      <PageHeader title="新建成本" description="成本必须归属项目" />
      <CostForm mode="create" projectOptions={projectOptions} defaultValues={{}} />
    </div>
  );
}
