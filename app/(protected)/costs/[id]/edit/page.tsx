import { PageHeader } from "@/components/page-header";
import { requireSessionUser } from "@/lib/auth";
import { CostForm } from "@/modules/costs/ui/form";
import { decimalToNumber } from "@/modules/core/decimal";
import { costService } from "@/modules/costs/service";
import { projectService } from "@/modules/projects/service";
import { toDateInputValue } from "@/lib/utils";

export default async function EditCostPage({ params }: { params: { id: string } }) {
  const user = await requireSessionUser();
  const cost = (await costService.getDetail(params.id, user)) as any;
  const projectOptions = await projectService.getOptions(user);

  return (
    <div className="space-y-6">
      <PageHeader title="编辑成本" description={`正在编辑 ${cost.title}`} />
      <CostForm
        mode="edit"
        costId={cost.id}
        projectOptions={projectOptions}
        defaultValues={{
          projectId: cost.projectId,
          title: cost.title,
          category: cost.category,
          amount: decimalToNumber(cost.amount),
          occurredAt: toDateInputValue(cost.occurredAt),
          description: cost.description || ""
        }}
      />
    </div>
  );
}
