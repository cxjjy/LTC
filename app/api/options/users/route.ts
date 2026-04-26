import { withApiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertCanAccessRecord } from "@/lib/rbac";

export async function GET(request: Request) {
  return withApiHandler(async () => {
    const user = await requireApiUser();
    assertCanAccessRecord(user, "user", "view");

    const searchParams = new URL(request.url).searchParams;
    const q = searchParams.get("q")?.trim() ?? "";
    const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? "20"), 1), 100);

    const items = await prisma.user.findMany({
      where: {
        isDeleted: false,
        isActive: true,
        ...(q
          ? {
              OR: [
                { username: { contains: q } },
                { displayName: { contains: q } },
                { name: { contains: q } }
              ]
            }
          : {})
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: {
        id: true,
        username: true,
        displayName: true,
        name: true
      }
    });

    return {
      items: items.map((item) => ({
        value: item.id,
        label: `${item.displayName || item.name} / ${item.username}`,
        keywords: [item.displayName || item.name, item.name, item.username].filter(Boolean)
      }))
    };
  });
}
