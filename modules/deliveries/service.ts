import { DeliveryStatus, EntityType, Prisma } from "@prisma/client";

import type { SessionUser } from "@/lib/auth";
import {
  createPaginationMeta,
  parseDateEnd,
  parseDateStart,
  type ListParams
} from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { assertCanAccessRecord } from "@/lib/rbac";
import { notFound } from "@/lib/errors";
import { auditLogService } from "@/modules/core/audit-log.service";
import { BaseCrudService } from "@/modules/core/base-crud-service";
import { generateBusinessCode } from "@/modules/core/code-generator.service";
import type { CreateDeliveryDto, UpdateDeliveryDto } from "@/modules/deliveries/dto";
import { deliveryRepository } from "@/modules/deliveries/repository";

class DeliveryService extends BaseCrudService<unknown> {
  constructor() {
    super(deliveryRepository, "delivery", EntityType.DELIVERY);
  }

  async list(params: Required<ListParams>, user: SessionUser) {
    assertCanAccessRecord(user, "delivery", "view");
    const filters = params.filters;
    const and: Prisma.DeliveryWhereInput[] = [];

    if (params.keyword) {
      and.push({
        OR: [
          { code: { contains: params.keyword } },
          { title: { contains: params.keyword } },
          { project: { name: { contains: params.keyword } } }
        ]
      });
    }

    if (filters.title) {
      and.push({ title: { contains: filters.title } });
    }

    if (filters.projectName) {
      and.push({ project: { name: { contains: filters.projectName } } });
    }

    if (filters.ownerName) {
      and.push({ ownerName: { contains: filters.ownerName } });
    }

    const plannedFrom = parseDateStart(filters.plannedFrom);
    const plannedTo = parseDateEnd(filters.plannedTo);
    if (plannedFrom || plannedTo) {
      and.push({
        plannedDate: {
          ...(plannedFrom ? { gte: plannedFrom } : {}),
          ...(plannedTo ? { lte: plannedTo } : {})
        }
      });
    }

    const where: Prisma.DeliveryWhereInput = {
      ...(params.status ? { status: params.status as DeliveryStatus } : {}),
      ...(and.length ? { AND: and } : {})
    };
    const orderByMap: Record<string, Prisma.DeliveryOrderByWithRelationInput> = {
      plannedDate: { plannedDate: params.sortOrder },
      createdAt: { createdAt: params.sortOrder },
      updatedAt: { updatedAt: params.sortOrder },
      title: { title: params.sortOrder }
    };

    const total = await deliveryRepository.count(where);
    const items = await deliveryRepository.findMany({
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
      orderBy: orderByMap[params.sortBy] ?? { createdAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize
    });

    return {
      items,
      ...createPaginationMeta(total, params.page, params.pageSize)
    };
  }

  async create(data: CreateDeliveryDto, user: SessionUser) {
    assertCanAccessRecord(user, "delivery", "create");
    const project = await prisma.project.findFirst({
      where: {
        id: data.projectId,
        isDeleted: false
      }
    });

    if (!project) {
      throw notFound("项目不存在");
    }

    const code = await generateBusinessCode(EntityType.DELIVERY);
    const record = await deliveryRepository.create({
      ...data,
      customerId: project.customerId,
      status: data.status ?? DeliveryStatus.NOT_STARTED,
      code,
      createdBy: user.id,
      updatedBy: user.id
    });

    await auditLogService.log({
      entityType: EntityType.DELIVERY,
      entityId: (record as { id: string }).id,
      entityCode: code,
      action: "CREATE",
      actorId: user.id,
      message: "创建交付记录"
    });

    return record;
  }

  async update(id: string, data: UpdateDeliveryDto, user: SessionUser) {
    assertCanAccessRecord(user, "delivery", "update");
    const existing = await deliveryRepository.findById(id);

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
      throw notFound("项目不存在");
    }

    const previousStatus = (existing as { status: DeliveryStatus }).status;
    const record = await deliveryRepository.update(id, {
      ...data,
      customerId: project.customerId,
      updatedBy: user.id
    });

    await auditLogService.log({
      entityType: EntityType.DELIVERY,
      entityId: id,
      entityCode: (record as { code: string }).code,
      action: "UPDATE",
      actorId: user.id,
      message: "更新交付记录"
    });

    if (previousStatus !== data.status) {
      await auditLogService.log({
        entityType: EntityType.DELIVERY,
        entityId: id,
        entityCode: (record as { code: string }).code,
        action: "STATUS_CHANGE",
        actorId: user.id,
        message: `交付状态变更为 ${data.status}`,
        payload: {
          from: previousStatus,
          to: data.status
        }
      });
    }

    return record;
  }

  async getDetail(id: string, user: SessionUser) {
    assertCanAccessRecord(user, "delivery", "view");
    const record = await deliveryRepository.findById(id, {
      customer: true,
      project: {
        include: {
          opportunity: {
            include: {
              lead: true
            }
          },
          contracts: {
            where: { isDeleted: false }
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

export const deliveryService = new DeliveryService();
