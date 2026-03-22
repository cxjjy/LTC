import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { normalizeListParams } from "@/lib/pagination";
import { costService } from "@/modules/costs/service";
import { costCreateSchema } from "@/modules/costs/validation";

export async function GET(request: Request) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const params = normalizeListParams(Object.fromEntries(new URL(request.url).searchParams.entries()));
    return costService.list(params, user);
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const body = costCreateSchema.parse(await request.json());
    return costService.create(body, user);
  });
}
