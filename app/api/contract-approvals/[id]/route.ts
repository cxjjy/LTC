import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { opportunityContractApprovalService } from "@/modules/opportunity-contract-approvals/service";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    return opportunityContractApprovalService.getById(params.id, user);
  });
}
