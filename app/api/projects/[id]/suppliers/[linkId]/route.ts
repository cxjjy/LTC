import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { projectService } from "@/modules/projects/service";

export async function DELETE(_: Request, { params }: { params: { id: string; linkId: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    return projectService.unlinkSupplier(params.id, params.linkId, user);
  });
}
