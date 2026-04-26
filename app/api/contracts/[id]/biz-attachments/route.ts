import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { bizAttachmentService, type BizAttachmentType } from "@/modules/biz-attachments/service";

export const dynamic = "force-dynamic";

function getBizType(url: string) {
  const value = new URL(url).searchParams.get("bizType");
  return value ? (value as BizAttachmentType) : undefined;
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    return bizAttachmentService.listByContract(params.id, getBizType(request.url), user);
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
        contractId: params.id,
        projectId: String(formData.get("projectId") ?? "") || undefined,
        remark: String(formData.get("remark") ?? "") || undefined,
        status: String(formData.get("status") ?? "") || undefined,
        file: file instanceof File ? file : null
      },
      user
    );
  });
}
