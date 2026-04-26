import { ContractStatus, EntityType, Prisma } from "@prisma/client";
import { randomUUID } from "crypto";

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
import { badRequest, notFound } from "@/lib/errors";
import { auditLogService } from "@/modules/core/audit-log.service";
import { BaseCrudService } from "@/modules/core/base-crud-service";
import { generateBusinessCode } from "@/modules/core/code-generator.service";
import { toDecimal } from "@/modules/core/decimal";
import { CONTRACT_STATUS_ACTIVE } from "@/modules/contracts/status";
import { opportunityContractApprovalService } from "@/modules/opportunity-contract-approvals/service";
import type { CreateContractDto, UpdateContractDto } from "@/modules/contracts/dto";
import { contractRepository } from "@/modules/contracts/repository";

class ContractService extends BaseCrudService<unknown> {
  constructor() {
    super(contractRepository, "contract", EntityType.CONTRACT);
  }

  private isSupplierSchemaMissing(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return message.includes("suppliers");
  }

  private throwSupplierSchemaMissing(error: unknown): never {
    if (this.isSupplierSchemaMissing(error)) {
      throw badRequest("供应商功能尚未初始化，请先执行数据库迁移后重启服务");
    }

    throw error;
  }

  private async resolveSupplierId(supplierId?: string | null) {
    const normalized = supplierId?.trim();
    if (!normalized) {
      return null;
    }

    const suppliers = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      "SELECT id FROM suppliers WHERE id = ? AND is_deleted = false LIMIT 1",
      normalized
    ).catch((error) => this.throwSupplierSchemaMissing(error));
    const supplier = suppliers[0];

    if (!supplier) {
      throw notFound("供应商不存在");
    }

    return supplier.id;
  }

  protected override async assertCanSoftDelete(record: unknown) {
    const contract = record as { id: string };
    const receivable = await prisma.receivable.findFirst({
      where: {
        contractId: contract.id,
        isDeleted: false
      }
    });

    if (receivable) {
      throw badRequest("当前合同存在回款记录，无法删除");
    }
  }

  async list(params: Required<ListParams>, user: SessionUser) {
    assertCanAccessRecord(user, "contract", "view");
    const filters = params.filters;
    const and: Prisma.ContractWhereInput[] = [];

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

    if (filters.projectName) {
      and.push({ project: { name: { contains: filters.projectName } } });
    }

    const minAmount = parseNumberFilter(filters.minAmount);
    const maxAmount = parseNumberFilter(filters.maxAmount);
    if (minAmount !== undefined || maxAmount !== undefined) {
      and.push({
        contractAmount: {
          ...(minAmount !== undefined ? { gte: minAmount } : {}),
          ...(maxAmount !== undefined ? { lte: maxAmount } : {})
        }
      });
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

    const signedFrom = parseDateStart(filters.signedFrom);
    const signedTo = parseDateEnd(filters.signedTo);
    if (signedFrom || signedTo) {
      and.push({
        signedDate: {
          ...(signedFrom ? { gte: signedFrom } : {}),
          ...(signedTo ? { lte: signedTo } : {})
        }
      });
    }

    const where: Prisma.ContractWhereInput = {
      ...(params.status ? { status: params.status as ContractStatus } : {}),
      ...(and.length ? { AND: and } : {})
    };
    const orderByMap: Record<string, Prisma.ContractOrderByWithRelationInput> = {
      signedDate: { signedDate: params.sortOrder },
      createdAt: { createdAt: params.sortOrder },
      updatedAt: { updatedAt: params.sortOrder },
      contractAmount: { contractAmount: params.sortOrder },
      name: { name: params.sortOrder }
    };

    const total = await contractRepository.count(where);
    const items = await contractRepository.findMany({
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
        receivables: {
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

  async create(
    data: CreateContractDto,
    user: SessionUser,
    options?: { approvalId?: string }
  ) {
    assertCanAccessRecord(user, "contract", "create");
    const project = await prisma.project.findFirst({
      where: {
        id: data.projectId,
        isDeleted: false
      }
    });

    if (!project) {
      throw notFound("项目不存在");
    }

    const approval = options?.approvalId
      ? await opportunityContractApprovalService.ensureApprovedForOpportunity(project.opportunityId, data.projectId)
      : null;

    if (approval?.createdContractId) {
      const existingContract = await prisma.contract.findFirst({
        where: {
          id: approval.createdContractId,
          isDeleted: false
        }
      });

      if (existingContract) {
        throw badRequest("该审批单已创建合同，请勿重复创建");
      }
    }

    const [code, resolvedSupplierId] = await Promise.all([
      generateBusinessCode(EntityType.CONTRACT),
      this.resolveSupplierId(data.supplierId)
    ]);
    const supplierId = (data.direction ?? "SALES") === "PURCHASE" ? resolvedSupplierId : null;
    const contractId = randomUUID();
    const direction = data.direction ?? "SALES";
    const initialStatus = CONTRACT_STATUS_ACTIVE;

    await prisma.$executeRawUnsafe(
      `INSERT INTO \`Contract\`
        (\`id\`, \`code\`, \`customerId\`, \`projectId\`, \`supplier_id\`, \`direction\`, \`name\`, \`contractAmount\`, \`signedDate\`, \`effectiveDate\`, \`endDate\`, \`status\`, \`description\`, \`createdAt\`, \`updatedAt\`, \`createdBy\`, \`updatedBy\`, \`isDeleted\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3), ?, ?, false)`,
      contractId,
      code,
      project.customerId,
      data.projectId,
      supplierId,
      direction,
      data.name,
      String(toDecimal(data.contractAmount)),
      data.signedDate ? new Date(data.signedDate) : null,
      data.effectiveDate ? new Date(data.effectiveDate) : null,
      data.endDate ? new Date(data.endDate) : null,
      initialStatus,
      data.description?.trim() || null,
      user.id,
      user.id
    );

    const record = {
      id: contractId,
      code
    };

    await auditLogService.log({
      entityType: EntityType.CONTRACT,
      entityId: (record as { id: string }).id,
      entityCode: code,
      action: "CREATE",
      actorId: user.id,
      message: "创建合同"
    });

    if (approval) {
      await prisma.opportunityContractApproval.update({
        where: { id: approval.id },
        data: {
          createdContractId: record.id
        }
      });

      await auditLogService.log({
        entityType: EntityType.OPPORTUNITY,
        entityId: project.opportunityId,
        action: "CONVERT",
        actorId: user.id,
        message: "审批通过后进入合同创建流程",
        payload: {
          approvalId: approval.id,
          contractId: record.id,
          contractCode: code
        }
      });
    }

    return record;
  }

  async update(id: string, data: UpdateContractDto, user: SessionUser) {
    assertCanAccessRecord(user, "contract", "update");
    const existing = await contractRepository.findById(id);
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

    const resolvedSupplierId = await this.resolveSupplierId(data.supplierId);
    const supplierId = (data.direction ?? "SALES") === "PURCHASE" ? resolvedSupplierId : null;
    const direction = data.direction ?? "SALES";
    await prisma.$executeRawUnsafe(
      `UPDATE \`Contract\`
       SET \`projectId\` = ?,
           \`customerId\` = ?,
           \`supplier_id\` = ?,
           \`direction\` = ?,
           \`name\` = ?,
           \`contractAmount\` = ?,
           \`signedDate\` = ?,
           \`effectiveDate\` = ?,
           \`endDate\` = ?,
           \`description\` = ?,
           \`updatedBy\` = ?,
           \`updatedAt\` = NOW(3)
       WHERE \`id\` = ?`,
      data.projectId,
      project.customerId,
      supplierId,
      direction,
      data.name,
      String(toDecimal(data.contractAmount)),
      data.signedDate ? new Date(data.signedDate) : null,
      data.effectiveDate ? new Date(data.effectiveDate) : null,
      data.endDate ? new Date(data.endDate) : null,
      data.description?.trim() || null,
      user.id,
      id
    );

    const record = {
      id,
      code: (existing as { code: string }).code
    };

    await auditLogService.log({
      entityType: EntityType.CONTRACT,
      entityId: id,
      entityCode: (record as { code: string }).code,
      action: "UPDATE",
      actorId: user.id,
      message: "更新合同"
    });

    return record;
  }

  async getDetail(id: string, user: SessionUser) {
    assertCanAccessRecord(user, "contract", "view");
    const record = await contractRepository.findById(id, {
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
      receivables: {
        where: { isDeleted: false },
        orderBy: { dueDate: "asc" }
      },
      attachments: {
        select: {
          id: true,
          contractId: true,
          fileName: true,
          fileUrl: true,
          fileSize: true,
          fileType: true,
          createdAt: true,
          uploadedBy: true
        },
        orderBy: { createdAt: "desc" }
      },
    });

    if (!record) {
      throw notFound();
    }

    if (!record) {
      throw notFound();
    }

    return record;
  }

  async getOptions(user: SessionUser) {
    assertCanAccessRecord(user, "contract", "view");
    const items = await contractRepository.findMany({
      orderBy: { createdAt: "desc" },
      take: 200
    });
    return items.map((item) => ({
      label: `${(item as { code: string }).code} / ${(item as { name: string }).name}`,
      value: (item as { id: string }).id
    }));
  }
}

export const contractService = new ContractService();
