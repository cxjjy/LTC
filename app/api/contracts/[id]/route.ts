import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { contractService } from "@/modules/contracts/service";
import { contractUpdateSchema } from "@/modules/contracts/validation";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    return contractService.getDetail(params.id, user);
  });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const body = contractUpdateSchema.parse(await request.json());
    return contractService.update(params.id, body, user);
  });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    return contractService.softDelete(params.id, user);
  });
}
