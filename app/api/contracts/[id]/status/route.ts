import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { contractService } from "@/modules/contracts/service";
import { contractStatusSchema } from "@/modules/contracts/validation";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const body = contractStatusSchema.parse(await request.json());
    return contractService.changeContractStatus(params.id, body, user);
  });
}
