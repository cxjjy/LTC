import { AuditAction, EntityType } from "@prisma/client";

import type { SessionUser } from "@/lib/auth";
import { badRequest, notFound } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { assertCanAccessRecord, canAccessRecord } from "@/lib/rbac";
import { auditLogService } from "@/modules/core/audit-log.service";
import { toDecimal } from "@/modules/core/decimal";
import type { CreatePaymentRecordDto, UpdatePaymentRecordDto } from "@/modules/payment-records/dto";

function canManagePaymentRecords(user: SessionUser) {
  return canAccessRecord(user, "receivable", "update") || canAccessRecord(user, "contract", "update") || user.role === "FINANCE" || user.roles.some((item) => item.code === "FINANCE" || item.code === "SUPER_ADMIN");
}

async function ensureContract(contractId: string, user: SessionUser) {
  assertCanAccessRecord(user, "contract", "view");
  const contract = await prisma.contract.findFirst({
    where: {
      id: contractId,
      isDeleted: false
    },
    select: {
      id: true,
      code: true,
      projectId: true
    }
  });

  if (!contract) {
    throw notFound("合同不存在");
  }

  return contract;
}

class PaymentRecordService {
  async listByContract(contractId: string, user: SessionUser) {
    await ensureContract(contractId, user);
    return prisma.paymentRecord.findMany({
      where: { contractId },
      orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }]
    });
  }

  async create(contractId: string, data: CreatePaymentRecordDto, user: SessionUser) {
    if (!canManagePaymentRecords(user)) {
      throw badRequest("当前账号无权维护回款记录");
    }

    const contract = await ensureContract(contractId, user);
    const record = await prisma.paymentRecord.create({
      data: {
        contractId,
        projectId: contract.projectId,
        paymentAmount: toDecimal(data.paymentAmount)!,
        paymentDate: data.paymentDate!,
        paymentMethod: data.paymentMethod?.trim() || null,
        payerName: data.payerName?.trim() || null,
        sourceType: "manual",
        remark: data.remark?.trim() || null,
        createdBy: user.id
      }
    });

    await auditLogService.log({
      entityType: EntityType.CONTRACT,
      entityId: contract.id,
      entityCode: contract.code,
      action: AuditAction.UPDATE,
      actorId: user.id,
      message: "新增回款记录",
      payload: {
        paymentRecordId: record.id
      }
    });

    return record;
  }

  async update(id: string, data: UpdatePaymentRecordDto, user: SessionUser) {
    if (!canManagePaymentRecords(user)) {
      throw badRequest("当前账号无权维护回款记录");
    }

    const existing = await prisma.paymentRecord.findFirst({
      where: { id }
    });

    if (!existing) {
      throw notFound("回款记录不存在");
    }

    if (existing.sourceType !== "manual") {
      throw badRequest("财务同步记录暂不支持手动编辑");
    }

    const contract = await ensureContract(existing.contractId, user);
    const updated = await prisma.paymentRecord.update({
      where: { id },
      data: {
        paymentAmount: toDecimal(data.paymentAmount!)!,
        paymentDate: data.paymentDate!,
        paymentMethod: data.paymentMethod?.trim() || null,
        payerName: data.payerName?.trim() || null,
        remark: data.remark?.trim() || null
      }
    });

    await auditLogService.log({
      entityType: EntityType.CONTRACT,
      entityId: contract.id,
      entityCode: contract.code,
      action: AuditAction.UPDATE,
      actorId: user.id,
      message: "更新回款记录",
      payload: {
        paymentRecordId: updated.id
      }
    });

    return updated;
  }

  async delete(id: string, user: SessionUser) {
    if (!canManagePaymentRecords(user)) {
      throw badRequest("当前账号无权维护回款记录");
    }

    const existing = await prisma.paymentRecord.findFirst({
      where: { id }
    });

    if (!existing) {
      throw notFound("回款记录不存在");
    }

    if (existing.sourceType !== "manual") {
      throw badRequest("财务同步记录暂不支持删除");
    }

    const contract = await ensureContract(existing.contractId, user);
    await prisma.paymentRecord.delete({
      where: { id }
    });

    await auditLogService.log({
      entityType: EntityType.CONTRACT,
      entityId: contract.id,
      entityCode: contract.code,
      action: AuditAction.UPDATE,
      actorId: user.id,
      message: "删除回款记录",
      payload: {
        paymentRecordId: existing.id
      }
    });

    return { success: true };
  }
}

export const paymentRecordService = new PaymentRecordService();
