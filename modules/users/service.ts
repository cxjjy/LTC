import bcrypt from "bcryptjs";
import { EntityType } from "@prisma/client";

import type { SessionUser } from "@/lib/auth";
import { badRequest, notFound } from "@/lib/errors";
import { legacyRoleFallbackMap, roleLabelMap, type RoleCode } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { normalizeDisplayName } from "@/lib/user-identity";
import { auditLogService } from "@/modules/core/audit-log.service";
import type { CreateUserInput, UpdateUserInput } from "@/modules/users/validation";

function resolvePrimaryLegacyRole(roleCodes: string[]) {
  const primary = roleCodes[0];
  if (!primary) {
    return "VIEWER";
  }
  return primary === "PROJECT_MANAGER" ? "PROJECT_MANAGER" : primary;
}

export const userManagementService = {
  async list(user: SessionUser) {
    requirePermission(user, "user:view");
    return prisma.user.findMany({
      where: { isDeleted: false },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  },

  async getById(id: string, user: SessionUser) {
    requirePermission(user, "user:view");
    const record = await prisma.user.findFirst({
      where: { id, isDeleted: false },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });
    if (!record) {
      throw notFound("用户不存在");
    }
    return record;
  },

  async create(data: CreateUserInput, operator: SessionUser) {
    requirePermission(operator, "user:create");
    const exists = await prisma.user.findFirst({
      where: {
        username: data.username,
        isDeleted: false
      }
    });
    if (exists) {
      throw badRequest("用户名已存在");
    }

    if (data.email) {
      const emailExists = await prisma.user.findFirst({
        where: {
          email: data.email,
          isDeleted: false
        }
      });
      if (emailExists) {
        throw badRequest("邮箱已存在");
      }
    }

    const roleRecords = await prisma.role.findMany({
      where: {
        id: { in: data.roleIds },
        isDeleted: false
      }
    });

    if (roleRecords.length !== data.roleIds.length) {
      throw badRequest("角色不存在或已失效");
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const primaryRoleCode = resolvePrimaryLegacyRole(roleRecords.map((item) => item.code));
    const created = await prisma.user.create({
      data: {
        username: data.username,
        displayName: normalizeDisplayName(data.displayName),
        name: normalizeDisplayName(data.displayName),
        email: data.email || null,
        phone: data.phone || null,
        passwordHash,
        isActive: data.isActive,
        role: (legacyRoleFallbackMap[primaryRoleCode] ?? primaryRoleCode) as any,
        userRoles: {
          create: data.roleIds.map((roleId) => ({
            roleId
          }))
        }
      }
    });

    await auditLogService.log({
      entityType: EntityType.USER,
      entityId: created.id,
      entityCode: created.username,
      action: "CREATE",
      actorId: operator.id,
      message: "创建用户"
    });

    return created;
  },

  async update(id: string, data: UpdateUserInput, operator: SessionUser) {
    requirePermission(operator, "user:update");
    const existing = await prisma.user.findFirst({
      where: { id, isDeleted: false }
    });
    if (!existing) {
      throw notFound("用户不存在");
    }

    const duplicateUsername = await prisma.user.findFirst({
      where: {
        username: data.username,
        isDeleted: false,
        NOT: { id }
      }
    });
    if (duplicateUsername) {
      throw badRequest("用户名已存在");
    }

    if (data.email) {
      const duplicateEmail = await prisma.user.findFirst({
        where: {
          email: data.email,
          isDeleted: false,
          NOT: { id }
        }
      });
      if (duplicateEmail) {
        throw badRequest("邮箱已存在");
      }
    }

    const roleRecords = await prisma.role.findMany({
      where: {
        id: { in: data.roleIds },
        isDeleted: false
      }
    });

    if (roleRecords.length !== data.roleIds.length) {
      throw badRequest("角色不存在或已失效");
    }

    const primaryRoleCode = resolvePrimaryLegacyRole(roleRecords.map((item) => item.code));
    const updated = await prisma.user.update({
      where: { id },
      data: {
        username: data.username,
        displayName: normalizeDisplayName(data.displayName),
        name: normalizeDisplayName(data.displayName),
        email: data.email || null,
        phone: data.phone || null,
        isActive: data.isActive,
        role: (legacyRoleFallbackMap[primaryRoleCode] ?? primaryRoleCode) as any,
        userRoles: {
          deleteMany: {},
          create: data.roleIds.map((roleId) => ({
            roleId
          }))
        }
      }
    });

    await auditLogService.log({
      entityType: EntityType.USER,
      entityId: updated.id,
      entityCode: updated.username,
      action: "UPDATE",
      actorId: operator.id,
      message: "更新用户"
    });

    return updated;
  },

  async changeStatus(id: string, isActive: boolean, operator: SessionUser) {
    requirePermission(operator, "user:update");
    const existing = await prisma.user.findFirst({
      where: { id, isDeleted: false }
    });
    if (!existing) {
      throw notFound("用户不存在");
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive }
    });

    await auditLogService.log({
      entityType: EntityType.USER,
      entityId: updated.id,
      entityCode: updated.username,
      action: "UPDATE",
      actorId: operator.id,
      message: isActive ? "启用用户" : "禁用用户"
    });

    return updated;
  },

  async resetPassword(id: string, password: string, operator: SessionUser) {
    requirePermission(operator, "user:update");
    const existing = await prisma.user.findFirst({
      where: { id, isDeleted: false }
    });
    if (!existing) {
      throw notFound("用户不存在");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const updated = await prisma.user.update({
      where: { id },
      data: { passwordHash }
    });

    await auditLogService.log({
      entityType: EntityType.USER,
      entityId: updated.id,
      entityCode: updated.username,
      action: "UPDATE",
      actorId: operator.id,
      message: "重置用户密码"
    });

    return updated;
  },

  async softDelete(id: string, operator: SessionUser) {
    requirePermission(operator, "user:delete");
    if (id === operator.id) {
      throw badRequest("不能删除当前登录账号");
    }
    const existing = await prisma.user.findFirst({
      where: { id, isDeleted: false }
    });
    if (!existing) {
      throw notFound("用户不存在");
    }

    const deleted = await prisma.user.update({
      where: { id },
      data: {
        isDeleted: true,
        isActive: false
      }
    });

    await auditLogService.log({
      entityType: EntityType.USER,
      entityId: deleted.id,
      entityCode: deleted.username,
      action: "SOFT_DELETE",
      actorId: operator.id,
      message: "删除用户"
    });

    return deleted;
  },

  formatRoleSummary(userRecord: {
    userRoles: Array<{
      role: {
        code: string;
        name: string;
      };
    }>;
    role: string;
  }) {
    const roles = userRecord.userRoles.map((item) => item.role.name);
    if (roles.length) {
      return roles.join("、");
    }
    const fallback = legacyRoleFallbackMap[userRecord.role] ?? "VIEWER";
    return roleLabelMap[fallback as RoleCode];
  }
};
