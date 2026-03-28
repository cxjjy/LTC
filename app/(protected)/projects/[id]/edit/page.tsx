import { PageHeader } from "@/components/page-header";
import { requireSessionUser } from "@/lib/auth";
import { requirePagePermission } from "@/lib/rbac";
import { opportunityService } from "@/modules/opportunities/service";
import { decimalToNumber } from "@/modules/core/decimal";
import { projectService } from "@/modules/projects/service";
import { ProjectForm } from "@/modules/projects/ui/form";
import { toDateInputValue } from "@/lib/utils";

export default async function EditProjectPage({ params }: { params: { id: string } }) {
  const user = await requirePagePermission(requireSessionUser(), "project", "update");
  const project = (await projectService.getDetail(params.id, user)) as any;
  const opportunityOptions = await opportunityService.getOptions(user);

  return (
    <div className="space-y-6">
      <PageHeader title="编辑项目" description={`正在编辑 ${project.name}`} />
      <ProjectForm
        mode="edit"
        projectId={project.id}
        opportunityOptions={opportunityOptions}
        defaultValues={{
          opportunityId: project.opportunityId,
          name: project.name,
          budgetAmount: decimalToNumber(project.budgetAmount),
          plannedStartDate: toDateInputValue(project.plannedStartDate),
          plannedEndDate: toDateInputValue(project.plannedEndDate),
          status: project.status,
          description: project.description || ""
        }}
      />
    </div>
  );
}
