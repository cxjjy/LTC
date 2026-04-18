import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { weeklyReportReviewSchema } from "@/modules/weekly-reports/validation";
import { weeklyReportService } from "@/modules/weekly-reports/service";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const body = weeklyReportReviewSchema.parse(await request.json());
    return weeklyReportService.reviewReport(params.id, user, body);
  });
}
