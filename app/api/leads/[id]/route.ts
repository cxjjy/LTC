import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { leadService } from "@/modules/leads/service";
import { leadUpdateSchema } from "@/modules/leads/validation";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    return leadService.getDetail(params.id, user);
  });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const body = leadUpdateSchema.parse(await request.json());
    return leadService.update(params.id, body, user);
  });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    return leadService.softDelete(params.id, user);
  });
}
