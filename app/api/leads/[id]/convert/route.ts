import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { convertLeadSchema } from "@/modules/leads/validation";
import { leadService } from "@/modules/leads/service";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const body = convertLeadSchema.parse(await request.json());
    return leadService.convertLeadToOpportunity(params.id, body, user);
  });
}
