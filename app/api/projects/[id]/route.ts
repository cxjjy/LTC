import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { projectService } from "@/modules/projects/service";
import { projectUpdateSchema } from "@/modules/projects/validation";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    return projectService.getDetail(params.id, user);
  });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const body = projectUpdateSchema.parse(await request.json());
    return projectService.update(params.id, body, user);
  });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    return projectService.softDelete(params.id, user);
  });
}
