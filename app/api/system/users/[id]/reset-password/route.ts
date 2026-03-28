import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { userManagementService } from "@/modules/users/service";
import { resetPasswordSchema } from "@/modules/users/validation";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const body = resetPasswordSchema.parse(await request.json());
    return userManagementService.resetPassword(params.id, body.password, user);
  });
}
