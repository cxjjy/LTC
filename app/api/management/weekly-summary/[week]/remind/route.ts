import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { weeklyReportRemindSchema } from "@/modules/weekly-reports/validation";
import { weeklyReportService } from "@/modules/weekly-reports/service";

export async function POST(request: Request, { params }: { params: { week: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const body = weeklyReportRemindSchema.parse(await request.json());
    return weeklyReportService.remindWeeklyReports(params.week, user, body);
  });
}
