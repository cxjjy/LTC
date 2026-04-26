import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { bizAttachmentService, type BizAttachmentType } from "@/modules/biz-attachments/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const bizType = new URL(request.url).searchParams.get("bizType");
    return bizAttachmentService.listByProject(
      params.id,
      bizType ? ([bizType] as BizAttachmentType[]) : undefined,
      user
    );
  });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const formData = await request.formData();
    const file = formData.get("file");
    return bizAttachmentService.upload(
      {
        bizType: String(formData.get("bizType") ?? "") as BizAttachmentType,
        bizId: String(formData.get("bizId") ?? params.id),
        projectId: params.id,
        remark: String(formData.get("remark") ?? "") || undefined,
        status: String(formData.get("status") ?? "") || undefined,
        file: file instanceof File ? file : null
      },
      user
    );
  });
}
