import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { receivableService } from "@/modules/receivables/service";
import { receivablePaymentSchema } from "@/modules/receivables/validation";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const body = receivablePaymentSchema.parse(await request.json());
    return receivableService.updateReceivablePayment(params.id, body, user);
  });
}
