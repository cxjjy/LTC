import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { opportunityContractApprovalService } from "@/modules/opportunity-contract-approvals/service";
import { createOpportunityContractApprovalSchema } from "@/modules/opportunity-contract-approvals/validation";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    return opportunityContractApprovalService.getLatestByOpportunity(params.id, user);
  });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const body = createOpportunityContractApprovalSchema.parse(await request.json());
    return opportunityContractApprovalService.create(params.id, body, user);
  });
}
