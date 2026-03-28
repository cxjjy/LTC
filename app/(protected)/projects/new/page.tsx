import { PageHeader } from "@/components/page-header";
import { requireSessionUser } from "@/lib/auth";
import { requirePagePermission } from "@/lib/rbac";
import { opportunityService } from "@/modules/opportunities/service";
import { ProjectForm } from "@/modules/projects/ui/form";

export default async function NewProjectPage() {
  const user = await requirePagePermission(requireSessionUser(), "project", "create");
  const opportunityOptions = await opportunityService.getOptions(user);

  return (
    <div className="space-y-6">
      <PageHeader title="新建项目" description="创建项目基础信息，并关联客户、商机与后续执行数据" />
      <ProjectForm mode="create" opportunityOptions={opportunityOptions} defaultValues={{}} />
    </div>
  );
}
