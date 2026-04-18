import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { bizAttachmentService } from "@/modules/biz-attachments/service";

export const dynamic = "force-dynamic";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const body = (await request.json()) as { remark?: string; status?: string };
    return bizAttachmentService.updateMeta(params.id, body, user);
  });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    return bizAttachmentService.delete(params.id, user);
  });
}
