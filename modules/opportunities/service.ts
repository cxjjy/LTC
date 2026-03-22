import { EntityType, OpportunityStage, Prisma } from "@prisma/client";

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
import { toDecimal } from "@/modules/core/decimal";
import type {
  CreateOpportunityDto,
  ConvertOpportunityDto,
  UpdateOpportunityDto
} from "@/modules/opportunities/dto";
import { opportunityRepository } from "@/modules/opportunities/repository";

class OpportunityService extends BaseCrudService<unknown> {
  constructor() {
    super(opportunityRepository, "opportunity", EntityType.OPPORTUNITY);
  }

  async list(params: Required<ListParams>, user: SessionUser) {
    assertCanAccessRecord(user, "opportunity", "view");
    const filters = params.filters;
    const and: Prisma.OpportunityWhereInput[] = [];

    if (params.keyword) {
      and.push({
        OR: [
          { code: { contains: params.keyword } },
          { name: { contains: params.keyword } },
          { customer: { name: { contains: params.keyword } } }
        ]
      });
    }

    if (filters.name) {
      and.push({ name: { contains: filters.name } });
    }

    if (filters.customerName) {
      and.push({ customer: { name: { contains: filters.customerName } } });
    }

    if (filters.createdBy) {
      and.push({ createdBy: { contains: filters.createdBy } });
    }

    const expectedSignFrom = parseDateStart(filters.expectedSignFrom);
    const expectedSignTo = parseDateEnd(filters.expectedSignTo);
    if (expectedSignFrom || expectedSignTo) {
      and.push({
        expectedSignDate: {
          ...(expectedSignFrom ? { gte: expectedSignFrom } : {}),
          ...(expectedSignTo ? { lte: expectedSignTo } : {})
        }
      });
    }

    const where: Prisma.OpportunityWhereInput = {
      ...(params.status ? { stage: params.status as OpportunityStage } : {}),
      ...(and.length ? { AND: and } : {})
    };
    const orderByMap: Record<string, Prisma.OpportunityOrderByWithRelationInput> = {
      expectedSignDate: { expectedSignDate: params.sortOrder },
      createdAt: { createdAt: params.sortOrder },
      amount: { amount: params.sortOrder },
      winRate: { winRate: params.sortOrder },
      name: { name: params.sortOrder }
    };

    const total = await opportunityRepository.count(where);
    const items = await opportunityRepository.findMany({
      where,
      include: {
        customer: true,
        lead: true,
        projects: {
          where: { isDeleted: false }
        }
      },
      orderBy: orderByMap[params.sortBy] ?? { expectedSignDate: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize
    });

    return {
      items,
      ...createPaginationMeta(total, params.page, params.pageSize)
    };
  }

  async create(data: CreateOpportunityDto, user: SessionUser) {
    assertCanAccessRecord(user, "opportunity", "create");
    const code = await generateBusinessCode(EntityType.OPPORTUNITY);

    const record = await opportunityRepository.create({
      ...data,
      amount: toDecimal(data.amount),
      winRate: data.winRate ?? 0,
      stage: data.stage ?? OpportunityStage.DISCOVERY,
      code,
      createdBy: user.id,
      updatedBy: user.id
    });

    await auditLogService.log({
      entityType: EntityType.OPPORTUNITY,
      entityId: (record as { id: string }).id,
      entityCode: code,
      action: "CREATE",
      actorId: user.id,
      message: "创建商机"
    });

    return record;
  }

  async update(id: string, data: UpdateOpportunityDto, user: SessionUser) {
    assertCanAccessRecord(user, "opportunity", "update");
    const existing = await opportunityRepository.findById(id);
    if (!existing) {
      throw notFound();
    }

    const previousStage = (existing as { stage: OpportunityStage }).stage;
    const record = await opportunityRepository.update(id, {
      ...data,
      amount: toDecimal(data.amount),
      winRate: data.winRate ?? 0,
      updatedBy: user.id
    });

    await auditLogService.log({
      entityType: EntityType.OPPORTUNITY,
      entityId: id,
      entityCode: (record as { code: string }).code,
      action: "UPDATE",
      actorId: user.id,
      message: "更新商机"
    });

    if (previousStage !== data.stage) {
      await auditLogService.log({
        entityType: EntityType.OPPORTUNITY,
        entityId: id,
        entityCode: (record as { code: string }).code,
        action: "STATUS_CHANGE",
        actorId: user.id,
        message: `商机阶段变更为 ${data.stage}`,
        payload: {
          from: previousStage,
          to: data.stage
        }
      });
    }

    return record;
  }

  async getDetail(id: string, user: SessionUser) {
    assertCanAccessRecord(user, "opportunity", "view");
    const record = await opportunityRepository.findById(id, {
      customer: true,
      lead: true,
      projects: {
        where: { isDeleted: false },
        include: {
          contracts: {
            where: { isDeleted: false }
          },
          deliveries: {
            where: { isDeleted: false }
          },
          costs: {
            where: { isDeleted: false }
          }
        },
        orderBy: { createdAt: "desc" }
      }
    });

    if (!record) {
      throw notFound();
    }

    return record;
  }

  async convertOpportunityToProject(id: string, data: ConvertOpportunityDto, user: SessionUser) {
    assertCanAccessRecord(user, "opportunity", "convert");

    return prisma.$transaction(async (tx) => {
      const opportunity = await tx.opportunity.findFirst({
        where: {
          id,
          isDeleted: false
        }
      });

      if (!opportunity) {
        throw notFound("商机不存在");
      }

      const projectCode = await generateBusinessCode(EntityType.PROJECT, tx);
      const project = await tx.project.create({
        data: {
          code: projectCode,
          customerId: opportunity.customerId,
          opportunityId: opportunity.id,
          name: data.name,
          description: data.description,
          budgetAmount: toDecimal(data.budgetAmount),
          plannedStartDate: data.plannedStartDate,
          plannedEndDate: data.plannedEndDate,
          status: "INITIATING",
          createdBy: user.id,
          updatedBy: user.id
        }
      });

      if (opportunity.stage !== OpportunityStage.WON) {
        await tx.opportunity.update({
          where: { id: opportunity.id },
          data: {
            stage: OpportunityStage.WON,
            updatedBy: user.id
          }
        });

        await auditLogService.log({
          tx,
          entityType: EntityType.OPPORTUNITY,
          entityId: opportunity.id,
          entityCode: opportunity.code,
          action: "STATUS_CHANGE",
          actorId: user.id,
          message: "商机阶段变更为 WON",
          payload: {
            from: opportunity.stage,
            to: OpportunityStage.WON
          }
        });
      }

      await auditLogService.log({
        tx,
        entityType: EntityType.OPPORTUNITY,
        entityId: opportunity.id,
        entityCode: opportunity.code,
        action: "CONVERT",
        actorId: user.id,
        message: "商机转换为项目",
        payload: {
          projectId: project.id,
          projectCode
        }
      });

      await auditLogService.log({
        tx,
        entityType: EntityType.PROJECT,
        entityId: project.id,
        entityCode: project.code,
        action: "CREATE",
        actorId: user.id,
        message: "由商机转换创建项目",
        payload: {
          opportunityId: opportunity.id,
          opportunityCode: opportunity.code
        }
      });

      return project;
    });
  }

  async getOptions(user: SessionUser) {
    assertCanAccessRecord(user, "opportunity", "view");
    const items = await opportunityRepository.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        customer: true
      }
    });
    return items.map((item) => ({
      label: `${(item as { code: string }).code} / ${(item as { name: string }).name}`,
      value: (item as { id: string }).id
    }));
  }
}

export const opportunityService = new OpportunityService();
