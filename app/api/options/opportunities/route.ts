import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertCanAccessRecord } from "@/lib/rbac";

export async function GET(request: Request) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    assertCanAccessRecord(user, "opportunity", "view");

    const searchParams = new URL(request.url).searchParams;
    const q = searchParams.get("q")?.trim() ?? "";
    const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? "20"), 1), 100);

    const items = await prisma.opportunity.findMany({
      where: {
        isDeleted: false,
        ...(q
          ? {
              OR: [{ code: { contains: q } }, { name: { contains: q } }]
            }
          : {})
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: {
        id: true,
        code: true,
        name: true
      }
    });

    return {
      items: items.map((item) => ({
        value: item.id,
        label: `${item.code} / ${item.name}`,
        keywords: [item.code, item.name]
      }))
    };
  });
}
