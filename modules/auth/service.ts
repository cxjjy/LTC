import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { badRequest, unauthorized } from "@/lib/errors";
import { auditLogService } from "@/modules/core/audit-log.service";

export const authService = {
  async login(username: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user || !user.isActive) {
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

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role
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
