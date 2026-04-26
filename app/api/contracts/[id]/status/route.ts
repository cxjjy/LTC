import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { badRequest } from "@/lib/errors";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    await requireApiUser();
    throw badRequest(`合同 ${params.id} 的状态已改为流程驱动，请通过审批回调或业务动作更新`);
  });
}
