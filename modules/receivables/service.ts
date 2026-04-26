import { ContractStatus, EntityType, Prisma, ReceivableStatus } from "@prisma/client";

import type { SessionUser } from "@/lib/auth";
import { badRequest, notFound } from "@/lib/errors";
import {
  createPaginationMeta,
  parseDateEnd,
  parseDateStart,
  parseNumberFilter,
  type ListParams
} from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { assertCanAccessRecord } from "@/lib/rbac";
import { auditLogService } from "@/modules/core/audit-log.service";
import { BaseCrudService } from "@/modules/core/base-crud-service";
import { generateBusinessCode } from "@/modules/core/code-generator.service";
import { decimalToNumber, toDecimal } from "@/modules/core/decimal";
import { CONTRACT_STATUS_ACTIVE } from "@/modules/contracts/status";
import type {
  CreateReceivableDto,
  UpdateReceivableDto,
  UpdateReceivablePaymentDto
} from "@/modules/receivables/dto";
import { receivableRepository } from "@/modules/receivables/repository";

function resolveReceivableStatus(amountDue: number, amountReceived: number, dueDate: Date) {
  if (amountReceived >= amountDue) {
    return ReceivableStatus.RECEIVED;
  }

  const now = new Date();

  if (dueDate < now) {
    return ReceivableStatus.OVERDUE;
  }

  if (amountReceived > 0) {
    return ReceivableStatus.PARTIAL;
  }

  return ReceivableStatus.PENDING;
}

class ReceivableService extends BaseCrudService<unknown> {
  constructor() {
    super(receivableRepository, "receivable", EntityType.RECEIVABLE);
  }

  async list(params: Required<ListParams>, user: SessionUser) {
    assertCanAccessRecord(user, "receivable", "view");
    const filters = params.filters;
    const and: Prisma.ReceivableWhereInput[] = [];

    if (params.keyword) {
      and.push({
        OR: [
          { code: { contains: params.keyword } },
          { title: { contains: params.keyword } },
          { contract: { name: { contains: params.keyword } } }
        ]
      });
    }

    if (filters.contractName) {
      and.push({ contract: { name: { contains: filters.contractName } } });
    }

    if (filters.projectName) {
      and.push({ project: { name: { contains: filters.projectName } } });
    }

    const dueFrom = parseDateStart(filters.dueFrom);
    const dueTo = parseDateEnd(filters.dueTo);
    if (dueFrom || dueTo) {
      and.push({
        dueDate: {
          ...(dueFrom ? { gte: dueFrom } : {}),
          ...(dueTo ? { lte: dueTo } : {})
        }
      });
    }

    const minAmount = parseNumberFilter(filters.minAmount);
    const maxAmount = parseNumberFilter(filters.maxAmount);
    if (minAmount !== undefined || maxAmount !== undefined) {
      and.push({
        amountDue: {
          ...(minAmount !== undefined ? { gte: minAmount } : {}),
          ...(maxAmount !== undefined ? { lte: maxAmount } : {})
        }
      });
    }

    const where: Prisma.ReceivableWhereInput = {
      ...(params.status ? { status: params.status as ReceivableStatus } : {}),
      ...(and.length ? { AND: and } : {})
    };
    const orderByMap: Record<string, Prisma.ReceivableOrderByWithRelationInput> = {
      dueDate: { dueDate: params.sortOrder },
      createdAt: { createdAt: params.sortOrder },
      updatedAt: { updatedAt: params.sortOrder },
      amountDue: { amountDue: params.sortOrder },
      amountReceived: { amountReceived: params.sortOrder }
    };

    const total = await receivableRepository.count(where);
    const items = await receivableRepository.findMany({
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
        },
        contract: true
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

  async create(data: CreateReceivableDto, user: SessionUser) {
    assertCanAccessRecord(user, "receivable", "create");
    const contract = await prisma.contract.findFirst({
      where: {
        id: data.contractId,
        isDeleted: false
      }
    });

    if (!contract) {
      throw badRequest("回款必须归属有效合同");
    }

    if (contract.status !== CONTRACT_STATUS_ACTIVE) {
      throw badRequest("合同未进入执行中前不得创建回款");
    }

    const code = await generateBusinessCode(EntityType.RECEIVABLE);
    const status = resolveReceivableStatus(data.amountDue, 0, data.dueDate);
    const record = await receivableRepository.create({
      ...data,
      customerId: contract.customerId,
      projectId: contract.projectId,
      amountDue: toDecimal(data.amountDue),
      amountReceived: toDecimal(0),
      status,
      code,
      createdBy: user.id,
      updatedBy: user.id
    });

    await auditLogService.log({
      entityType: EntityType.RECEIVABLE,
      entityId: (record as { id: string }).id,
      entityCode: code,
      action: "CREATE",
      actorId: user.id,
      message: "创建回款计划"
    });

    return record;
  }

  async update(id: string, data: UpdateReceivableDto, user: SessionUser) {
    assertCanAccessRecord(user, "receivable", "update");
    const existing = await receivableRepository.findById(id);
    if (!existing) {
      throw notFound();
    }

    const contract = await prisma.contract.findFirst({
      where: {
        id: data.contractId,
        isDeleted: false
      }
    });

    if (!contract) {
      throw badRequest("回款必须归属有效合同");
    }

    if (contract.status !== CONTRACT_STATUS_ACTIVE) {
      throw badRequest("合同未进入执行中前不得维护回款");
    }

    const amountReceived = data.amountReceived ?? decimalToNumber((existing as { amountReceived: Prisma.Decimal }).amountReceived);
    const status = resolveReceivableStatus(data.amountDue, amountReceived, data.dueDate);
    const record = await receivableRepository.update(id, {
      ...data,
      customerId: contract.customerId,
      projectId: contract.projectId,
      amountDue: toDecimal(data.amountDue),
      amountReceived: toDecimal(amountReceived),
      status,
      updatedBy: user.id
    });

    await auditLogService.log({
      entityType: EntityType.RECEIVABLE,
      entityId: id,
      entityCode: (record as { code: string }).code,
      action: "UPDATE",
      actorId: user.id,
      message: "更新回款记录"
    });

    return record;
  }

  async updateReceivablePayment(id: string, data: UpdateReceivablePaymentDto, user: SessionUser) {
    assertCanAccessRecord(user, "receivable", "payment");
    const existing = await receivableRepository.findById(id);

    if (!existing) {
      throw notFound();
    }

    const record = existing as {
      code: string;
      amountDue: Prisma.Decimal;
      dueDate: Date;
      status: ReceivableStatus;
    };
    const nextStatus = resolveReceivableStatus(
      decimalToNumber(record.amountDue),
      data.amountReceived,
      record.dueDate
    );

    const updated = await receivableRepository.update(id, {
      amountReceived: toDecimal(data.amountReceived),
      receivedDate: data.receivedDate,
      status: nextStatus,
      updatedBy: user.id
    });

    await auditLogService.log({
      entityType: EntityType.RECEIVABLE,
      entityId: id,
      entityCode: record.code,
      action: "UPDATE",
      actorId: user.id,
      message: "维护回款到账信息"
    });

    if (record.status !== nextStatus) {
      await auditLogService.log({
        entityType: EntityType.RECEIVABLE,
        entityId: id,
        entityCode: record.code,
        action: "STATUS_CHANGE",
        actorId: user.id,
        message: `回款状态变更为 ${nextStatus}`,
        payload: {
          from: record.status,
          to: nextStatus
        }
      });
    }

    return updated;
  }

  async getDetail(id: string, user: SessionUser) {
    assertCanAccessRecord(user, "receivable", "view");
    const record = await receivableRepository.findById(id, {
      customer: true,
      project: {
        include: {
          opportunity: {
            include: {
              lead: true
            }
          }
        }
      },
      contract: true
    });

    if (!record) {
      throw notFound();
    }

    return record;
  }
}

export const receivableService = new ReceivableService();
