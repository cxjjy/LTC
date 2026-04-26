import { PageHeader } from "@/components/page-header";
import { requireSessionUser } from "@/lib/auth";
import { requirePagePermission } from "@/lib/rbac";
import { customerService } from "@/modules/customers/service";
import { LeadForm } from "@/modules/leads/ui/form";

export default async function NewLeadPage() {
  const user = await requirePagePermission(requireSessionUser(), "lead", "create");
  const customerOptions = await customerService.getOptions(user);

  return (
    <div className="space-y-6">
      <PageHeader title="新建线索" description="录入前期项目机会信息，并沉淀客户需求" />
      <LeadForm mode="create" customerOptions={customerOptions} defaultValues={{}} />
    </div>
  );
}
