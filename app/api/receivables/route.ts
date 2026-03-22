import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { normalizeListParams } from "@/lib/pagination";
import { receivableService } from "@/modules/receivables/service";
import { receivableCreateSchema } from "@/modules/receivables/validation";

export async function GET(request: Request) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const params = normalizeListParams(Object.fromEntries(new URL(request.url).searchParams.entries()));
    return receivableService.list(params, user);
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const body = receivableCreateSchema.parse(await request.json());
    return receivableService.create(body, user);
  });
}
