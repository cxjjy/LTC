import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { invoiceRecordService } from "@/modules/invoice-records/service";
import { invoiceRecordUpdateSchema } from "@/modules/invoice-records/validation";

export const dynamic = "force-dynamic";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const body = invoiceRecordUpdateSchema.parse(await request.json());
    return invoiceRecordService.update(params.id, body, user);
  });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    return invoiceRecordService.delete(params.id, user);
  });
}
