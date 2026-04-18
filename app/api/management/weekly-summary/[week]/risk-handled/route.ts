import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { z } from "zod";
import { managementWeeklyService } from "@/modules/management-weekly/service";

const riskHandledSchema = z.object({
  projectId: z.string().min(1, "项目不能为空")
});

export async function POST(request: Request, { params }: { params: { week: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const body = riskHandledSchema.parse(await request.json());
    return managementWeeklyService.markRiskProjectHandled(params.week, body.projectId, user);
  });
}
