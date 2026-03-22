import { PageHeader } from "@/components/page-header";
import { requireSessionUser } from "@/lib/auth";
import { customerService } from "@/modules/customers/service";
import { OpportunityForm } from "@/modules/opportunities/ui/form";

export default async function NewOpportunityPage() {
  const user = await requireSessionUser();
  const customerOptions = await customerService.getOptions(user);

  return (
    <div className="space-y-6">
      <PageHeader title="新建商机" description="创建商机信息，为项目立项和经营跟进提供依据" />
      <OpportunityForm mode="create" customerOptions={customerOptions} defaultValues={{}} />
    </div>
  );
}
