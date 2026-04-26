import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { userManagementService } from "@/modules/users/service";
import { userStatusSchema } from "@/modules/users/validation";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const body = userStatusSchema.parse(await request.json());
    return userManagementService.changeStatus(params.id, body.isActive, user);
  });
}
