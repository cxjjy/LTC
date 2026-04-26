import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { weeklyReportSuggestionIgnoreSchema } from "@/modules/weekly-reports/validation";
import { weeklyReportService } from "@/modules/weekly-reports/service";

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const body = weeklyReportSuggestionIgnoreSchema.parse(await request.json());
    return weeklyReportService.ignoreSuggestions(user, body);
  });
}
