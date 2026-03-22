import type { AuditAction, EntityType, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type AuditInput = {
  entityType: EntityType;
  entityId: string;
  entityCode?: string;
  action: AuditAction;
  actorId: string;
  message: string;
  payload?: Prisma.InputJsonValue;
  tx?: Prisma.TransactionClient;
};

export const auditLogService = {
  async log(input: AuditInput) {
    const client = input.tx ?? prisma;
    return client.auditLog.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId,
        entityCode: input.entityCode,
        action: input.action,
        actorId: input.actorId,
        message: input.message,
        payload: input.payload
      }
    });
  }
};
