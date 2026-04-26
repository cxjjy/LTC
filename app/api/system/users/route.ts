import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { userManagementService } from "@/modules/users/service";
import { userCreateSchema } from "@/modules/users/validation";

export async function GET() {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    return userManagementService.list(user);
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const body = userCreateSchema.parse(await request.json());
    return userManagementService.create(body, user);
  });
}
