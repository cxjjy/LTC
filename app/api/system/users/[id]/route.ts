import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { userManagementService } from "@/modules/users/service";
import { userUpdateSchema } from "@/modules/users/validation";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    return userManagementService.getById(params.id, user);
  });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const body = userUpdateSchema.parse(await request.json());
    return userManagementService.update(params.id, body, user);
  });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    return userManagementService.softDelete(params.id, user);
  });
}
