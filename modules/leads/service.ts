import { EntityType, LeadStatus, Prisma } from "@prisma/client";

import type { SessionUser } from "@/lib/auth";
import { notFound, badRequest } from "@/lib/errors";
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
import { toDecimal } from "@/modules/core/decimal";
import type { CreateLeadDto, ConvertLeadDto, UpdateLeadDto } from "@/modules/leads/dto";
import { leadRepository } from "@/modules/leads/repository";

class LeadService extends BaseCrudService<unknown> {
  constructor() {
    super(leadRepository, "lead", EntityType.LEAD);
  }

  protected override async assertCanSoftDelete(record: unknown) {
    const lead = record as { id: string };
    const opportunity = await prisma.opportunity.findFirst({
      where: {
        leadId: lead.id,
        isDeleted: false
      }
    });

    if (opportunity) {
      throw badRequest("当前线索已转商机，不能直接删除");
    }
  }

  async list(params: Required<ListParams>, user: SessionUser) {
    assertCanAccessRecord(user, "lead", "view");
    const filters = params.filters;
    const and: Prisma.LeadWhereInput[] = [];

    if (params.keyword) {
      and.push({
        OR: [
          { code: { contains: params.keyword } },
          { title: { contains: params.keyword } },
          { customer: { name: { contains: params.keyword } } }
        ]
      });
    }

    if (filters.title) {
      and.push({ title: { contains: filters.title } });
    }

    if (filters.source) {
      and.push({ source: { contains: filters.source } });
    }

    if (filters.contactName) {
      and.push({ contactName: { contains: filters.contactName } });
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

    const minAmount = parseNumberFilter(filters.minAmount);
    const maxAmount = parseNumberFilter(filters.maxAmount);
    if (minAmount !== undefined || maxAmount !== undefined) {
      and.push({
        expectedAmount: {
          ...(minAmount !== undefined ? { gte: minAmount } : {}),
          ...(maxAmount !== undefined ? { lte: maxAmount } : {})
        }
      });
    }

    const where: Prisma.LeadWhereInput = {
      ...(params.status ? { status: params.status as LeadStatus } : {}),
      ...(and.length ? { AND: and } : {})
    };
    const orderByMap: Record<string, Prisma.LeadOrderByWithRelationInput> = {
      createdAt: { createdAt: params.sortOrder },
      updatedAt: { updatedAt: params.sortOrder },
      expectedCloseDate: { expectedCloseDate: params.sortOrder },
      expectedAmount: { expectedAmount: params.sortOrder },
      title: { title: params.sortOrder }
    };

    const total = await leadRepository.count(where);
    const items = await leadRepository.findMany({
      where,
      include: {
        customer: true,
        opportunity: {
          where: { isDeleted: false }
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

  async create(data: CreateLeadDto, user: SessionUser) {
    assertCanAccessRecord(user, "lead", "create");
    const code = await generateBusinessCode(EntityType.LEAD);

    const record = await leadRepository.create({
      ...data,
      expectedAmount: toDecimal(data.expectedAmount),
      status: data.status ?? LeadStatus.NEW,
      code,
      createdBy: user.id,
      updatedBy: user.id
    });

    await auditLogService.log({
      entityType: EntityType.LEAD,
      entityId: (record as { id: string }).id,
      entityCode: code,
      action: "CREATE",
      actorId: user.id,
      message: "创建线索"
    });

    return record;
  }

  async update(id: string, data: UpdateLeadDto, user: SessionUser) {
    assertCanAccessRecord(user, "lead", "update");
    const existing = await leadRepository.findById(id);
    if (!existing) {
      throw notFound();
    }

    const previousStatus = (existing as { status: LeadStatus }).status;
    const record = await leadRepository.update(id, {
      ...data,
      expectedAmount: toDecimal(data.expectedAmount),
      updatedBy: user.id
    });

    await auditLogService.log({
      entityType: EntityType.LEAD,
      entityId: id,
      entityCode: (record as { code: string }).code,
      action: "UPDATE",
      actorId: user.id,
      message: "更新线索"
    });

    if (previousStatus !== data.status) {
      await auditLogService.log({
        entityType: EntityType.LEAD,
        entityId: id,
        entityCode: (record as { code: string }).code,
        action: "STATUS_CHANGE",
        actorId: user.id,
        message: `线索状态变更为 ${data.status}`,
        payload: {
          from: previousStatus,
          to: data.status
        }
      });
    }

    return record;
  }

  async getDetail(id: string, user: SessionUser) {
    assertCanAccessRecord(user, "lead", "view");
    const record = await leadRepository.findById(id, {
      customer: true,
      opportunity: {
        include: {
          projects: {
            where: { isDeleted: false },
            orderBy: { createdAt: "desc" }
          }
        }
      }
    });

    if (!record) {
      throw notFound();
    }

    return record;
  }

  async convertLeadToOpportunity(id: string, data: ConvertLeadDto, user: SessionUser) {
    assertCanAccessRecord(user, "lead", "convert");

    return prisma.$transaction(async (tx) => {
      const lead = await tx.lead.findFirst({
        where: {
          id,
          isDeleted: false
        }
      });

      if (!lead) {
        throw notFound("线索不存在");
      }

      if (lead.status === LeadStatus.CLOSED) {
        throw badRequest("已关闭线索不能转商机");
      }

      const existingOpportunity = await tx.opportunity.findFirst({
        where: {
          leadId: lead.id,
          isDeleted: false
        }
      });

      if (existingOpportunity) {
        throw badRequest("该线索已存在有效商机");
      }

      const opportunityCode = await generateBusinessCode(EntityType.OPPORTUNITY, tx);
      const opportunity = await tx.opportunity.create({
        data: {
          code: opportunityCode,
          customerId: lead.customerId,
          leadId: lead.id,
          name: data.name,
          description: data.description,
          amount: new Prisma.Decimal(data.amount),
          expectedSignDate: data.expectedSignDate,
          winRate: data.winRate ?? 0,
          stage: "DISCOVERY",
          createdBy: user.id,
          updatedBy: user.id
        }
      });

      await tx.lead.update({
        where: { id: lead.id },
        data: {
          status: LeadStatus.CONVERTED,
          updatedBy: user.id
        }
      });

      await auditLogService.log({
        tx,
        entityType: EntityType.LEAD,
        entityId: lead.id,
        entityCode: lead.code,
        action: "STATUS_CHANGE",
        actorId: user.id,
        message: "线索状态变更为 CONVERTED",
        payload: {
          from: lead.status,
          to: LeadStatus.CONVERTED
        }
      });

      await auditLogService.log({
        tx,
        entityType: EntityType.LEAD,
        entityId: lead.id,
        entityCode: lead.code,
        action: "CONVERT",
        actorId: user.id,
        message: "线索转换为商机",
        payload: {
          opportunityId: opportunity.id,
          opportunityCode
        }
      });

      await auditLogService.log({
        tx,
        entityType: EntityType.OPPORTUNITY,
        entityId: opportunity.id,
        entityCode: opportunity.code,
        action: "CREATE",
        actorId: user.id,
        message: "由线索转换创建商机",
        payload: {
          leadId: lead.id,
          leadCode: lead.code
        }
      });

      return opportunity;
    });
  }

  async getOptions(user: SessionUser) {
    assertCanAccessRecord(user, "lead", "view");
    const items = await leadRepository.findMany({
      orderBy: { createdAt: "desc" },
      take: 200
    });
    return items.map((item) => ({
      label: `${(item as { code: string }).code} / ${(item as { title: string }).title}`,
      value: (item as { id: string }).id
    }));
  }
}

export const leadService = new LeadService();
