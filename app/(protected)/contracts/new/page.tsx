import { PageHeader } from "@/components/page-header";
import { requireSessionUser } from "@/lib/auth";
import { requirePagePermission } from "@/lib/rbac";
import { projectService } from "@/modules/projects/service";
import { ContractForm } from "@/modules/contracts/ui/form";

export default async function NewContractPage() {
  const user = await requirePagePermission(requireSessionUser(), "contract", "create");
  const projectOptions = await projectService.getOptions(user);

  return (
    <div className="space-y-6">
      <PageHeader title="新建合同" description="为项目创建合同，并控制状态流转" />
      <ContractForm mode="create" projectOptions={projectOptions} defaultValues={{}} />
    </div>
  );
}
