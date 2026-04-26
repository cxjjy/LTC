import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { weeklyReportService } from "@/modules/weekly-reports/service";

export async function GET(request: Request) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const week = new URL(request.url).searchParams.get("week") ?? undefined;
    return weeklyReportService.getCurrentSuggestions(user, week);
  });
}
