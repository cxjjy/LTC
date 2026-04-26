import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { deliveryService } from "@/modules/deliveries/service";
import { deliveryUpdateSchema } from "@/modules/deliveries/validation";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    return deliveryService.getDetail(params.id, user);
  });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const body = deliveryUpdateSchema.parse(await request.json());
    return deliveryService.update(params.id, body, user);
  });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    return deliveryService.softDelete(params.id, user);
  });
}
