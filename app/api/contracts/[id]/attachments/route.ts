import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { contractAttachmentService } from "@/modules/contracts/attachment.service";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    return contractAttachmentService.list(params.id, user);
  });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const formData = await request.formData();
    const file = formData.get("file");
    return contractAttachmentService.upload(params.id, file instanceof File ? file : null, user);
  });
}
