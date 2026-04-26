import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { contractService } from "@/modules/contracts/service";
import { contractWorkflowCallbackSchema } from "@/modules/contracts/validation";

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const body = contractWorkflowCallbackSchema.parse(await request.json());
    return contractService.handleWorkflowCallback(body, user);
  });
}
