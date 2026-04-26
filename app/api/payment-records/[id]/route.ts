import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { paymentRecordService } from "@/modules/payment-records/service";
import { paymentRecordUpdateSchema } from "@/modules/payment-records/validation";

export const dynamic = "force-dynamic";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const body = paymentRecordUpdateSchema.parse(await request.json());
    return paymentRecordService.update(params.id, body, user);
  });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    return paymentRecordService.delete(params.id, user);
  });
}
