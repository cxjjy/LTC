import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { formatWeekKey, getNaturalWeekRange } from "@/lib/week";
import { weeklyReportService } from "@/modules/weekly-reports/service";

export async function GET() {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    return weeklyReportService.getWeeklyReportWorkbench(user, formatWeekKey(getNaturalWeekRange().weekStart));
  });
}
