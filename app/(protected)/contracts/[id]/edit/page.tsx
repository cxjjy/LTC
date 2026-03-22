import { PageHeader } from "@/components/page-header";
import { requireSessionUser } from "@/lib/auth";
import { projectService } from "@/modules/projects/service";
import { decimalToNumber } from "@/modules/core/decimal";
import { contractService } from "@/modules/contracts/service";
import { ContractForm } from "@/modules/contracts/ui/form";
import { toDateInputValue } from "@/lib/utils";

export default async function EditContractPage({ params }: { params: { id: string } }) {
  const user = await requireSessionUser();
  const contract = (await contractService.getDetail(params.id, user)) as any;
  const projectOptions = await projectService.getOptions(user);

  return (
    <div className="space-y-6">
      <PageHeader title="编辑合同" description={`正在编辑 ${contract.name}`} />
      <ContractForm
        mode="edit"
        contractId={contract.id}
        projectOptions={projectOptions}
        defaultValues={{
          projectId: contract.projectId,
          name: contract.name,
          contractAmount: decimalToNumber(contract.contractAmount),
          signedDate: toDateInputValue(contract.signedDate),
          effectiveDate: toDateInputValue(contract.effectiveDate),
          endDate: toDateInputValue(contract.endDate),
          status: contract.status,
          description: contract.description || ""
        }}
      />
    </div>
  );
}
