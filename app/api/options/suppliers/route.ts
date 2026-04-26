import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertCanAccessRecord } from "@/lib/rbac";

export async function GET(request: Request) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    assertCanAccessRecord(user, "project", "view");

    const searchParams = new URL(request.url).searchParams;
    const q = searchParams.get("q")?.trim() ?? "";
    const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? "20"), 1), 100);

    const keyword = `%${q}%`;
    const items = await prisma.$queryRawUnsafe<Array<{ id: string; code: string; name: string }>>(
      q
        ? `SELECT id, code, name
           FROM suppliers
           WHERE is_deleted = false AND (code LIKE ? OR name LIKE ?)
           ORDER BY updated_at DESC
           LIMIT ?`
        : `SELECT id, code, name
           FROM suppliers
           WHERE is_deleted = false
           ORDER BY updated_at DESC
           LIMIT ?`,
      ...(q ? [keyword, keyword, limit] : [limit])
    );

    return {
      items: items.map((item: { id: string; code: string; name: string }) => ({
        value: item.id,
        label: `${item.code} / ${item.name}`,
        keywords: [item.code, item.name]
      }))
    };
  });
}
