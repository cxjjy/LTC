import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { badRequest, unauthorized } from "@/lib/errors";
import { auditLogService } from "@/modules/core/audit-log.service";
import { defaultRolePermissionCodes, legacyRoleFallbackMap, roleLabelMap, type RoleCode } from "@/lib/permissions";

export const authService = {
  async login(username: string, password: string) {
    const user = await prisma.user.findFirst({
      where: { username, isDeleted: false },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!user || !user.isActive || user.isDeleted) {
      throw unauthorized("用户名或密码错误");
    }

    const matched = await bcrypt.compare(password, user.passwordHash);

    if (!matched) {
      throw unauthorized("用户名或密码错误");
    }

    await auditLogService.log({
      entityType: "USER",
      entityId: user.id,
      entityCode: user.username,
      action: "LOGIN",
      actorId: user.id,
      message: "用户登录"
    });

    const assignedRoles = user.userRoles.map((item) => item.role);
    const primaryRoleCode = assignedRoles[0]?.code ?? legacyRoleFallbackMap[user.role] ?? "VIEWER";
    const permissions = assignedRoles.length
      ? Array.from(
          new Set(assignedRoles.flatMap((role) => role.rolePermissions.map((item) => item.permission.code)))
        )
      : defaultRolePermissionCodes[primaryRoleCode as RoleCode] ?? [];

    return {
      id: user.id,
      username: user.username,
      name: user.displayName || user.name,
      role: primaryRoleCode,
      roleName: assignedRoles[0]?.name ?? roleLabelMap[primaryRoleCode as RoleCode] ?? primaryRoleCode,
      roles: assignedRoles.map((role) => ({
        id: role.id,
        code: role.code,
        name: role.name,
        isSystem: role.isSystem
      })),
      permissions
    };
  },
  async getUserById(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw badRequest("用户不存在");
    }
    return user;
  }
};
