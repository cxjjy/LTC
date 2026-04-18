import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { opportunityContractApprovalService } from "@/modules/opportunity-contract-approvals/service";

export const dynamic = "force-dynamic";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    return opportunityContractApprovalService.createContractDraft(params.id, user);
  });
}
