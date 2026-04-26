import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { customerService } from "@/modules/customers/service";
import { customerUpdateSchema } from "@/modules/customers/validation";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    return customerService.getDetail(params.id, user);
  });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const body = customerUpdateSchema.parse(await request.json());
    return customerService.update(params.id, body, user);
  });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    return customerService.softDelete(params.id, user);
  });
}
