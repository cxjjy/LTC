import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { roleService } from "@/modules/roles/service";
import { roleCreateSchema } from "@/modules/roles/validation";

export async function GET() {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    return roleService.list(user);
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const body = roleCreateSchema.parse(await request.json());
    return roleService.create(body, user);
  });
}
