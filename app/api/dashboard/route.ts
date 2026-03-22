import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { getDashboardMetrics } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export async function GET() {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    return getDashboardMetrics(user);
  });
}
