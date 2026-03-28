import { ContractStatus, EntityType, Prisma, ProjectStatus } from "@prisma/client";

import type { SessionUser } from "@/lib/auth";
import { badRequest, notFound } from "@/lib/errors";
import {
  createPaginationMeta,
  parseDateEnd,
  parseDateStart,
  type ListParams
} from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { assertCanAccessRecord } from "@/lib/rbac";
import { auditLogService } from "@/modules/core/audit-log.service";
import { BaseCrudService } from "@/modules/core/base-crud-service";
import { generateBusinessCode } from "@/modules/core/code-generator.service";
import { sumDecimalValues, toDecimal } from "@/modules/core/decimal";
import { assertProjectStatusTransition } from "@/modules/core/status-transition-validator";
import type {
  ChangeProjectStatusDto,
  CreateProjectDto,
  UpdateProjectDto
} from "@/modules/projects/dto";
import { projectRepository } from "@/modules/projects/repository";

class ProjectService extends BaseCrudService<unknown> {
  constructor() {
    super(projectRepository, "project", EntityType.PROJECT);
  }

  protected override async assertCanSoftDelete(record: unknown) {
    const project = record as { id: string };
    const [contractCount, deliveryCount, costCount, receivableCount] = await Promise.all([
      prisma.contract.count({ where: { projectId: project.id, isDeleted: false } }),
      prisma.delivery.count({ where: { projectId: project.id, isDeleted: false } }),
      prisma.cost.count({ where: { projectId: project.id, isDeleted: false } }),
      prisma.receivable.count({ where: { projectId: project.id, isDeleted: false } })
    ]);

    if (contractCount || deliveryCount || costCount || receivableCount) {
      throw badRequest("当前项目存在关联合同、交付、成本或回款，无法删除");
    }
  }

  async list(params: Required<ListParams>, user: SessionUser) {
    assertCanAccessRecord(user, "project", "view");
    const filters = params.filters;
    const and: Prisma.ProjectWhereInput[] = [];

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

    const plannedStartFrom = parseDateStart(filters.plannedStartFrom);
    if (plannedStartFrom) {
      and.push({ plannedStartDate: { gte: plannedStartFrom } });
    }

    const plannedEndTo = parseDateEnd(filters.plannedEndTo);
    if (plannedEndTo) {
      and.push({ plannedEndDate: { lte: plannedEndTo } });
    }

    const where: Prisma.ProjectWhereInput = {
      ...(params.status ? { status: params.status as ProjectStatus } : {}),
      ...(and.length ? { AND: and } : {})
    };
    const orderByMap: Record<string, Prisma.ProjectOrderByWithRelationInput> = {
      createdAt: { createdAt: params.sortOrder },
      updatedAt: { updatedAt: params.sortOrder },
      plannedStartDate: { plannedStartDate: params.sortOrder },
      plannedEndDate: { plannedEndDate: params.sortOrder },
      budgetAmount: { budgetAmount: params.sortOrder },
      name: { name: params.sortOrder }
    };

    const total = await projectRepository.count(where);
    const items = await projectRepository.findMany({
      where,
      include: {
        customer: true,
        opportunity: {
          include: {
            lead: true
          }
        },
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
      orderBy: orderByMap[params.sortBy] ?? { createdAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize
    });

    return {
      items,
      ...createPaginationMeta(total, params.page, params.pageSize)
    };
  }

  async create(data: CreateProjectDto, user: SessionUser) {
    assertCanAccessRecord(user, "project", "create");
    const opportunity = await prisma.opportunity.findFirst({
      where: {
        id: data.opportunityId,
        isDeleted: false
      }
    });

    if (!opportunity) {
      throw notFound("商机不存在");
    }

    const code = await generateBusinessCode(EntityType.PROJECT);
    const record = await projectRepository.create({
      ...data,
      customerId: opportunity.customerId,
      budgetAmount: toDecimal(data.budgetAmount),
      status: data.status ?? ProjectStatus.INITIATING,
      code,
      createdBy: user.id,
      updatedBy: user.id
    });

    await auditLogService.log({
      entityType: EntityType.PROJECT,
      entityId: (record as { id: string }).id,
      entityCode: code,
      action: "CREATE",
      actorId: user.id,
      message: "创建项目",
      payload: {
        opportunityId: opportunity.id,
        opportunityCode: opportunity.code
      }
    });

    return record;
  }

  async update(id: string, data: UpdateProjectDto, user: SessionUser) {
    assertCanAccessRecord(user, "project", "update");
    const existing = await projectRepository.findById(id);

    if (!existing) {
      throw notFound();
    }

    const opportunity = await prisma.opportunity.findFirst({
      where: {
        id: data.opportunityId,
        isDeleted: false
      }
    });

    if (!opportunity) {
      throw notFound("商机不存在");
    }

    const previousStatus = (existing as { status: ProjectStatus }).status;
    const record = await projectRepository.update(id, {
      ...data,
      customerId: opportunity.customerId,
      budgetAmount: toDecimal(data.budgetAmount),
      updatedBy: user.id
    });

    await auditLogService.log({
      entityType: EntityType.PROJECT,
      entityId: id,
      entityCode: (record as { code: string }).code,
      action: "UPDATE",
      actorId: user.id,
      message: "更新项目"
    });

    if (previousStatus !== data.status) {
      await auditLogService.log({
        entityType: EntityType.PROJECT,
        entityId: id,
        entityCode: (record as { code: string }).code,
        action: "STATUS_CHANGE",
        actorId: user.id,
        message: `项目状态变更为 ${data.status}`,
        payload: {
          from: previousStatus,
          to: data.status
        }
      });
    }

    return record;
  }

  async changeProjectStatus(id: string, data: ChangeProjectStatusDto, user: SessionUser) {
    assertCanAccessRecord(user, "project", "status");
    const existing = await projectRepository.findById(id);

    if (!existing) {
      throw notFound();
    }

    const project = existing as { status: ProjectStatus; code: string };
    assertProjectStatusTransition(project.status, data.status);

    const updated = await projectRepository.update(id, {
      status: data.status,
      updatedBy: user.id
    });

    await auditLogService.log({
      entityType: EntityType.PROJECT,
      entityId: id,
      entityCode: project.code,
      action: "STATUS_CHANGE",
      actorId: user.id,
      message: `项目状态变更为 ${data.status}`,
      payload: {
        from: project.status,
        to: data.status
      }
    });

    return updated;
  }

  async getDetail(id: string, user: SessionUser) {
    assertCanAccessRecord(user, "project", "view");
    const record = await projectRepository.findById(id, {
      customer: true,
      opportunity: {
        include: {
          lead: true
        }
      },
      contracts: {
        where: { isDeleted: false },
        include: {
          receivables: {
            where: { isDeleted: false }
          }
        },
        orderBy: { createdAt: "desc" }
      },
      deliveries: {
        where: { isDeleted: false },
        orderBy: { createdAt: "desc" }
      },
      costs: {
        where: { isDeleted: false },
        orderBy: { occurredAt: "desc" }
      },
      receivables: {
        where: { isDeleted: false },
        orderBy: { dueDate: "asc" }
      }
    });

    if (!record) {
      throw notFound();
    }

    const grossProfit = await this.calculateGrossProfit(id, user);

    return {
      ...record,
      grossProfit
    };
  }

  async calculateGrossProfit(id: string, user?: SessionUser) {
    if (user) {
      assertCanAccessRecord(user, "project", "view");
    }

    const project = await prisma.project.findFirst({
      where: {
        id,
        isDeleted: false
      },
      include: {
        contracts: {
          where: {
            isDeleted: false,
            status: ContractStatus.EFFECTIVE
          }
        },
        costs: {
          where: {
            isDeleted: false
          }
        }
      }
    });

    if (!project) {
      throw notFound("项目不存在");
    }

    const contractTotal = sumDecimalValues(project.contracts.map((item) => item.contractAmount));
    const costTotal = sumDecimalValues(project.costs.map((item) => item.amount));

    return {
      effectiveContractAmount: contractTotal,
      totalCostAmount: costTotal,
      estimatedGrossProfit: contractTotal - costTotal
    };
  }

  async getOptions(user: SessionUser) {
    assertCanAccessRecord(user, "project", "view");
    const items = await projectRepository.findMany({
      orderBy: { createdAt: "desc" },
      take: 200
    });
    return items.map((item) => ({
      label: `${(item as { code: string }).code} / ${(item as { name: string }).name}`,
      value: (item as { id: string }).id
    }));
  }
}

export const projectService = new ProjectService();
