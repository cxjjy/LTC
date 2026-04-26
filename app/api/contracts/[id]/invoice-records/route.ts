import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { invoiceRecordCreateSchema } from "@/modules/invoice-records/validation";
import { invoiceRecordService } from "@/modules/invoice-records/service";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    return invoiceRecordService.listByContract(params.id, user);
  });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const body = invoiceRecordCreateSchema.parse(await request.json());
    return invoiceRecordService.create(params.id, body, user);
  });
}
