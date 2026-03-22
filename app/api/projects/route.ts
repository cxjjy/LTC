import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { normalizeListParams } from "@/lib/pagination";
import { projectService } from "@/modules/projects/service";
import { projectCreateSchema } from "@/modules/projects/validation";

export async function GET(request: Request) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const params = normalizeListParams(Object.fromEntries(new URL(request.url).searchParams.entries()));
    return projectService.list(params, user);
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const body = projectCreateSchema.parse(await request.json());
    return projectService.create(body, user);
  });
}
