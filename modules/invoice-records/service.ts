import { AuditAction, EntityType, type BizAttachment } from "@prisma/client";

import type { SessionUser } from "@/lib/auth";
import { badRequest, notFound } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { assertCanAccessRecord, canAccessRecord } from "@/lib/rbac";
import { bizAttachmentService } from "@/modules/biz-attachments/service";
import { auditLogService } from "@/modules/core/audit-log.service";
import { toDecimal } from "@/modules/core/decimal";
import type { CreateInvoiceRecordDto, UpdateInvoiceRecordDto } from "@/modules/invoice-records/dto";

function canManageInvoiceRecords(user: SessionUser) {
  return canAccessRecord(user, "contract", "update") || user.role === "FINANCE" || user.roles.some((item) => item.code === "FINANCE" || item.code === "SUPER_ADMIN");
}

async function ensureContract(contractId: string, user: SessionUser) {
  assertCanAccessRecord(user, "contract", "view");
  const contract = await (prisma.contract as any).findFirst({
    where: {
      id: contractId,
      isDeleted: false
    },
    select: {
      id: true,
      code: true,
      projectId: true,
      name: true
    }
  });

  if (!contract) {
    throw notFound("合同不存在");
  }

  return contract as { id: string; code: string; projectId: string; name: string; direction?: string };
}

class InvoiceRecordService {
  async listByContract(contractId: string, user: SessionUser) {
    await ensureContract(contractId, user);
    const items = await prisma.invoiceRecord.findMany({
      where: { contractId },
      orderBy: [{ invoiceDate: "desc" }, { createdAt: "desc" }]
    });

    const attachmentIds = items.map((item) => item.attachmentId).filter(Boolean) as string[];
    const attachments = attachmentIds.length
      ? await prisma.bizAttachment.findMany({
          where: {
            id: {
              in: attachmentIds
            }
          }
        })
      : [];
    const attachmentMap = new Map(attachments.map((item: BizAttachment) => [item.id, item]));

    return items.map((item) => ({
      id: item.id,
      contractId: item.contractId,
      projectId: item.projectId,
      invoiceNo: item.invoiceNo,
      invoiceType: item.invoiceType,
      invoiceAmount: item.invoiceAmount,
      invoiceDate: item.invoiceDate,
      payerName: item.payerName,
      status: item.status,
      createdBy: item.createdBy,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      remark: null,
      attachment: item.attachmentId
        ? (() => {
            const attachment = attachmentMap.get(item.attachmentId!);
            return attachment
              ? {
                  id: attachment.id,
                  fileName: attachment.fileName,
                  fileUrl: `/api/biz-attachments/${attachment.id}/download`,
                  remark: attachment.remark,
                  status: attachment.status,
                  uploadedAt: attachment.uploadedAt,
                  uploadedBy: attachment.uploadedBy
                }
              : null;
          })()
        : null
    }));
  }

  async create(contractId: string, data: CreateInvoiceRecordDto, user: SessionUser) {
    if (!canManageInvoiceRecords(user)) {
      throw badRequest("当前账号无权维护开票记录");
    }

    const contract = await ensureContract(contractId, user);

    const record = await prisma.invoiceRecord.create({
      data: {
        contractId,
        projectId: contract.projectId,
        direction:
          data.direction ?? ((contract as any).direction === "PURCHASE" ? "INPUT" : "OUTPUT"),
        invoiceNo: data.invoiceNo.trim(),
        invoiceType: data.invoiceType.trim(),
        invoiceAmount: toDecimal(data.invoiceAmount)!,
        invoiceDate: data.invoiceDate!,
        payerName: data.payerName?.trim() || null,
        status: data.status?.trim() || "issued",
        createdBy: user.id
      } as any
    });

    await auditLogService.log({
      entityType: EntityType.CONTRACT,
      entityId: contract.id,
      entityCode: contract.code,
      action: AuditAction.UPDATE,
      actorId: user.id,
      message: `新增发票记录：${record.invoiceNo}`,
      payload: {
        invoiceRecordId: record.id
      }
    });

    return record;
  }

  async update(id: string, data: UpdateInvoiceRecordDto, user: SessionUser) {
    if (!canManageInvoiceRecords(user)) {
      throw badRequest("当前账号无权维护开票记录");
    }

    const existing = await prisma.invoiceRecord.findFirst({
      where: { id }
    });

    if (!existing) {
      throw notFound("开票记录不存在");
    }

    const contract = await ensureContract(existing.contractId, user);
    const updated = await prisma.invoiceRecord.update({
      where: { id },
      data: {
        invoiceNo: data.invoiceNo.trim(),
        invoiceType: data.invoiceType.trim(),
        direction:
          data.direction ?? ((contract as any).direction === "PURCHASE" ? "INPUT" : "OUTPUT"),
        invoiceAmount: toDecimal(data.invoiceAmount!)!,
        invoiceDate: data.invoiceDate!,
        payerName: data.payerName?.trim() || null,
        status: data.status?.trim() || existing.status
      } as any
    });

    await auditLogService.log({
      entityType: EntityType.CONTRACT,
      entityId: contract.id,
      entityCode: contract.code,
      action: AuditAction.UPDATE,
      actorId: user.id,
      message: `更新发票记录：${updated.invoiceNo}`,
      payload: {
        invoiceRecordId: updated.id
      }
    });

    return updated;
  }

  async delete(id: string, user: SessionUser) {
    if (!canManageInvoiceRecords(user)) {
      throw badRequest("当前账号无权维护开票记录");
    }

    const existing = await prisma.invoiceRecord.findFirst({
      where: { id }
    });

    if (!existing) {
      throw notFound("开票记录不存在");
    }

    const contract = await ensureContract(existing.contractId, user);

    if (existing.attachmentId) {
      await bizAttachmentService.delete(existing.attachmentId, user);
    }

    await prisma.invoiceRecord.delete({
      where: { id }
    });

    await auditLogService.log({
      entityType: EntityType.CONTRACT,
      entityId: contract.id,
      entityCode: contract.code,
      action: AuditAction.UPDATE,
      actorId: user.id,
      message: `删除发票记录：${existing.invoiceNo}`,
      payload: {
        invoiceRecordId: existing.id
      }
    });

    return { success: true };
  }

  async uploadAttachment(id: string, file: File | null, remark: string | undefined, user: SessionUser) {
    if (!canManageInvoiceRecords(user)) {
      throw badRequest("当前账号无权上传发票附件");
    }

    const record = await prisma.invoiceRecord.findFirst({
      where: { id }
    });

    if (!record) {
      throw notFound("开票记录不存在");
    }

    if (record.attachmentId) {
      await bizAttachmentService.delete(record.attachmentId, user);
    }

    return bizAttachmentService.upload(
      {
        bizType: "invoice",
        bizId: record.id,
        contractId: record.contractId,
        projectId: record.projectId,
        file,
        remark
      },
      user
    );
  }
}

export const invoiceRecordService = new InvoiceRecordService();
