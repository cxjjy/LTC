import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { roleService } from "@/modules/roles/service";
import { roleUpdateSchema } from "@/modules/roles/validation";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    return roleService.getById(params.id, user);
  });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const body = roleUpdateSchema.parse(await request.json());
    return roleService.update(params.id, body, user);
  });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    return roleService.softDelete(params.id, user);
  });
}
