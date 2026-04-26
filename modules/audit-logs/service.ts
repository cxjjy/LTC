import { AuditAction, EntityType, Prisma } from "@prisma/client";

import type { SessionUser } from "@/lib/auth";
import {
  createPaginationMeta,
  parseDateEnd,
  parseDateStart,
  type ListParams
} from "@/lib/pagination";
import { assertCanAccessRecord } from "@/lib/rbac";
import { notFound } from "@/lib/errors";
import { auditLogRepository } from "@/modules/audit-logs/repository";

class AuditLogModuleService {
  async list(params: Required<ListParams>, user: SessionUser) {
    assertCanAccessRecord(user, "auditLog", "view");
    const filters = params.filters;
    const and: Prisma.AuditLogWhereInput[] = [];

    if (params.keyword) {
      and.push({
        OR: [
          { entityCode: { contains: params.keyword } },
          { entityId: { contains: params.keyword } },
          { message: { contains: params.keyword } }
        ]
      });
    }

    if (filters.entityType && Object.values(EntityType).includes(filters.entityType as EntityType)) {
      and.push({ entityType: filters.entityType as EntityType });
    }

    if (filters.action && Object.values(AuditAction).includes(filters.action as AuditAction)) {
      and.push({ action: filters.action as AuditAction });
    }

    if (filters.actorId) {
      and.push({ actorId: { contains: filters.actorId } });
    }

    const createdFrom = parseDateStart(filters.createdFrom);
    const createdTo = parseDateEnd(filters.createdTo);
    if (createdFrom || createdTo) {
      and.push({
        createdAt: {
          ...(createdFrom ? { gte: createdFrom } : {}),
          ...(createdTo ? { lte: createdTo } : {})
        }
      });
    }

    const where: Prisma.AuditLogWhereInput = and.length ? { AND: and } : {};
    const orderByMap: Record<string, Prisma.AuditLogOrderByWithRelationInput> = {
      createdAt: { createdAt: params.sortOrder },
      action: { action: params.sortOrder },
      entityType: { entityType: params.sortOrder }
    };

    const total = await auditLogRepository.count(where);
    const items = await auditLogRepository.findMany({
      where,
      orderBy: orderByMap[params.sortBy] ?? { createdAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize
    });

    return {
      items,
      ...createPaginationMeta(total, params.page, params.pageSize)
    };
  }

  async getById(id: string, user: SessionUser) {
    assertCanAccessRecord(user, "auditLog", "view");
    const record = await auditLogRepository.findById(id);

    if (!record) {
      throw notFound("审计日志不存在");
    }

    return record;
  }

  async listByEntity(entityType: EntityType, entityId: string, user: SessionUser) {
    assertCanAccessRecord(user, "auditLog", "view");
    return auditLogRepository.findMany({
      where: {
        entityType,
        entityId
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });
  }
}

export const auditLogModuleService = new AuditLogModuleService();
