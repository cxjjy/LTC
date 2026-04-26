import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { paymentRecordService } from "@/modules/payment-records/service";
import { paymentRecordCreateSchema } from "@/modules/payment-records/validation";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    return paymentRecordService.listByContract(params.id, user);
  });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const body = paymentRecordCreateSchema.parse(await request.json());
    return paymentRecordService.create(params.id, body, user);
  });
}
