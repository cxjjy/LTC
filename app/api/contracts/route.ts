import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { normalizeListParams } from "@/lib/pagination";
import { contractService } from "@/modules/contracts/service";
import { contractCreateSchema } from "@/modules/contracts/validation";

export async function GET(request: Request) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const params = normalizeListParams(Object.fromEntries(new URL(request.url).searchParams.entries()));
    return contractService.list(params, user);
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const body = contractCreateSchema.parse(await request.json());
    const searchParams = new URL(request.url).searchParams;
    const approvalId = searchParams.get("approvalId") ?? undefined;
    return contractService.create(body, user, { approvalId });
  });
}
