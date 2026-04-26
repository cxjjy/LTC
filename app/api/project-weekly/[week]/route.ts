import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { projectWeeklyService } from "@/modules/project-weekly/service";

export async function GET(request: Request, { params }: { params: { week: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const searchParams = new URL(request.url).searchParams;
    return projectWeeklyService.listProjectWeeklyOverview(
      {
        week: params.week,
        ownerId: searchParams.get("ownerId") ?? undefined,
        riskOnly: searchParams.get("riskOnly") === "true",
        keyword: searchParams.get("keyword") ?? undefined
      },
      user
    );
  });
}
