import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { invoiceRecordService } from "@/modules/invoice-records/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const formData = await request.formData();
    const file = formData.get("file");
    return invoiceRecordService.uploadAttachment(
      params.id,
      file instanceof File ? file : null,
      String(formData.get("remark") ?? "") || undefined,
      user
    );
  });
}
