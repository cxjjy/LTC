import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { auditLogModuleService } from "@/modules/audit-logs/service";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    return auditLogModuleService.getById(params.id, user);
  });
}
