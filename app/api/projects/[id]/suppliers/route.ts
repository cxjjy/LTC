import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { projectService } from "@/modules/projects/service";
import { projectSupplierLinkSchema } from "@/modules/projects/validation";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    return projectService.listProjectSuppliers(params.id, user);
  });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const body = projectSupplierLinkSchema.parse(await request.json());
    return projectService.linkSupplier(params.id, body, user);
  });
}
