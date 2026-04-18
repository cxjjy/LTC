import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { weeklyReportSuggestionApplySchema } from "@/modules/weekly-reports/validation";
import { weeklyReportService } from "@/modules/weekly-reports/service";

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const body = weeklyReportSuggestionApplySchema.parse(await request.json());
    return weeklyReportService.applySuggestions(user, body);
  });
}
