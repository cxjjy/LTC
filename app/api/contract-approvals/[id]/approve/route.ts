import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { opportunityContractApprovalService } from "@/modules/opportunity-contract-approvals/service";
import { reviewOpportunityContractApprovalSchema } from "@/modules/opportunity-contract-approvals/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const body = reviewOpportunityContractApprovalSchema.parse(await request.json());
    return opportunityContractApprovalService.approve(params.id, body, user);
  });
}
