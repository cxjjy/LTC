import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { opportunityService } from "@/modules/opportunities/service";
import { convertOpportunitySchema } from "@/modules/opportunities/validation";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const body = convertOpportunitySchema.parse(await request.json());
    return opportunityService.convertOpportunityToProject(params.id, body, user);
  });
}
