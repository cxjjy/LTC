import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { weeklyReportReturnSchema } from "@/modules/weekly-reports/validation";
import { weeklyReportService } from "@/modules/weekly-reports/service";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const body = weeklyReportReturnSchema.parse(await request.json());
    return weeklyReportService.returnReport(params.id, user, body);
  });
}
