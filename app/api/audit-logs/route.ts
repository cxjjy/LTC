import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { normalizeListParams } from "@/lib/pagination";
import { auditLogModuleService } from "@/modules/audit-logs/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    const params = normalizeListParams(Object.fromEntries(new URL(request.url).searchParams.entries()));
    return auditLogModuleService.list(params, user);
  });
}
