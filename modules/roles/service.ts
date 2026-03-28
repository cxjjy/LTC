import { EntityType } from "@prisma/client";

import type { SessionUser } from "@/lib/auth";
import { badRequest, notFound } from "@/lib/errors";
import { permissionDefinitions } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { auditLogService } from "@/modules/core/audit-log.service";
import type { CreateRoleInput, UpdateRoleInput } from "@/modules/roles/validation";

async function resolvePermissionIds(permissionCodes: string[]) {
  const permissions = await prisma.permission.findMany({
    where: {
      code: {
        in: permissionCodes
      }
    },
    select: {
      id: true,
      code: true
    }
  });

  if (permissions.length !== permissionCodes.length) {
    throw badRequest("存在无效权限，无法保存角色");
  }

  return permissions.map((item) => item.id);
}

export const roleService = {
  async list(user: SessionUser) {
    requirePermission(user, "role:view");
    const roles = await prisma.role.findMany({
      where: { isDeleted: false },
      include: {
        userRoles: {
          where: {
            user: {
              isDeleted: false
            }
          },
          select: {
            id: true
          }
        },
        rolePermissions: {
          include: {
            permission: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return roles.map((role) => ({
      ...role,
      _count: {
        userRoles: role.userRoles.length
      }
    }));
  },

  async getById(id: string, user: SessionUser) {
    requirePermission(user, "role:view");
    const role = await prisma.role.findFirst({
      where: { id, isDeleted: false },
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        }
      }
    });
    if (!role) {
      throw notFound("角色不存在");
    }
    return role;
  },

  async create(data: CreateRoleInput, user: SessionUser) {
    requirePermission(user, "role:create");
    const duplicate = await prisma.role.findFirst({
      where: {
        OR: [{ code: data.code }, { name: data.name }],
        isDeleted: false
      }
    });
    if (duplicate) {
      throw badRequest("角色编码或名称已存在");
    }

    const permissionIds = await resolvePermissionIds(data.permissionCodes);
    const role = await prisma.role.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        isSystem: false,
        rolePermissions: {
          create: permissionIds.map((permissionId) => ({
            permissionId
          }))
        }
      }
    });

    await auditLogService.log({
      entityType: EntityType.ROLE,
      entityId: role.id,
      entityCode: role.code,
      action: "CREATE",
      actorId: user.id,
      message: "创建角色"
    });

    return role;
  },

  async update(id: string, data: UpdateRoleInput, user: SessionUser) {
    requirePermission(user, "role:update");
    const existing = await prisma.role.findFirst({
      where: { id, isDeleted: false }
    });
    if (!existing) {
      throw notFound("角色不存在");
    }
    if (existing.isSystem && existing.code !== data.code) {
      throw badRequest("系统角色编码不可修改");
    }

    const duplicate = await prisma.role.findFirst({
      where: {
        OR: [{ code: data.code }, { name: data.name }],
        isDeleted: false,
        NOT: { id }
      }
    });
    if (duplicate) {
      throw badRequest("角色编码或名称已存在");
    }

    const permissionIds = await resolvePermissionIds(data.permissionCodes);
    const role = await prisma.role.update({
      where: { id },
      data: {
        code: existing.isSystem ? existing.code : data.code,
        name: data.name,
        description: data.description,
        rolePermissions: {
          deleteMany: {},
          create: permissionIds.map((permissionId) => ({
            permissionId
          }))
        }
      }
    });

    await auditLogService.log({
      entityType: EntityType.ROLE,
      entityId: role.id,
      entityCode: role.code,
      action: "UPDATE",
      actorId: user.id,
      message: "更新角色"
    });

    return role;
  },

  async softDelete(id: string, user: SessionUser) {
    requirePermission(user, "role:delete");
    const role = await prisma.role.findFirst({
      where: { id, isDeleted: false },
      include: {
        _count: {
          select: {
            userRoles: true
          }
        }
      }
    });
    if (!role) {
      throw notFound("角色不存在");
    }
    if (role.isSystem) {
      throw badRequest("系统角色不可删除");
    }
    if (role._count.userRoles > 0) {
      throw badRequest("当前角色已分配给用户，无法删除");
    }

    const deleted = await prisma.role.update({
      where: { id },
      data: {
        isDeleted: true
      }
    });

    await auditLogService.log({
      entityType: EntityType.ROLE,
      entityId: deleted.id,
      entityCode: deleted.code,
      action: "SOFT_DELETE",
      actorId: user.id,
      message: "删除角色"
    });

    return deleted;
  },

  async getRoleOptions(user: SessionUser) {
    requirePermission(user, "user:view");
    return prisma.role.findMany({
      where: { isDeleted: false },
      orderBy: [{ isSystem: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        code: true,
        name: true,
        isSystem: true
      }
    });
  },

  getPermissionDictionary() {
    return permissionDefinitions;
  }
};
