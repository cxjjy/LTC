import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { projectWeeklyService } from "@/modules/project-weekly/service";

export async function GET(_: Request, { params }: { params: { week: string; projectId: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    return projectWeeklyService.getProjectWeeklySnapshot(params.projectId, params.week, user);
  });
}
