import { ContractStatus, EntityType, Prisma, ProjectStatus } from "@prisma/client";
import { randomUUID } from "crypto";

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
import { CONTRACT_STATUSES_COUNTABLE_ON_PROJECT } from "@/modules/contracts/status";
import { assertProjectStatusTransition } from "@/modules/core/status-transition-validator";
import type {
  ChangeProjectStatusDto,
  CreateProjectDto,
  LinkProjectSupplierDto,
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
    } as any);

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
    } as any);

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
      },
    });

    if (!record) {
      throw notFound();
    }

    const [grossProfit, projectSuppliers] = await Promise.all([
      this.calculateGrossProfit(id, user),
      this.listProjectSuppliers(id, user)
    ]);

    return {
      ...record,
      grossProfit,
      projectSuppliers
    };
  }

  async listProjectSuppliers(projectId: string, user: SessionUser) {
    assertCanAccessRecord(user, "project", "view");
    try {
      const rows = await prisma.$queryRawUnsafe<Array<{
        id: string;
        role: string | null;
        remark: string | null;
        createdAt: Date;
        supplierId: string;
        supplierCode: string;
        supplierName: string;
        contactName: string | null;
        contactPhone: string | null;
      }>>(
        `SELECT
          ps.id,
          ps.role,
          ps.remark,
          ps.created_at AS createdAt,
          s.id AS supplierId,
          s.code AS supplierCode,
          s.name AS supplierName,
          s.contact_name AS contactName,
          s.contact_phone AS contactPhone
        FROM project_suppliers ps
        INNER JOIN suppliers s ON s.id = ps.supplier_id
        WHERE ps.project_id = ? AND ps.is_deleted = false AND s.is_deleted = false
        ORDER BY ps.created_at DESC`,
        projectId
      );

      return rows.map((item) => ({
        id: item.id,
        role: item.role,
        remark: item.remark,
        createdAt: item.createdAt,
        supplier: {
          id: item.supplierId,
          code: item.supplierCode,
          name: item.supplierName,
          contactName: item.contactName,
          contactPhone: item.contactPhone
        }
      }));
    } catch (error) {
      if (this.isSupplierSchemaMissing(error)) {
        return [];
      }
      return [];
    }
  }

  private isSupplierSchemaMissing(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return message.includes("suppliers") || message.includes("project_suppliers");
  }

  private throwSupplierSchemaMissing(error: unknown): never {
    if (this.isSupplierSchemaMissing(error)) {
      throw badRequest("供应商功能尚未初始化，请先执行数据库迁移后重启服务");
    }

    throw error;
  }

  private async ensureSupplier(data: LinkProjectSupplierDto, user: SessionUser) {
    const supplierId = data.supplierId?.trim();
    if (supplierId) {
      const suppliers = await prisma.$queryRawUnsafe<Array<{ id: string; code: string; name: string }>>(
        "SELECT id, code, name FROM suppliers WHERE id = ? AND is_deleted = false LIMIT 1",
        supplierId
      ).catch((error) => this.throwSupplierSchemaMissing(error));
      const supplier = suppliers[0];

      if (!supplier) {
        throw notFound("供应商不存在");
      }

      return supplier;
    }

    const supplierName = data.supplierName?.trim();
    if (!supplierName) {
      throw badRequest("请输入供应商名称");
    }

    const existingRows = await prisma.$queryRawUnsafe<Array<{ id: string; code: string; name: string }>>(
      "SELECT id, code, name FROM suppliers WHERE name = ? AND is_deleted = false LIMIT 1",
      supplierName
    ).catch((error) => this.throwSupplierSchemaMissing(error));
    const existing = existingRows[0];

    if (existing) {
      return existing;
    }

    const countRows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      "SELECT COUNT(*) AS count FROM suppliers"
    ).catch((error) => this.throwSupplierSchemaMissing(error));
    const count = Number(countRows[0]?.count ?? 0);
    const supplier = {
      id: randomUUID(),
      code: `SUP-${new Date().getFullYear()}${String(count + 1).padStart(4, "0")}`,
      name: supplierName
    };

    await prisma.$executeRawUnsafe(
      `INSERT INTO suppliers
        (id, code, name, contact_name, contact_phone, created_by, updated_by, created_at, updated_at, is_deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3), false)`,
      supplier.id,
      supplier.code,
      supplier.name,
      data.contactName?.trim() || null,
      data.contactPhone?.trim() || null,
      user.id,
      user.id
    ).catch((error) => this.throwSupplierSchemaMissing(error));

    return supplier;
  }

  async linkSupplier(projectId: string, data: LinkProjectSupplierDto, user: SessionUser) {
    assertCanAccessRecord(user, "project", "update");
    const project = await projectRepository.findById(projectId);

    if (!project) {
      throw notFound("项目不存在");
    }

    const supplier = await this.ensureSupplier(data, user);
    const existingRows = await prisma.$queryRawUnsafe<Array<{ id: string; isDeleted: boolean }>>(
      "SELECT id, is_deleted AS isDeleted FROM project_suppliers WHERE project_id = ? AND supplier_id = ? LIMIT 1",
      projectId,
      supplier.id
    ).catch((error) => this.throwSupplierSchemaMissing(error));
    const existing = existingRows[0];

    if (existing && !existing.isDeleted) {
      throw badRequest("该供应商已关联当前项目");
    }

    if (existing) {
      await prisma.$executeRawUnsafe(
        `UPDATE project_suppliers
         SET is_deleted = false, role = ?, remark = ?, updated_by = ?, updated_at = NOW(3)
         WHERE id = ?`,
        data.role?.trim() || null,
        data.remark?.trim() || null,
        user.id,
        existing.id
      ).catch((error) => this.throwSupplierSchemaMissing(error));
      return { id: existing.id };
    }

    const linkId = randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO project_suppliers
        (id, project_id, supplier_id, role, remark, created_by, updated_by, created_at, updated_at, is_deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3), false)`,
      linkId,
      projectId,
      supplier.id,
      data.role?.trim() || null,
      data.remark?.trim() || null,
      user.id,
      user.id
    ).catch((error) => this.throwSupplierSchemaMissing(error));

    return { id: linkId };
  }

  async unlinkSupplier(projectId: string, linkId: string, user: SessionUser) {
    assertCanAccessRecord(user, "project", "update");
    const existingRows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      "SELECT id FROM project_suppliers WHERE id = ? AND project_id = ? AND is_deleted = false LIMIT 1",
      linkId,
      projectId
    ).catch((error) => this.throwSupplierSchemaMissing(error));
    const existing = existingRows[0];

    if (!existing) {
      throw notFound("供应商关联不存在");
    }

    await prisma.$executeRawUnsafe(
      "UPDATE project_suppliers SET is_deleted = true, updated_by = ?, updated_at = NOW(3) WHERE id = ?",
      user.id,
      linkId
    ).catch((error) => this.throwSupplierSchemaMissing(error));

    return { id: linkId };
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
            status: {
              in: CONTRACT_STATUSES_COUNTABLE_ON_PROJECT
            }
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
