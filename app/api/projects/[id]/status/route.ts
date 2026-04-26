import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { projectService } from "@/modules/projects/service";
import { projectStatusSchema } from "@/modules/projects/validation";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const body = projectStatusSchema.parse(await request.json());
    return projectService.changeProjectStatus(params.id, body, user);
  });
}
