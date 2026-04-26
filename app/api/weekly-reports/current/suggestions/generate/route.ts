import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { weeklyReportSuggestionGenerateSchema } from "@/modules/weekly-reports/validation";
import { weeklyReportService } from "@/modules/weekly-reports/service";

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const body = weeklyReportSuggestionGenerateSchema.parse(await request.json());
    return weeklyReportService.generateSuggestions(user, body);
  });
}
