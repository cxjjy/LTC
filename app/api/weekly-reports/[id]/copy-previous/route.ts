import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { weeklyReportService } from "@/modules/weekly-reports/service";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    return weeklyReportService.copyPreviousWeek(params.id, user.id);
  });
}
