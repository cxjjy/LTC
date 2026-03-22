import { PageHeader } from "@/components/page-header";
import { requireSessionUser } from "@/lib/auth";
import { contractService } from "@/modules/contracts/service";
import { ReceivableForm } from "@/modules/receivables/ui/form";

export default async function NewReceivablePage() {
  const user = await requireSessionUser();
  const contractOptions = await contractService.getOptions(user);

  return (
    <div className="space-y-6">
      <PageHeader title="新建回款" description="系统会在服务端校验合同是否已生效" />
      <ReceivableForm mode="create" contractOptions={contractOptions} defaultValues={{}} />
    </div>
  );
}
