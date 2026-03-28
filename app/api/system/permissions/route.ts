import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { permissionService } from "@/modules/permissions/service";

export const dynamic = "force-dynamic";

export async function GET() {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    return permissionService.list(user);
  });
}
