import { AuditAction, EntityType, type BizAttachment } from "@prisma/client";
import { promises as fs } from "fs";
import path from "path";

import type { SessionUser } from "@/lib/auth";
import { bizAttachmentTypeLabels } from "@/lib/constants";
import { badRequest, notFound } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { assertCanAccessRecord, canAccessRecord } from "@/lib/rbac";
import { auditLogService } from "@/modules/core/audit-log.service";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const uploadRootDir = path.join(process.cwd(), "public", "uploads", "biz");

export type BizAttachmentType = keyof typeof bizAttachmentTypeLabels;

type UploadBizAttachmentInput = {
  bizType: BizAttachmentType;
  bizId: string;
  projectId?: string | null;
  contractId?: string | null;
  remark?: string;
  status?: string;
  file: File | null;
};

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, "-");
}

function isManager(user: SessionUser) {
  const roleCodes = new Set([user.role, ...user.roles.map((item) => item.code)]);
  return roleCodes.has("SUPER_ADMIN") || roleCodes.has("ADMIN");
}

function canManageContractFiles(user: SessionUser) {
  return isManager(user) || user.role === "FINANCE" || user.roles.some((item) => item.code === "FINANCE") || canAccessRecord(user, "contract", "update");
}

function canManageProjectFiles(user: SessionUser) {
  return isManager(user) || canAccessRecord(user, "project", "update") || canAccessRecord(user, "delivery", "update");
}

function assertCanManageAttachment(user: SessionUser, bizType: BizAttachmentType) {
  const allowed =
    bizType === "contract" || bizType === "invoice"
      ? canManageContractFiles(user)
      : canManageProjectFiles(user);

  if (!allowed) {
    throw badRequest("当前账号无权管理该类资料");
  }
}

function toAttachmentDto(attachment: BizAttachment) {
  return {
    id: attachment.id,
    bizType: attachment.bizType,
    bizId: attachment.bizId,
    projectId: attachment.projectId,
    contractId: attachment.contractId,
    fileName: attachment.fileName,
    fileUrl: `/api/biz-attachments/${attachment.id}/download`,
    fileSize: attachment.fileSize,
    mimeType: attachment.mimeType,
    uploadedBy: attachment.uploadedBy,
    uploadedAt: attachment.uploadedAt,
    remark: attachment.remark,
    status: attachment.status
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
      projectId: true
    }
  });

  if (!contract) {
    throw notFound("合同不存在");
  }

  return contract;
}

async function ensureProjectExists(projectId: string, user: SessionUser) {
  assertCanAccessRecord(user, "project", "view");
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      isDeleted: false
    },
    select: {
      id: true,
      code: true,
      name: true
    }
  });

  if (!project) {
    throw notFound("项目不存在");
  }

  return project;
}

async function assertCanViewAttachment(user: SessionUser, attachment: {
  contractId: string | null;
  projectId: string | null;
}) {
  if (attachment.contractId) {
    await ensureContractExists(attachment.contractId, user);
    return;
  }

  if (attachment.projectId) {
    await ensureProjectExists(attachment.projectId, user);
    return;
  }

  throw notFound("资料不存在");
}

class BizAttachmentService {
  async listByContract(contractId: string, bizType: BizAttachmentType | undefined, user: SessionUser) {
    await ensureContractExists(contractId, user);
    const items = await prisma.bizAttachment.findMany({
      where: {
        contractId,
        ...(bizType ? { bizType } : {})
      },
      orderBy: { uploadedAt: "desc" }
    });

    return items.map(toAttachmentDto);
  }

  async listByProject(projectId: string, bizTypes: BizAttachmentType[] | undefined, user: SessionUser) {
    await ensureProjectExists(projectId, user);
    const items = await prisma.bizAttachment.findMany({
      where: {
        projectId,
        ...(bizTypes?.length ? { bizType: { in: bizTypes } } : {})
      },
      orderBy: { uploadedAt: "desc" }
    });

    return items.map(toAttachmentDto);
  }

  async upload(input: UploadBizAttachmentInput, user: SessionUser) {
    assertCanManageAttachment(user, input.bizType);

    if (!input.file) {
      throw badRequest("请选择要上传的文件");
    }

    if (!bizAttachmentTypeLabels[input.bizType]) {
      throw badRequest("不支持的资料类型");
    }

    if (input.file.size <= 0) {
      throw badRequest("文件内容为空");
    }

    if (input.file.size > MAX_FILE_SIZE) {
      throw badRequest("文件大小不能超过 20MB");
    }

    let contractCode: string | undefined;
    let projectCode: string | undefined;

    if (input.contractId) {
      const contract = await ensureContractExists(input.contractId, user);
      contractCode = contract.code;
      if (!input.projectId) {
        input.projectId = contract.projectId;
      }
    }

    if (input.projectId) {
      const project = await ensureProjectExists(input.projectId, user);
      projectCode = project.code;
    }

    if ((input.bizType === "contract" || input.bizType === "invoice") && !input.contractId) {
      throw badRequest("合同资料必须绑定合同");
    }

    if ((input.bizType === "acceptance" || input.bizType === "settlement") && !input.projectId) {
      throw badRequest("项目资料必须绑定项目");
    }

    const arrayBuffer = await input.file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const safeName = sanitizeFileName(input.file.name || "file");
    const scopeId = input.contractId ?? input.projectId ?? input.bizId;
    const relativePath = path.join(input.bizType, scopeId, `${Date.now()}-${safeName}`);
    const absolutePath = path.join(uploadRootDir, relativePath);

    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, buffer);

    const attachment = await prisma.bizAttachment.create({
      data: {
        bizType: input.bizType,
        bizId: input.bizId,
        projectId: input.projectId ?? null,
        contractId: input.contractId ?? null,
        fileName: input.file.name,
        fileUrl: `/uploads/biz/${relativePath.replaceAll(path.sep, "/")}`,
        filePath: absolutePath,
        fileSize: input.file.size,
        mimeType: input.file.type || "application/octet-stream",
        uploadedBy: user.name,
        remark: input.remark?.trim() || null,
        status: input.status?.trim() || "active"
      }
    });

    if (input.bizType === "invoice") {
      await prisma.invoiceRecord.update({
        where: { id: input.bizId },
        data: {
          attachmentId: attachment.id
        }
      });
    }

    if (input.contractId) {
      await auditLogService.log({
        entityType: EntityType.CONTRACT,
        entityId: input.contractId,
        entityCode: contractCode,
        action: AuditAction.UPDATE,
        actorId: user.id,
        message: `上传${bizAttachmentTypeLabels[input.bizType]}：${attachment.fileName}`,
        payload: {
          attachmentId: attachment.id,
          bizType: input.bizType
        }
      });
    } else if (input.projectId) {
      await auditLogService.log({
        entityType: EntityType.PROJECT,
        entityId: input.projectId,
        entityCode: projectCode,
        action: AuditAction.UPDATE,
        actorId: user.id,
        message: `上传${bizAttachmentTypeLabels[input.bizType]}：${attachment.fileName}`,
        payload: {
          attachmentId: attachment.id,
          bizType: input.bizType
        }
      });
    }

    return toAttachmentDto(attachment);
  }

  async updateMeta(id: string, data: { remark?: string; status?: string }, user: SessionUser) {
    const existing = await prisma.bizAttachment.findFirst({
      where: { id }
    });

    if (!existing) {
      throw notFound("资料不存在");
    }

    await assertCanViewAttachment(user, existing);
    assertCanManageAttachment(user, existing.bizType as BizAttachmentType);

    const updated = await prisma.bizAttachment.update({
      where: { id },
      data: {
        remark: data.remark?.trim() || null,
        status: data.status?.trim() || existing.status
      }
    });

    return toAttachmentDto(updated);
  }

  async delete(id: string, user: SessionUser) {
    const existing = await prisma.bizAttachment.findFirst({
      where: { id }
    });

    if (!existing) {
      throw notFound("资料不存在");
    }

    await assertCanViewAttachment(user, existing);
    assertCanManageAttachment(user, existing.bizType as BizAttachmentType);

    await prisma.bizAttachment.delete({
      where: { id }
    });

    if (existing.bizType === "invoice") {
      await prisma.invoiceRecord.updateMany({
        where: { attachmentId: id },
        data: {
          attachmentId: null
        }
      });
    }

    try {
      await fs.unlink(existing.filePath);
    } catch {
      // ignore missing file on disk
    }

    if (existing.contractId) {
      const contract = await prisma.contract.findFirst({
        where: { id: existing.contractId, isDeleted: false },
        select: { code: true }
      });
      await auditLogService.log({
        entityType: EntityType.CONTRACT,
        entityId: existing.contractId,
        entityCode: contract?.code,
        action: AuditAction.UPDATE,
        actorId: user.id,
        message: `删除${bizAttachmentTypeLabels[existing.bizType as BizAttachmentType]}：${existing.fileName}`
      });
    } else if (existing.projectId) {
      const project = await prisma.project.findFirst({
        where: { id: existing.projectId, isDeleted: false },
        select: { code: true }
      });
      await auditLogService.log({
        entityType: EntityType.PROJECT,
        entityId: existing.projectId,
        entityCode: project?.code,
        action: AuditAction.UPDATE,
        actorId: user.id,
        message: `删除${bizAttachmentTypeLabels[existing.bizType as BizAttachmentType]}：${existing.fileName}`
      });
    }

    return { success: true };
  }

  async getDownloadPayload(id: string, user: SessionUser) {
    const attachment = await prisma.bizAttachment.findFirst({
      where: { id }
    });

    if (!attachment) {
      throw notFound("资料不存在");
    }

    await assertCanViewAttachment(user, attachment);
    const buffer = await fs.readFile(attachment.filePath);

    return {
      buffer,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType || "application/octet-stream"
    };
  }
}

export const bizAttachmentService = new BizAttachmentService();
