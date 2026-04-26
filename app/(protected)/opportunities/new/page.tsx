import { PageHeader } from "@/components/page-header";
import { requireSessionUser } from "@/lib/auth";
import { requirePagePermission } from "@/lib/rbac";
import { customerService } from "@/modules/customers/service";
import { OpportunityForm } from "@/modules/opportunities/ui/form";

export default async function NewOpportunityPage() {
  const user = await requirePagePermission(requireSessionUser(), "opportunity", "create");
  const customerOptions = await customerService.getOptions(user);

  return (
    <div className="space-y-6">
      <PageHeader title="新建商机" description="创建商机信息，并在售前阶段完成收入与毛利预估。" />
      <OpportunityForm mode="create" customerOptions={customerOptions} defaultValues={{}} />
    </div>
  );
}
