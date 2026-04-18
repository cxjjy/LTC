import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { requireSessionUser } from "@/lib/auth";
import { requirePagePermission } from "@/lib/rbac";
import { decimalToNumber } from "@/modules/core/decimal";
import { projectService } from "@/modules/projects/service";
import { ContractForm } from "@/modules/contracts/ui/form";
import { opportunityContractApprovalService } from "@/modules/opportunity-contract-approvals/service";
import type { PageSearchParams } from "@/types/common";

export default async function NewContractPage({ searchParams }: { searchParams: PageSearchParams }) {
  const user = await requirePagePermission(requireSessionUser(), "contract", "create");
  const projectOptions = await projectService.getOptions(user);
  const approvalId = typeof searchParams.approvalId === "string" ? searchParams.approvalId : undefined;
  const projectId = typeof searchParams.projectId === "string" ? searchParams.projectId : undefined;
  const approval = approvalId ? await opportunityContractApprovalService.getById(approvalId, user) : null;

  if (approvalId && approval?.status !== "approved") {
    redirect(`/contract-approvals/${approvalId}`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="新建合同"
        description={approval ? `审批单 ${approval.id.slice(0, 8)} 已通过，可继续创建合同` : "为项目创建合同，并控制状态流转"}
      />
      <ContractForm
        mode="create"
        projectOptions={projectOptions}
        approvalId={approvalId}
        defaultValues={{
          projectId: projectId || approval?.opportunity.projects?.[0]?.id || "",
          name: approval ? `${approval.opportunity.name} 合同` : "",
          contractAmount: approval
            ? decimalToNumber(approval.opportunity.estimatedRevenue ?? approval.opportunity.amount)
            : undefined
        }}
      />
    </div>
  );
}
