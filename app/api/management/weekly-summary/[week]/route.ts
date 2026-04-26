import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { managementWeeklyService } from "@/modules/management-weekly/service";

export async function GET(_: Request, { params }: { params: { week: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    return managementWeeklyService.getManagementWeeklySummary(params.week, user);
  });
}
