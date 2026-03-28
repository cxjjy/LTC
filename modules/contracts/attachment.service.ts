import { AuditAction, EntityType, type ContractAttachment, ContractStatus } from "@prisma/client";
import { promises as fs } from "fs";
import path from "path";

import type { SessionUser } from "@/lib/auth";
import { badRequest, notFound } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { assertCanAccessRecord, requireAnyRole } from "@/lib/rbac";
import { auditLogService } from "@/modules/core/audit-log.service";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const uploadRootDir = path.join(process.cwd(), "public", "uploads", "contracts");

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, "-");
}

function canManageAttachment(user: SessionUser) {
  requireAnyRole(user, ["SUPER_ADMIN", "ADMIN", "FINANCE"]);
}

function toAttachmentDto(attachment: ContractAttachment) {
  return {
    id: attachment.id,
    contractId: attachment.contractId,
    fileName: attachment.fileName,
    fileUrl: `/api/attachments/${attachment.id}/download`,
    fileSize: attachment.fileSize,
    fileType: attachment.fileType,
    createdAt: attachment.createdAt,
    uploadedBy: attachment.uploadedBy
  };
}

async function ensureContractExists(contractId: string, user: SessionUser) {
  assertCanAccessRecord(user, "contract", "view");
  const contract = await prisma.contract.findFirst({
    where: {
      id: contractId,
      isDeleted: false
    },
    select: {
      id: true,
      code: true,
      name: true,
      status: true
    }
  });

  if (!contract) {
    throw notFound("合同不存在");
  }

  return contract;
}

class ContractAttachmentService {
  async list(contractId: string, user: SessionUser) {
    await ensureContractExists(contractId, user);
    const attachments = await prisma.contractAttachment.findMany({
      where: { contractId },
      orderBy: { createdAt: "desc" }
    });
    return attachments.map(toAttachmentDto);
  }

  async upload(contractId: string, file: File | null, user: SessionUser) {
    canManageAttachment(user);
    const contract = await ensureContractExists(contractId, user);

    if (!file) {
      throw badRequest("请选择要上传的附件");
    }

    if (file.size <= 0) {
      throw badRequest("附件内容为空");
    }

    if (file.size > MAX_FILE_SIZE) {
      throw badRequest("附件大小不能超过 20MB");
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const safeName = sanitizeFileName(file.name || "contract-file");
    const relativeDir = path.join(contractId);
    const relativePath = path.join(relativeDir, `${Date.now()}-${safeName}`);
    const absoluteDir = path.join(uploadRootDir, relativeDir);
    const absolutePath = path.join(uploadRootDir, relativePath);

    await fs.mkdir(absoluteDir, { recursive: true });
    await fs.writeFile(absolutePath, buffer);

    const attachment = await prisma.contractAttachment.create({
      data: {
        contractId,
        fileName: file.name,
        fileUrl: `/uploads/contracts/${relativePath.replaceAll(path.sep, "/")}`,
        filePath: absolutePath,
        fileSize: file.size,
        fileType: file.type || "application/octet-stream",
        uploadedBy: user.name
      }
    });

    await auditLogService.log({
      entityType: EntityType.CONTRACT,
      entityId: contract.id,
      entityCode: contract.code,
      action: AuditAction.UPDATE,
      actorId: user.id,
      message: `上传合同附件：${attachment.fileName}`,
      payload: {
        attachmentId: attachment.id,
        fileName: attachment.fileName,
        fileSize: attachment.fileSize
      }
    });

    return toAttachmentDto(attachment);
  }

  async delete(attachmentId: string, user: SessionUser) {
    canManageAttachment(user);
    const attachment = await prisma.contractAttachment.findFirst({
      where: { id: attachmentId },
      include: {
        contract: {
          select: {
            id: true,
            code: true,
            status: true
          }
        }
      }
    });

    if (!attachment) {
      throw notFound("附件不存在");
    }

    if (attachment.contract.status === ContractStatus.EFFECTIVE) {
      const count = await prisma.contractAttachment.count({
        where: { contractId: attachment.contractId }
      });

      if (count <= 1) {
        throw badRequest("当前合同已生效，至少保留一个附件后才能继续管理");
      }
    }

    await prisma.contractAttachment.delete({
      where: { id: attachmentId }
    });

    try {
      await fs.unlink(attachment.filePath);
    } catch {
      // ignore missing file on disk
    }

    await auditLogService.log({
      entityType: EntityType.CONTRACT,
      entityId: attachment.contract.id,
      entityCode: attachment.contract.code,
      action: AuditAction.UPDATE,
      actorId: user.id,
      message: `删除合同附件：${attachment.fileName}`,
      payload: {
        attachmentId: attachment.id,
        fileName: attachment.fileName
      }
    });

    return { success: true };
  }

  async getDownloadPayload(attachmentId: string, user: SessionUser) {
    const attachment = await prisma.contractAttachment.findFirst({
      where: { id: attachmentId },
      include: {
        contract: {
          select: {
            id: true
          }
        }
      }
    });

    if (!attachment) {
      throw notFound("附件不存在");
    }

    await ensureContractExists(attachment.contract.id, user);

    const fileBuffer = await fs.readFile(attachment.filePath);
    return {
      buffer: fileBuffer,
      fileName: attachment.fileName,
      fileType: attachment.fileType || "application/octet-stream"
    };
  }

  async ensureCanBeEffective(contractId: string) {
    const attachmentCount = await prisma.contractAttachment.count({
      where: { contractId }
    });

    if (attachmentCount <= 0) {
      throw badRequest("合同未上传附件，不能变更为已生效");
    }
  }
}

export const contractAttachmentService = new ContractAttachmentService();
export type ContractAttachmentRecord = ReturnType<typeof toAttachmentDto>;
