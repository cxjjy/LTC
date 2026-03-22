import { CostCategory, EntityType, Prisma } from "@prisma/client";

import type { SessionUser } from "@/lib/auth";
import {
  createPaginationMeta,
  parseDateEnd,
  parseDateStart,
  parseNumberFilter,
  type ListParams
} from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { assertCanAccessRecord } from "@/lib/rbac";
import { notFound, badRequest } from "@/lib/errors";
import { auditLogService } from "@/modules/core/audit-log.service";
import { BaseCrudService } from "@/modules/core/base-crud-service";
import { generateBusinessCode } from "@/modules/core/code-generator.service";
import { toDecimal } from "@/modules/core/decimal";
import type { CreateCostDto, UpdateCostDto } from "@/modules/costs/dto";
import { costRepository } from "@/modules/costs/repository";

class CostService extends BaseCrudService<unknown> {
  constructor() {
    super(costRepository, "cost", EntityType.COST);
  }

  async list(params: Required<ListParams>, user: SessionUser) {
    assertCanAccessRecord(user, "cost", "view");
    const filters = params.filters;
    const and: Prisma.CostWhereInput[] = [];

    if (params.keyword) {
      and.push({
        OR: [
          { code: { contains: params.keyword } },
          { title: { contains: params.keyword } },
          { project: { name: { contains: params.keyword } } }
        ]
      });
    }

    if (filters.projectName) {
      and.push({ project: { name: { contains: filters.projectName } } });
    }

    const minAmount = parseNumberFilter(filters.minAmount);
    const maxAmount = parseNumberFilter(filters.maxAmount);
    if (minAmount !== undefined || maxAmount !== undefined) {
      and.push({
        amount: {
          ...(minAmount !== undefined ? { gte: minAmount } : {}),
          ...(maxAmount !== undefined ? { lte: maxAmount } : {})
        }
      });
    }

    const occurredFrom = parseDateStart(filters.occurredFrom);
    const occurredTo = parseDateEnd(filters.occurredTo);
    if (occurredFrom || occurredTo) {
      and.push({
        occurredAt: {
          ...(occurredFrom ? { gte: occurredFrom } : {}),
          ...(occurredTo ? { lte: occurredTo } : {})
        }
      });
    }

    const where: Prisma.CostWhereInput = {
      ...(params.status ? { category: params.status as CostCategory } : {}),
      ...(and.length ? { AND: and } : {})
    };
    const orderByMap: Record<string, Prisma.CostOrderByWithRelationInput> = {
      occurredAt: { occurredAt: params.sortOrder },
      createdAt: { createdAt: params.sortOrder },
      amount: { amount: params.sortOrder },
      title: { title: params.sortOrder }
    };

    const total = await costRepository.count(where);
    const items = await costRepository.findMany({
      where,
      include: {
        customer: true,
        project: {
          include: {
            opportunity: {
              include: {
                lead: true
              }
            }
          }
        }
      },
      orderBy: orderByMap[params.sortBy] ?? { occurredAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize
    });

    return {
      items,
      ...createPaginationMeta(total, params.page, params.pageSize)
    };
  }

  async create(data: CreateCostDto, user: SessionUser) {
    assertCanAccessRecord(user, "cost", "create");
    const project = await prisma.project.findFirst({
      where: {
        id: data.projectId,
        isDeleted: false
      }
    });

    if (!project) {
      throw badRequest("成本必须归属有效项目");
    }

    const code = await generateBusinessCode(EntityType.COST);
    const record = await costRepository.create({
      ...data,
      customerId: project.customerId,
      amount: toDecimal(data.amount),
      code,
      createdBy: user.id,
      updatedBy: user.id
    });

    await auditLogService.log({
      entityType: EntityType.COST,
      entityId: (record as { id: string }).id,
      entityCode: code,
      action: "CREATE",
      actorId: user.id,
      message: "创建成本记录"
    });

    return record;
  }

  async update(id: string, data: UpdateCostDto, user: SessionUser) {
    assertCanAccessRecord(user, "cost", "update");
    const existing = await costRepository.findById(id);

    if (!existing) {
      throw notFound();
    }

    const project = await prisma.project.findFirst({
      where: {
        id: data.projectId,
        isDeleted: false
      }
    });

    if (!project) {
      throw badRequest("成本必须归属有效项目");
    }

    const record = await costRepository.update(id, {
      ...data,
      customerId: project.customerId,
      amount: toDecimal(data.amount),
      updatedBy: user.id
    });

    await auditLogService.log({
      entityType: EntityType.COST,
      entityId: id,
      entityCode: (record as { code: string }).code,
      action: "UPDATE",
      actorId: user.id,
      message: "更新成本记录"
    });

    return record;
  }

  async getDetail(id: string, user: SessionUser) {
    assertCanAccessRecord(user, "cost", "view");
    const record = await costRepository.findById(id, {
      customer: true,
      project: {
        include: {
          opportunity: {
            include: {
              lead: true
            }
          }
        }
      }
    });

    if (!record) {
      throw notFound();
    }

    return record;
  }
}

export const costService = new CostService();
