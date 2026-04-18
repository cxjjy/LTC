import { ContractStatus, EntityType, Prisma } from "@prisma/client";

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
import { assertContractStatusTransition } from "@/modules/core/status-transition-validator";
import { contractAttachmentService } from "@/modules/contracts/attachment.service";
import { opportunityContractApprovalService } from "@/modules/opportunity-contract-approvals/service";
import type {
  ChangeContractStatusDto,
  CreateContractDto,
  UpdateContractDto
} from "@/modules/contracts/dto";
import { contractRepository } from "@/modules/contracts/repository";

class ContractService extends BaseCrudService<unknown> {
  constructor() {
    super(contractRepository, "contract", EntityType.CONTRACT);
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

  async create(data: CreateContractDto, user: SessionUser, options?: { approvalId?: string }) {
    assertCanAccessRecord(user, "contract", "create");
    if (data.status === ContractStatus.EFFECTIVE) {
      throw badRequest("合同需先上传附件，再变更为已生效");
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

    const code = await generateBusinessCode(EntityType.CONTRACT);
    const record = await contractRepository.create({
      ...data,
      customerId: project.customerId,
      contractAmount: toDecimal(data.contractAmount),
      status: data.status ?? ContractStatus.DRAFT,
      code,
      createdBy: user.id,
      updatedBy: user.id
    });

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
          createdContractId: (record as { id: string }).id
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
          contractId: (record as { id: string }).id,
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

    const previousStatus = (existing as { status: ContractStatus }).status;
    if (previousStatus !== ContractStatus.EFFECTIVE && data.status === ContractStatus.EFFECTIVE) {
      await contractAttachmentService.ensureCanBeEffective(id);
    }
    const record = await contractRepository.update(id, {
      ...data,
      customerId: project.customerId,
      contractAmount: toDecimal(data.contractAmount),
      updatedBy: user.id
    });

    await auditLogService.log({
      entityType: EntityType.CONTRACT,
      entityId: id,
      entityCode: (record as { code: string }).code,
      action: "UPDATE",
      actorId: user.id,
      message: "更新合同"
    });

    if (previousStatus !== data.status) {
      await auditLogService.log({
        entityType: EntityType.CONTRACT,
        entityId: id,
        entityCode: (record as { code: string }).code,
        action: "STATUS_CHANGE",
        actorId: user.id,
        message: `合同状态变更为 ${data.status}`,
        payload: {
          from: previousStatus,
          to: data.status
        }
      });
    }

    return record;
  }

  async changeContractStatus(id: string, data: ChangeContractStatusDto, user: SessionUser) {
    assertCanAccessRecord(user, "contract", "status");
    const existing = await contractRepository.findById(id);

    if (!existing) {
      throw notFound();
    }

    const contract = existing as { status: ContractStatus; code: string };
    assertContractStatusTransition(contract.status, data.status);

    if (contract.status !== ContractStatus.EFFECTIVE && data.status === ContractStatus.EFFECTIVE) {
      await contractAttachmentService.ensureCanBeEffective(id);
    }

    const updated = await contractRepository.update(id, {
      status: data.status,
      effectiveDate: data.status === ContractStatus.EFFECTIVE ? new Date() : undefined,
      updatedBy: user.id
    });

    await auditLogService.log({
      entityType: EntityType.CONTRACT,
      entityId: id,
      entityCode: contract.code,
      action: "STATUS_CHANGE",
      actorId: user.id,
      message: `合同状态变更为 ${data.status}`,
      payload: {
        from: contract.status,
        to: data.status
      }
    });

    return updated;
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
      }
    });

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
