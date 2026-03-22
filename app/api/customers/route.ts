import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { normalizeListParams } from "@/lib/pagination";
import { customerService } from "@/modules/customers/service";
import { customerCreateSchema } from "@/modules/customers/validation";

export async function GET(request: Request) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const params = normalizeListParams(Object.fromEntries(new URL(request.url).searchParams.entries()));
    return customerService.list(params, user);
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const body = customerCreateSchema.parse(await request.json());
    return customerService.create(body, user);
  });
}
