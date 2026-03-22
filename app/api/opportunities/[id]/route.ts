import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { opportunityService } from "@/modules/opportunities/service";
import { opportunityUpdateSchema } from "@/modules/opportunities/validation";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    return opportunityService.getDetail(params.id, user);
  });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const body = opportunityUpdateSchema.parse(await request.json());
    return opportunityService.update(params.id, body, user);
  });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    return opportunityService.softDelete(params.id, user);
  });
}
