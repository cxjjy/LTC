import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { receivableService } from "@/modules/receivables/service";
import { receivableUpdateSchema } from "@/modules/receivables/validation";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    return receivableService.getDetail(params.id, user);
  });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const body = receivableUpdateSchema.parse(await request.json());
    return receivableService.update(params.id, body, user);
  });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    return receivableService.softDelete(params.id, user);
  });
}
