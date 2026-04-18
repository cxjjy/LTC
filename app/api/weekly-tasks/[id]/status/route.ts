import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { weeklyTaskUpdateStatusSchema } from "@/modules/weekly-tasks/validation";
import { weeklyTaskService } from "@/modules/weekly-tasks/service";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const body = weeklyTaskUpdateStatusSchema.parse(await request.json());
    return weeklyTaskService.updateTaskStatus(params.id, body, user);
  });
}
