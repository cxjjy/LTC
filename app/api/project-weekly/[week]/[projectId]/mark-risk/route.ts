import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { projectWeeklyService } from "@/modules/project-weekly/service";

export async function POST(_: Request, { params }: { params: { week: string; projectId: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    return projectWeeklyService.markProjectWeeklyRisk(params.week, params.projectId, user);
  });
}
