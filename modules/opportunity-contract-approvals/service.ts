import { AuditAction, EntityType, OpportunityStage } from "@prisma/client";

import type { SessionUser } from "@/lib/auth";
import { approvalStatusLabels } from "@/lib/constants";
import { badRequest, forbidden, notFound } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { assertCanAccessRecord, canAccessRecord } from "@/lib/rbac";
import { auditLogService } from "@/modules/core/audit-log.service";
import { generateBusinessCode } from "@/modules/core/code-generator.service";
import { toDecimal } from "@/modules/core/decimal";
import type {
  CreateOpportunityContractApprovalDto,
  ReviewOpportunityContractApprovalDto
} from "@/modules/opportunity-contract-approvals/dto";

function isAdmin(user: SessionUser) {
  const roleCodes = new Set([user.role, ...user.roles.map((item) => item.code)]);
  return roleCodes.has("SUPER_ADMIN") || roleCodes.has("ADMIN");
}

function canReviewApproval(user: SessionUser) {
  return isAdmin(user) || canAccessRecord(user, "contractApproval", "status");
}

async function ensureOpportunityDetail(opportunityId: string, user: SessionUser) {
  assertCanAccessRecord(user, "opportunity", "view");
  const opportunity = await prisma.opportunity.findFirst({
    where: {
      id: opportunityId,
      isDeleted: false
    },
    include: {
      customer: true,
      lead: true,
      projects: {
        where: {
          isDeleted: false
        },
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!opportunity) {
    throw notFound("商机不存在");
  }

  return opportunity;
}

function validateOpportunityForApproval(opportunity: Awaited<ReturnType<typeof ensureOpportunityDetail>>) {
  const missingFields: string[] = [];

  if (!opportunity.name?.trim()) {
    missingFields.push("商机名称");
  }

  if (!opportunity.customerId) {
    missingFields.push("所属客户");
  }

  if (Number(opportunity.estimatedRevenue ?? opportunity.amount ?? 0) <= 0) {
    missingFields.push("预估收入/商机金额");
  }

  if (!opportunity.description?.trim()) {
    missingFields.push("商机描述");
  }

  if (!opportunity.expectedSignDate) {
    missingFields.push("预计签约日期");
  }

  if (missingFields.length) {
    throw badRequest(`商机关键信息不完整，请先补充：${missingFields.join("、")}`);
  }
}

async function resolveApprover() {
  const candidates = await prisma.user.findMany({
    where: {
      isDeleted: false,
      isActive: true,
      OR: [
        {
          role: {
            in: ["SUPER_ADMIN", "ADMIN", "FINANCE", "PROJECT_MANAGER"]
          }
        },
        {
          userRoles: {
            some: {
              role: {
                code: {
                  in: ["SUPER_ADMIN", "FINANCE", "PROJECT_MANAGER"]
                }
              }
            }
          }
        }
      ]
    },
    orderBy: [{ updatedAt: "desc" }]
  });

  return candidates[0] ?? null;
}

async function attachUserNames<T extends {
  applicantId: string;
  approverId: string;
}>(items: T[]): Promise<Array<T & { applicantName: string; approverName: string }>> {
  const userIds = Array.from(new Set(items.flatMap((item) => [item.applicantId, item.approverId])));
  const users = userIds.length
    ? await prisma.user.findMany({
        where: {
          id: {
            in: userIds
          }
        },
        select: {
          id: true,
          displayName: true,
          name: true,
          username: true
        }
      })
    : [];
  const userMap = new Map(users.map((item) => [item.id, item.displayName || item.name || item.username]));

  return items.map((item) => ({
    ...item,
    applicantName: userMap.get(item.applicantId) || item.applicantId,
    approverName: userMap.get(item.approverId) || item.approverId
  }));
}

export type ContractApprovalListItem = Awaited<ReturnType<typeof attachUserNames<{
  id: string;
  opportunityId: string;
  applicantId: string;
  approverId: string;
  status: string;
  approvalComment: string | null;
  submittedAt: Date;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  createdContractId: string | null;
}>>>[number] & {
  statusLabel: string;
  opportunity: {
    id: string;
    code: string;
    name: string;
  } | null;
};

class OpportunityContractApprovalService {
  private async enrichApprovalItems(items: Array<{
    id: string;
    opportunityId: string;
    applicantId: string;
    approverId: string;
    status: string;
    approvalComment: string | null;
    submittedAt: Date;
    approvedAt: Date | null;
    rejectedAt: Date | null;
    createdContractId: string | null;
  }>): Promise<ContractApprovalListItem[]> {
    const named = await attachUserNames(items);
    const opportunityIds = Array.from(new Set(items.map((item) => item.opportunityId)));
    const opportunities = opportunityIds.length
      ? await prisma.opportunity.findMany({
          where: {
            id: {
              in: opportunityIds
            }
          },
          select: {
            id: true,
            code: true,
            name: true
          }
        })
      : [];
    const opportunityMap = new Map(opportunities.map((item) => [item.id, item]));

    return named.map((item) => ({
      ...item,
      statusLabel: approvalStatusLabels[item.status as keyof typeof approvalStatusLabels] ?? item.status,
      opportunity: opportunityMap.get(item.opportunityId) ?? null
    }));
  }

  async list(user: SessionUser): Promise<ContractApprovalListItem[]> {
    assertCanAccessRecord(user, "contractApproval", "view");

    const items = await prisma.opportunityContractApproval.findMany({
      where: isAdmin(user)
        ? undefined
        : {
            OR: [{ applicantId: user.id }, { approverId: user.id }]
          },
      orderBy: [{ submittedAt: "desc" }]
    });

    return this.enrichApprovalItems(items);
  }

  async getById(id: string, user: SessionUser) {
    assertCanAccessRecord(user, "contractApproval", "view");
    const approval = await prisma.opportunityContractApproval.findFirst({
      where: { id }
    });

    if (!approval) {
      throw notFound("审批单不存在");
    }

    if (!isAdmin(user) && approval.applicantId !== user.id && approval.approverId !== user.id) {
      throw forbidden("无权查看该审批单");
    }

    const [opportunity, namedApprovals, createdContract] = await Promise.all([
      ensureOpportunityDetail(approval.opportunityId, user),
      attachUserNames([approval]),
      approval.createdContractId
        ? prisma.contract.findFirst({
            where: {
              id: approval.createdContractId,
              isDeleted: false
            },
            select: {
              id: true,
              code: true,
              name: true
            }
          })
        : Promise.resolve(null)
    ]);

    return {
      ...namedApprovals[0],
      statusLabel: approvalStatusLabels[approval.status as keyof typeof approvalStatusLabels] ?? approval.status,
      opportunity,
      createdContract
    };
  }

  async getLatestByOpportunity(opportunityId: string, user: SessionUser): Promise<ContractApprovalListItem | null> {
    await ensureOpportunityDetail(opportunityId, user);
    const latest = await prisma.opportunityContractApproval.findFirst({
      where: {
        opportunityId
      },
      orderBy: [{ submittedAt: "desc" }]
    });

    if (!latest) {
      return null;
    }

    const [enriched] = await this.enrichApprovalItems([latest]);
    return enriched ?? null;
  }

  async ensureApprovedForOpportunity(opportunityId: string, projectId: string | undefined) {
    const approval = await prisma.opportunityContractApproval.findFirst({
      where: {
        opportunityId,
        status: "approved"
      },
      orderBy: [{ approvedAt: "desc" }]
    });

    if (!approval) {
      throw badRequest("当前商机尚未通过转合同审批，不能创建合同");
    }

    if (projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          isDeleted: false
        },
        select: {
          opportunityId: true
        }
      });

      if (!project || project.opportunityId !== opportunityId) {
        throw badRequest("审批单与当前项目不匹配");
      }
    }

    return approval;
  }

  async create(opportunityId: string, data: CreateOpportunityContractApprovalDto, user: SessionUser) {
    assertCanAccessRecord(user, "contractApproval", "create");
    const opportunity = await ensureOpportunityDetail(opportunityId, user);
    validateOpportunityForApproval(opportunity);

    const pending = await prisma.opportunityContractApproval.findFirst({
      where: {
        opportunityId,
        status: "pending"
      }
    });

    if (pending) {
      throw badRequest("当前商机已有待审批申请，请先完成审批");
    }

    const approver = await resolveApprover();
    if (!approver) {
      throw badRequest("系统中未找到可用审批人，请联系管理员");
    }

    const approval = await prisma.opportunityContractApproval.create({
      data: {
        opportunityId,
        applicantId: user.id,
        approverId: approver.id,
        approvalComment: data.approvalComment?.trim() || null,
        snapshotJson: {
          opportunity: {
            id: opportunity.id,
            code: opportunity.code,
            name: opportunity.name,
            customerName: opportunity.customer.name,
            stage: opportunity.stage,
            amount: String(opportunity.amount),
            estimatedRevenue: String(opportunity.estimatedRevenue),
            expectedSignDate: opportunity.expectedSignDate?.toISOString() ?? null
          },
          projects: opportunity.projects.map((item) => ({
            id: item.id,
            code: item.code,
            name: item.name,
            status: item.status
          })),
          applicant: {
            id: user.id,
            name: user.name
          },
          approver: {
            id: approver.id,
            name: approver.displayName || approver.name || approver.username
          }
        }
      }
    });

    await auditLogService.log({
      entityType: EntityType.OPPORTUNITY,
      entityId: opportunity.id,
      entityCode: opportunity.code,
      action: AuditAction.CONVERT,
      actorId: user.id,
      message: "提交转合同审批申请",
      payload: {
        approvalId: approval.id,
        approverId: approver.id
      }
    });

    return (await attachUserNames([approval]))[0];
  }

  async approve(id: string, data: ReviewOpportunityContractApprovalDto, user: SessionUser) {
    if (!canReviewApproval(user)) {
      throw forbidden("当前账号无权审批转合同申请");
    }

    const approval = await prisma.opportunityContractApproval.findFirst({
      where: { id }
    });

    if (!approval) {
      throw notFound("审批单不存在");
    }

    if (!isAdmin(user) && approval.approverId !== user.id) {
      throw forbidden("非审批人不可审批该申请");
    }

    if (approval.status !== "pending") {
      throw badRequest("该审批单已处理，请勿重复审批");
    }

    const updated = await prisma.opportunityContractApproval.update({
      where: { id },
      data: {
        status: "approved",
        approvalComment: data.approvalComment?.trim() || approval.approvalComment,
        approvedAt: new Date(),
        rejectedAt: null
      }
    });

    const opportunity = await prisma.opportunity.findFirst({
      where: {
        id: approval.opportunityId,
        isDeleted: false
      },
      select: {
        id: true,
        code: true,
        stage: true
      }
    });

    if (opportunity && opportunity.stage !== OpportunityStage.WON) {
      await prisma.opportunity.update({
        where: { id: opportunity.id },
        data: {
          stage: OpportunityStage.WON,
          updatedBy: user.id
        }
      });
    }

    if (opportunity) {
      await auditLogService.log({
        entityType: EntityType.OPPORTUNITY,
        entityId: opportunity.id,
        entityCode: opportunity.code,
        action: AuditAction.STATUS_CHANGE,
        actorId: user.id,
        message: "转合同审批通过",
        payload: {
          approvalId: updated.id
        }
      });
    }

    return updated;
  }

  async reject(id: string, data: ReviewOpportunityContractApprovalDto, user: SessionUser) {
    if (!canReviewApproval(user)) {
      throw forbidden("当前账号无权审批转合同申请");
    }

    const approval = await prisma.opportunityContractApproval.findFirst({
      where: { id }
    });

    if (!approval) {
      throw notFound("审批单不存在");
    }

    if (!isAdmin(user) && approval.approverId !== user.id) {
      throw forbidden("非审批人不可审批该申请");
    }

    if (approval.status !== "pending") {
      throw badRequest("该审批单已处理，请勿重复审批");
    }

    const updated = await prisma.opportunityContractApproval.update({
      where: { id },
      data: {
        status: "rejected",
        approvalComment: data.approvalComment?.trim() || approval.approvalComment,
        rejectedAt: new Date(),
        approvedAt: null
      }
    });

    const opportunity = await prisma.opportunity.findFirst({
      where: {
        id: approval.opportunityId,
        isDeleted: false
      },
      select: {
        id: true,
        code: true
      }
    });

    if (opportunity) {
      await auditLogService.log({
        entityType: EntityType.OPPORTUNITY,
        entityId: opportunity.id,
        entityCode: opportunity.code,
        action: AuditAction.STATUS_CHANGE,
        actorId: user.id,
        message: "转合同审批驳回",
        payload: {
          approvalId: updated.id
        }
      });
    }

    return updated;
  }

  async createContractDraft(id: string, user: SessionUser) {
    assertCanAccessRecord(user, "contract", "create");
    const approval = await prisma.opportunityContractApproval.findFirst({
      where: { id }
    });

    if (!approval) {
      throw notFound("审批单不存在");
    }

    if (approval.status !== "approved") {
      throw badRequest("审批通过后才能生成合同");
    }

    if (approval.createdContractId) {
      const existingContract = await prisma.contract.findFirst({
        where: {
          id: approval.createdContractId,
          isDeleted: false
        }
      });
      if (existingContract) {
        return existingContract;
      }
    }

    const opportunity = await prisma.opportunity.findFirst({
      where: {
        id: approval.opportunityId,
        isDeleted: false
      },
      include: {
        projects: {
          where: {
            isDeleted: false
          },
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!opportunity) {
      throw notFound("商机不存在");
    }

    const targetProject = opportunity.projects[0];
    if (!targetProject) {
      throw badRequest("当前商机尚未转为项目，请先创建项目后再生成合同");
    }

    const contractCode = await generateBusinessCode(EntityType.CONTRACT);
    const contract = await prisma.contract.create({
      data: {
        code: contractCode,
        customerId: opportunity.customerId,
        projectId: targetProject.id,
        name: `${opportunity.name} 合同`,
        contractAmount: toDecimal(opportunity.estimatedRevenue ?? opportunity.amount)!,
        status: "ACTIVE",
        description: "由转合同审批自动生成合同",
        createdBy: user.id,
        updatedBy: user.id
      }
    });

    await prisma.opportunityContractApproval.update({
      where: { id },
      data: {
        createdContractId: contract.id
      }
    });

    await auditLogService.log({
      entityType: EntityType.CONTRACT,
      entityId: contract.id,
      entityCode: contract.code,
      action: AuditAction.CREATE,
      actorId: user.id,
      message: "由转合同审批生成合同",
      payload: {
        approvalId: id,
        opportunityId: approval.opportunityId
      }
    });

    await auditLogService.log({
      entityType: EntityType.OPPORTUNITY,
      entityId: approval.opportunityId,
      entityCode: opportunity.code,
      action: AuditAction.CONVERT,
      actorId: user.id,
      message: "审批通过后生成合同",
      payload: {
        approvalId: id,
        contractId: contract.id,
        contractCode
      }
    });

    return contract;
  }
}

export const opportunityContractApprovalService = new OpportunityContractApprovalService();
