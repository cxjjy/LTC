import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import type { SessionUser } from "@/lib/auth";

export const permissionService = {
  async list(user: SessionUser) {
    requirePermission(user, "permission:view");
    return prisma.permission.findMany({
      orderBy: [{ module: "asc" }, { action: "asc" }, { name: "asc" }]
    });
  },
  async getOptions(user: SessionUser) {
    requirePermission(user, "role:view");
    return prisma.permission.findMany({
      where: {},
      orderBy: [{ module: "asc" }, { action: "asc" }, { name: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        module: true,
        action: true
      }
    });
  }
};
