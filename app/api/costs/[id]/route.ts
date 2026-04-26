import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { costService } from "@/modules/costs/service";
import { costUpdateSchema } from "@/modules/costs/validation";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    return costService.getDetail(params.id, user);
  });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const body = costUpdateSchema.parse(await request.json());
    return costService.update(params.id, body, user);
  });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    return costService.softDelete(params.id, user);
  });
}
