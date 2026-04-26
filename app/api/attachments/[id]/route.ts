import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { contractAttachmentService } from "@/modules/contracts/attachment.service";

export const dynamic = "force-dynamic";

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    return contractAttachmentService.delete(params.id, user);
  });
}
